/* =========================================================
   RECOVER ORPHANED BIDS

   A Bid belongs to an auction through:

       groupId + auctionDate + auctionTime

   Before the fix in updateNotification, editing an auction
   (for example extending the date or time) moved the
   notification but left the bids on the OLD date/time, so
   they stopped belonging to any auction and disappeared from
   the screens. The bids were never deleted.

   This script finds those bids and re-attaches them to the
   auction they belong to.

   SAFE BY DEFAULT - it only PRINTS what it would do:

       node scripts/recover-orphan-bids.mjs

   To actually apply the changes:

       node scripts/recover-orphan-bids.mjs --apply

   Nothing is ever deleted. Only auctionDate/auctionTime on
   already-orphaned bids is corrected, and only when exactly
   one auction is an unambiguous match.
========================================================= */

import mongoose from "mongoose";
import dotenv from "dotenv";

import Bid from "../models/Bid.js";
import Group from "../models/Group.js";
import Notification from "../models/Notification.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");

const line = (c = "=") => console.log(c.repeat(60));

await mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 20000,
});

console.log("");
line();
console.log(APPLY ? "RECOVER ORPHANED BIDS  (APPLYING)" : "RECOVER ORPHANED BIDS  (DRY RUN - nothing is written)");
line();

/* ---------- groups: mongo _id  ->  public groupId ---------- */
const groups = await Group.find({}, { groupId: 1 }).lean();
const groupCodeById = new Map(
  groups.map((g) => [String(g._id), String(g.groupId)])
);

/* ---------- every auction that currently exists ---------- */
const notifications = await Notification.find({}).lean();

const auctionsByGroupCode = new Map();

for (const n of notifications) {
  const code = groupCodeById.get(String(n.groupId));
  if (!code) continue;

  const list = auctionsByGroupCode.get(code) || [];
  list.push({
    _id: String(n._id),
    date: String(n.auctionEndDate || "").trim(),
    time: String(n.auctionEndTime || "").trim(),
  });
  auctionsByGroupCode.set(code, list);
}

const validIdentity = new Set();
for (const [code, list] of auctionsByGroupCode) {
  for (const a of list) validIdentity.add(`${code}|${a.date}|${a.time}`);
}

/* ---------- group the bids by their stored identity ---------- */
const buckets = await Bid.aggregate([
  {
    $group: {
      _id: {
        groupId: "$groupId",
        auctionDate: "$auctionDate",
        auctionTime: "$auctionTime",
      },
      count: { $sum: 1 },
      total: { $sum: "$bidAmount" },
      firstBid: { $min: "$bidTime" },
      lastBid: { $max: "$bidTime" },
    },
  },
  { $sort: { lastBid: -1 } },
]);

console.log("\nALL BID GROUPS IN THE DATABASE\n");

let orphanBuckets = [];

for (const b of buckets) {
  const code = String(b._id.groupId || "");
  const date = String(b._id.auctionDate || "").trim();
  const time = String(b._id.auctionTime || "").trim();
  const key = `${code}|${date}|${time}`;
  const ok = validIdentity.has(key);

  console.log(
    `  ${ok ? "OK     " : "ORPHAN "} ${code}  ${date}  ${time}   ` +
      `${String(b.count).padStart(3)} bid(s)   last: ${
        b.lastBid ? new Date(b.lastBid).toLocaleString() : "-"
      }`
  );

  if (!ok) orphanBuckets.push({ code, date, time, count: b.count });
}

if (orphanBuckets.length === 0) {
  console.log("\n✅ No orphaned bids. Every bid belongs to an existing auction.\n");
  await mongoose.disconnect();
  process.exit(0);
}

/* ---------- work out where each orphan belongs ---------- */
console.log("");
line("-");
console.log("ORPHANED BIDS AND THEIR PROPOSED AUCTION");
line("-");

let applied = 0;

for (const o of orphanBuckets) {
  const auctions = auctionsByGroupCode.get(o.code) || [];

  /* 1) same date, different time  -> the admin changed the time */
  let candidates = auctions.filter((a) => a.date === o.date);

  /* 2) otherwise, if the group has exactly one auction, it is that one */
  if (candidates.length === 0 && auctions.length === 1) {
    candidates = auctions;
  }

  console.log(
    `\n  ${o.code}  ${o.date} ${o.time}  (${o.count} bid(s))`
  );

  if (candidates.length !== 1) {
    console.log(
      candidates.length === 0
        ? "     ⚠️  No matching auction found - left untouched. Fix manually."
        : `     ⚠️  ${candidates.length} auctions match - ambiguous, left untouched.`
    );
    continue;
  }

  const target = candidates[0];

  console.log(
    `     -> auction ${target.date} ${target.time}` +
      (APPLY ? "   [APPLYING]" : "   [dry run]")
  );

  if (APPLY) {
    const res = await Bid.updateMany(
      { groupId: o.code, auctionDate: o.date, auctionTime: o.time },
      { $set: { auctionDate: target.date, auctionTime: target.time } }
    );
    applied += res.modifiedCount ?? 0;
    console.log(`     ✅ moved ${res.modifiedCount} bid(s)`);
  }
}

console.log("");
line();
if (APPLY) {
  console.log(`DONE - ${applied} bid(s) re-attached to their auction.`);
} else {
  console.log("DRY RUN ONLY - nothing was written.");
  console.log("Run again with --apply once the plan above looks right.");
}
line();
console.log("");

await mongoose.disconnect();
