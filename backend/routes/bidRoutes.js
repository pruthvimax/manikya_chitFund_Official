import express from "express";

import {
   adminAddBid,
   deleteBid,
   getAuctionBids,
   getCustomerAuctionBids,
   getCustomerBidHistory,
   placeBid,
} from "../controllers/bidController.js";

const router = express.Router();

/* =========================================================
   CUSTOMER
========================================================= */

// Customer places bid
router.post("/place", placeBid);

// Customer sees live bids
router.get("/live", getCustomerAuctionBids);

/* =========================================================
   ADMIN
========================================================= */

// Admin manually adds a bid
router.post("/admin/add", adminAddBid);

// Admin gets auction bids
router.get("/auction", getAuctionBids);

// Admin gets customer history
router.get("/customer-history", getCustomerBidHistory);

// Admin deletes a bid
router.delete("/:bidId", deleteBid);

export default router;