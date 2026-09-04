/* =========================================================
   INSPECT / REASSIGN BIDS BY AUCTION   (manual, no guessing)

   A bid belongs to an auction through:
       groupId + auctionDate + auctionTime

   USE 1 - just look (never writes anything):

     node scripts/fix-bid-auction.mjs --group 02B30

   USE 2 - move specific bids back to the auction they
           really belong to (dry run first):

     node scripts/fix-bid-auction.mjs --group 02B30 \
       --ids 66f0a1...,66f0a2... --to "04-09-2026 12:36"

     ...then add --apply to actually write.

   USE 3 - move a whole auction bucket:

     node scripts/fix-bid-auction.mjs --group 02B30 \
       --from "05-09-2026 18:00" --to "04-09-2026 12:36" --apply

   Nothing is ever deleted. Only auctionDate/auctionTime is
   changed, and only for the bids YOU name.
========================================================= */

import mongoose from "mongoose";
import dotenv from "dotenv";

import Bid from "../models/Bid.js";
import Group from "../models/Group.js";
import Notification from "../models/Notification.js";

dotenv.config();

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : null;
};

const GROUP = arg("--group");
const IDS = (arg("--ids") || "").split(",").map((x) => x.trim()).filter(Boolean);
const FROM = arg("--from");
const TO = arg("--to");
const APPLY = process.argv.includes("--apply");

if (!GROUP) {
  console.log("\n  Missing --group. Example:\n");
  console.log("    node scripts/fix-bid-auction.mjs --group 02B30\n");
  process.exit(1);
}

const splitIdentity = (v) => {
  const parts = String(v || "").trim().split(/\s+/);
  return { date: parts[0] || "", time: parts[1] || "" };
};

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });

const line = (c = "=") => console.log(c.repeat(78));

/* ---------------- the group's auctions ---------------- */
const group = await Group.findOne({ groupId: GROUP }, { groupId: 1 }).lean();

if (!group) {
  console.log(`\n  Group ${GROUP} not found.\n`);
  await mongoose.disconnect();
  process.exit(1);
}

const auctions = await Notification.find(
  { groupId: group._id },
  { auctionEndDate: 1, auctionEndTime: 1, winnerName: 1, createdAt: 1 }
).sort({ createdAt: 1 }).lean();

console.log("");
line();
console.log(`AUCTIONS OF GROUP ${GROUP}`);
line();
auctions.forEach((a, i) => {
  console.log(
    `  ${i + 1}. ${String(a.auctionEndDate).padEnd(12)} ${String(a.auctionEndTime).padEnd(7)}` +
      `  created ${new Date(a.createdAt).toLocaleString()}` +
      (a.winnerName ? `   winner: ${a.winnerName}` : "")
  );
});
if (auctions.length === 0) console.log("  (none)");

/* ---------------- every bid of the group ---------------- */
const bids = await Bid.find({ groupId: GROUP }).sort({ bidTime: 1 }).lean();

console.log("");
line();
console.log(`BIDS OF GROUP ${GROUP}   (${bids.length} total)`);
line();
console.log(
  "  " +
    "_id".padEnd(26) +
    "AMOUNT".padEnd(10) +
    "MEMBER".padEnd(10) +
    "GM".padEnd(6) +
    "AUCTION".padEnd(20) +
    "PLACED AT"
);
line("-");

for (const b of bids) {
  const known = auctions.some(
    (a) =>
      String(a.auctionEndDate).trim() === String(b.auctionDate).trim() &&
      String(a.auctionEndTime).trim() === String(b.auctionTime).trim()
  );

  const created = new Date(b.createdAt || b.bidTime).getTime();
  const updated = new Date(b.updatedAt || b.bidTime).getTime();
  const relabelled = updated - created > 5000;

  console.log(
    "  " +
      String(b._id).padEnd(26) +
      String(b.bidAmount).padEnd(10) +
      String(b.memberId).padEnd(10) +
      String(b.groupMemberId || "-").padEnd(6) +
      `${b.auctionDate} ${b.auctionTime}`.padEnd(20) +
      new Date(b.bidTime).toLocaleString() +
      (known ? "" : "   [no such auction]") +
      (relabelled ? "   [auction label was changed later]" : "")
  );
}

console.log("");
console.log("  PLACED AT is the real moment the member bid - use it to decide");
console.log("  which auction a bid belongs to. Rows marked [auction label was");
console.log("  changed later] had their auction date/time rewritten after the bid.");

/* ---------------- optional reassignment ---------------- */
if (!TO) {
  console.log("\n  Read-only. Nothing was written.");
  console.log("  To move bids, add:  --ids <id,id> --to \"DD-MM-YYYY HH:MM\"");
  console.log("  or:                 --from \"DD-MM-YYYY HH:MM\" --to \"DD-MM-YYYY HH:MM\"\n");
  await mongoose.disconnect();
  process.exit(0);
}

const target = splitIdentity(TO);

if (!target.date || !target.time) {
  console.log('\n  --to must look like: --to "04-09-2026 12:36"\n');
  await mongoose.disconnect();
  process.exit(1);
}

let filter = null;

if (IDS.length > 0) {
  filter = {
    groupId: GROUP,
    _id: { $in: IDS.map((x) => new mongoose.Types.ObjectId(x)) },
  };
} else if (FROM) {
  const src = splitIdentity(FROM);
  filter = { groupId: GROUP, auctionDate: src.date, auctionTime: src.time };
} else {
  console.log("\n  Provide either --ids or --from together with --to.\n");
  await mongoose.disconnect();
  process.exit(1);
}

const affected = await Bid.find(filter).lean();

console.log("");
line();
console.log(
  `${APPLY ? "MOVING" : "WOULD MOVE"} ${affected.length} bid(s) -> ${target.date} ${target.time}`
);
line();
affected.forEach((b) =>
  console.log(
    `  ${b._id}  ₹${b.bidAmount}  member ${b.memberId}  placed ${new Date(b.bidTime).toLocaleString()}`
  )
);

if (APPLY) {
  const res = await Bid.updateMany(filter, {
    $set: { auctionDate: target.date, auctionTime: target.time },
  });
  console.log(`\n  ✅ ${res.modifiedCount} bid(s) updated.\n`);
} else {
  console.log("\n  DRY RUN - nothing written. Add --apply to do it for real.\n");
}

await mongoose.disconnect();
