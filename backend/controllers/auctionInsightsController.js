import Bid from "../models/Bid.js";
import ChitScheme from "../models/ChitScheme.js";
import Group from "../models/Group.js";
import Notification from "../models/Notification.js";

/* =========================================================
   AUCTION INSIGHTS (admin, read only)

   GET /api/more/auction-insights

   For every group: how its finished auctions went.
     discount % of an auction = winning bid / chit value x 100
     dividend given           = (dividend of each month) x (members in the group)
     never bid                = members of the group who never placed a bid
   Nothing is written. Finished auction = a Notification with a winner entered.
========================================================= */

const num = (v) => Number(v) || 0;

// "DD-MM-YYYY" -> sortable number
const dateKey = (s, fallback) => {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(String(s || "").trim());
  if (m) return Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]);
  return fallback ? new Date(fallback).getTime() / 1e8 : 0;
};

export const getAuctionInsights = async (req, res) => {
  try {
    const [groups, schemes, notes, bidPairs] = await Promise.all([
      Group.find(
        {},
        {
          groupId: 1,
          chitId: 1,
          "members.memberId": 1,
          "collectionPlans.monthIndex": 1,
          "collectionPlans.dividend": 1,
        }
      ).lean(),
      ChitScheme.find({}).select("chitId chitAmount").lean(),
      Notification.find({ winnerName: { $ne: "" }, winnerBidAmount: { $gt: 0 } })
        .select("groupId auctionEndDate winnerName winnerBidAmount createdAt")
        .lean(),
      // who has placed at least one bid, per group
      Bid.aggregate([{ $group: { _id: { g: "$groupId", m: "$memberId" } } }]),
    ]);

    const amountOf = {};
    schemes.forEach((s) => {
      amountOf[s.chitId] = num(s.chitAmount);
    });

    // bids may be stored with the group code or with the group's database id
    const biddersOf = new Map(); // group code -> Set(memberId)
    const codeOf = new Map(); // any id -> group code
    groups.forEach((g) => {
      codeOf.set(String(g.groupId), String(g.groupId));
      codeOf.set(String(g._id), String(g.groupId));
    });
    bidPairs.forEach((b) => {
      const code = codeOf.get(String(b._id?.g));
      if (!code) return;
      if (!biddersOf.has(code)) biddersOf.set(code, new Set());
      biddersOf.get(code).add(String(b._id?.m));
    });

    const notesByGroup = new Map(); // group code -> [auction]
    notes.forEach((n) => {
      const code = codeOf.get(String(n.groupId));
      if (!code) return;
      if (!notesByGroup.has(code)) notesByGroup.set(code, []);
      notesByGroup.get(code).push(n);
    });

    let totalAuctions = 0;
    let pctSum = 0;
    let dividendAll = 0;
    let neverAll = 0;

    const items = groups.map((g) => {
      const code = String(g.groupId);
      const chit = amountOf[g.chitId] || 0;
      const members = new Set((g.members || []).map((m) => String(m.memberId)));

      const auctions = (notesByGroup.get(code) || [])
        .map((n) => ({
          key: dateKey(n.auctionEndDate, n.createdAt),
          date: n.auctionEndDate,
          bid: num(n.winnerBidAmount),
          winner: n.winnerName || "",
          pct: chit > 0 ? (num(n.winnerBidAmount) / chit) * 100 : 0,
        }))
        .sort((a, b) => a.key - b.key);

      const avgPct = auctions.length ? auctions.reduce((s, a) => s + a.pct, 0) / auctions.length : 0;
      const last = auctions.slice(-6).map((a, i, arr) => ({
        n: auctions.length - arr.length + i + 1,
        date: a.date,
        pct: Math.round(a.pct * 10) / 10,
        bid: a.bid,
        winner: a.winner,
      }));
      let highest = null;
      let highestIdx = 0;
      auctions.forEach((a, i) => {
        if (!highest || a.pct > highest.pct) {
          highest = a;
          highestIdx = i + 1;
        }
      });

      const perMember = (g.collectionPlans || []).reduce((s, p) => s + num(p.dividend), 0);
      const dividendGiven = perMember * members.size;

      const bidders = biddersOf.get(code) || new Set();
      let neverBid = 0;
      members.forEach((id) => {
        if (!bidders.has(id)) neverBid += 1;
      });

      totalAuctions += auctions.length;
      pctSum += auctions.reduce((s, a) => s + a.pct, 0);
      dividendAll += dividendGiven;
      neverAll += neverBid;

      return {
        groupId: code,
        chitId: String(g.chitId || ""),
        chitAmount: chit,
        members: members.size,
        auctions: auctions.length,
        avgPct: Math.round(avgPct * 10) / 10,
        highestPct: highest ? Math.round(highest.pct * 10) / 10 : 0,
        highestAuction: highest ? highestIdx : 0,
        trend: last,
        dividendGiven,
        neverBid,
      };
    });

    items.sort((a, b) => b.avgPct - a.avgPct);

    res.json({
      success: true,
      overall: {
        auctions: totalAuctions,
        avgPct: totalAuctions ? Math.round((pctSum / totalAuctions) * 10) / 10 : 0,
        dividendGiven: dividendAll,
        neverBid: neverAll,
      },
      items,
    });
  } catch (err) {
    console.error("AUCTION INSIGHTS ERROR:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
