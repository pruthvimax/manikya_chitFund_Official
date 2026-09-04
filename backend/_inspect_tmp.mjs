import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
const db = mongoose.connection.db;
const notifs = await db.collection("notifications").find({}).sort({createdAt:-1}).limit(20).toArray();
console.log("=== NOTIFICATIONS ===");
for (const n of notifs) {
  console.log(JSON.stringify({
    _id:String(n._id), groupId:String(n.groupId),
    auctionEndDate:n.auctionEndDate, auctionEndTime:n.auctionEndTime,
    status:n.status, winnerName:n.winnerName, winnerGroupId:n.winnerGroupId,
    createdAt:n.createdAt, updatedAt:n.updatedAt
  }));
}
console.log("\n=== BIDS (distinct auction identities) ===");
const agg = await db.collection("bids").aggregate([
  {$group:{_id:{groupId:"$groupId",auctionDate:"$auctionDate",auctionTime:"$auctionTime"},count:{$sum:1},first:{$min:"$bidTime"},last:{$max:"$bidTime"}}},
  {$sort:{last:-1}}
]).toArray();
for (const r of agg) console.log(JSON.stringify(r));
console.log("\nTotal bids:", await db.collection("bids").countDocuments());
await mongoose.disconnect();
