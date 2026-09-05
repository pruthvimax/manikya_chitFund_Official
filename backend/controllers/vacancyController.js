import mongoose from "mongoose";

import ChitScheme from "../models/ChitScheme.js";
import Group from "../models/Group.js";
import Member from "../models/Member.js";
import Vacancy from "../models/Vacancy.js";
import VacancyRequest from "../models/VacancyRequest.js";

/* =========================================================
   HELPERS

   Everything below READS the existing collections.
   Nothing here writes to ChitScheme, Group or Member.
========================================================= */

/**
 * Subscription amount for a vacancy comes straight out of the
 * EXISTING ChitScheme row - it is never stored on the vacancy.
 */
const subscriptionAmountFor = (chit, frequency) => {
  if (!chit) return 0;

  if (frequency === "Daily") return Number(chit.dailyAmount || 0);
  if (frequency === "Weekly") return Number(chit.weeklyAmount || 0);

  return Number(chit.monthlyAmount || 0);
};

/**
 * THE ONLY PLACE VACANCY COUNT IS CALCULATED.
 *
 * capacity  = group.totalCollections   (existing field)
 * filled    = group.members.length     (existing embedded list)
 * available = capacity - filled
 *
 * No second member count is kept anywhere. Adding a member with
 * the existing add-member API grows group.members, removing one
 * with the existing remove API shrinks it, so the vacancy count
 * follows the real data automatically.
 */
const seatsFor = (group) => {
  const capacity = Number(group?.totalCollections || 0);
  const filled = Array.isArray(group?.members) ? group.members.length : 0;

  return {
    capacity,
    filled,
    available: Math.max(capacity - filled, 0),
  };
};

/**
 * Running-instalment info, read from the group's EXISTING
 * collectionPlans (the admin plan that is already the source of
 * truth for installmentAmount and dividend).
 *
 * currentInstalment -> highest monthIndex whose startDate has
 *                      already passed (0 when the group has not
 *                      started yet)
 * dividend          -> that month's dividend  (existing field)
 * payNow            -> installmentAmount - dividend, exactly the
 *                      same formula getMyChits already uses
 */
const instalmentInfoFor = (group, fallbackAmount) => {
  const total = Number(group?.totalCollections || 0);

  const plans = Array.isArray(group?.collectionPlans)
    ? group.collectionPlans
    : [];

  const now = new Date();

  let current = 0;
  let currentPlan = null;

  plans.forEach((p) => {
    const index = Number(p?.monthIndex || 0);
    const started = p?.startDate
      ? new Date(p.startDate) <= now
      : false;

    if (started && index > current) {
      current = index;
      currentPlan = p;
    }
  });

  /* Nothing started yet */
  if (!currentPlan && plans.length > 0) {
    currentPlan = plans.reduce((a, b) =>
      Number(a.monthIndex) <= Number(b.monthIndex) ? a : b
    );
  }

  const installmentAmount = Number(
    currentPlan?.installmentAmount ?? fallbackAmount ?? 0
  );

  const dividend = Number(currentPlan?.dividend || 0);

  /*
   * ============================================================
   * NEW SUBSCRIBER JOINING PAYMENT
   *
   * If Month 3 is running:
   *
   * Month 1 -> full instalment
   * Month 2 -> full instalment
   * Month 3 -> current payable amount
   *
   * Example:
   * Month 1 = ₹10,000
   * Month 2 = ₹10,000
   * Month 3 = ₹8,000 after dividend
   *
   * Joining amount = ₹28,000
   * ============================================================
   */

  let previousInstalmentsAmount = 0;

  if (current > 1 && plans.length > 0) {
    plans.forEach((p) => {
      const monthIndex = Number(p?.monthIndex || 0);

      if (monthIndex > 0 && monthIndex < current) {
        previousInstalmentsAmount += Number(
          p?.installmentAmount ?? fallbackAmount ?? 0
        );
      }
    });
  }

  /*
   * Current month's actual payable amount.
   * Same calculation already used by the existing vacancy system.
   */
  const currentPayableAmount = Math.max(
    installmentAmount - dividend,
    0
  );

  const joiningPayNowAmount =
    previousInstalmentsAmount + currentPayableAmount;

  return {
    currentInstalment: current,
    totalInstalments: total,

    dividend,

    /* Existing current-month amount */
    payNowAmount: currentPayableAmount,

    baseInstalmentAmount: installmentAmount,

    /* NEW */
    previousInstalmentsAmount,

    /* NEW */
    currentPayableAmount,

    /* NEW */
    joiningPayNowAmount,
  };
};

/**
 * Build the full view of a vacancy by joining it live with the
 * existing ChitScheme and Group documents.
 */
const buildVacancyView = (vacancy, chit, group) => {
  const seats = seatsFor(group);

  const subscription = subscriptionAmountFor(chit, vacancy.frequency);

  const instalment = instalmentInfoFor(group, subscription);

  return {
    _id: vacancy._id,

    /* references only */
    chitId: vacancy.chitId,
    groupId: vacancy.groupId,

    /* vacancy-specific (stored on the vacancy) */
    maxBidPercent: vacancy.maxBidPercent,
    frequency: vacancy.frequency,
    details: vacancy.details,
    status: vacancy.status,

    /* live from ChitScheme - NOT stored on the vacancy */
    chitAmount: chit ? Number(chit.chitAmount || 0) : 0,
    durationMonths: chit ? Number(chit.durationMonths || 0) : 0,
    subscriptionAmount: subscription,

    /* live from Group - NOT stored on the vacancy */
    capacity: seats.capacity,
    filledSeats: seats.filled,
    availableSeats: seats.available,

    /* live from Group.collectionPlans - NOT stored on the vacancy */
currentInstalment: instalment.currentInstalment,
totalInstalments: instalment.totalInstalments,
dividend: instalment.dividend,
payNowAmount: instalment.payNowAmount,
baseInstalmentAmount: instalment.baseInstalmentAmount,

/* NEW JOINING PAYMENT */
previousInstalmentsAmount: instalment.previousInstalmentsAmount,
currentPayableAmount: instalment.currentPayableAmount,
joiningPayNowAmount: instalment.joiningPayNowAmount,

    createdAt: vacancy.createdAt,
    updatedAt: vacancy.updatedAt,
  };
};

/** Load chits + groups once and index them for fast joining. */
const loadLookups = async () => {
  const [chits, groups] = await Promise.all([
    ChitScheme.find().lean(),
    Group.find(
      {},
      {
        groupId: 1,
        chitId: 1,
        totalCollections: 1,
        members: 1,
        collectionPlans: 1,
      }
    ).lean(),
  ]);

  const chitMap = {};
  chits.forEach((c) => {
    chitMap[String(c.chitId)] = c;
  });

  const groupMap = {};
  groups.forEach((g) => {
    groupMap[`${String(g.chitId)}::${String(g.groupId)}`] = g;
  });

  return { chitMap, groupMap };
};

/* =========================================================
   ADMIN: CREATE VACANCY

   Uses an EXISTING chit and an EXISTING group. If either does
   not exist the request is rejected - nothing is created here.
========================================================= */

export const createVacancy = async (req, res) => {
  try {
    const { chitId, groupId, maxBidPercent, frequency, details, status } =
      req.body;

    if (!chitId || !groupId || maxBidPercent === undefined || !frequency) {
      return res.status(400).json({
        message: "Chit, Group, Max Bid % and Frequency are required",
      });
    }

    const numericMaxBid = Number(maxBidPercent);

    if (!Number.isFinite(numericMaxBid) || numericMaxBid < 0 || numericMaxBid > 100) {
      return res.status(400).json({
        message: "Max Bid % must be between 0 and 100",
      });
    }

    if (!["Daily", "Weekly", "Monthly"].includes(frequency)) {
      return res.status(400).json({
        message: "Frequency must be Daily, Weekly or Monthly",
      });
    }

    /* EXISTING CHIT MUST EXIST */
    const chit = await ChitScheme.findOne({ chitId: String(chitId) }).lean();

    if (!chit) {
      return res.status(404).json({
        message: "Chit scheme not found. Create it in Chit Schemes first.",
      });
    }

    /* EXISTING GROUP MUST EXIST AND BELONG TO THAT CHIT */
    const group = await Group.findOne({
      groupId: String(groupId),
      chitId: String(chitId),
    }).lean();

    if (!group) {
      return res.status(404).json({
        message: "Group not found for this chit. Create it in Groups first.",
      });
    }

    const duplicate = await Vacancy.findOne({
      chitId: String(chitId),
      groupId: String(groupId),
    }).lean();

    if (duplicate) {
      return res.status(400).json({
        message: `A vacancy already exists for group ${groupId}. Edit it instead.`,
      });
    }

    const vacancy = await Vacancy.create({
      chitId: String(chitId),
      groupId: String(groupId),
      maxBidPercent: numericMaxBid,
      frequency,
      details: details ? String(details).trim() : "",
      status: status === "Closed" ? "Closed" : "Open",
    });

    return res.status(201).json({
      message: "Vacancy published successfully",
      vacancy: buildVacancyView(vacancy, chit, group),
    });
  } catch (err) {
    console.error("Create vacancy error:", err);

    if (err?.code === 11000) {
      return res.status(400).json({
        message: "A vacancy already exists for this chit and group",
      });
    }

    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: LIST ALL VACANCIES (with live seat counts)
========================================================= */

export const getVacancies = async (req, res) => {
  try {
    const vacancies = await Vacancy.find().sort({ createdAt: -1 }).lean();
    const { chitMap, groupMap } = await loadLookups();

    const result = vacancies.map((v) =>
      buildVacancyView(
        v,
        chitMap[String(v.chitId)],
        groupMap[`${String(v.chitId)}::${String(v.groupId)}`]
      )
    );

    return res.json(result);
  } catch (err) {
    console.error("Get vacancies error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: UPDATE VACANCY (vacancy-specific fields only)
========================================================= */

export const updateVacancy = async (req, res) => {
  try {
    const { id } = req.params;
    const { maxBidPercent, frequency, details, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid vacancy id" });
    }

    const vacancy = await Vacancy.findById(id);

    if (!vacancy) {
      return res.status(404).json({ message: "Vacancy not found" });
    }

    if (maxBidPercent !== undefined) {
      const numericMaxBid = Number(maxBidPercent);

      if (
        !Number.isFinite(numericMaxBid) ||
        numericMaxBid < 0 ||
        numericMaxBid > 100
      ) {
        return res.status(400).json({
          message: "Max Bid % must be between 0 and 100",
        });
      }

      vacancy.maxBidPercent = numericMaxBid;
    }

    if (frequency !== undefined) {
      if (!["Daily", "Weekly", "Monthly"].includes(frequency)) {
        return res.status(400).json({
          message: "Frequency must be Daily, Weekly or Monthly",
        });
      }

      vacancy.frequency = frequency;
    }

    if (details !== undefined) {
      vacancy.details = String(details).trim();
    }

    if (status !== undefined) {
      if (!["Open", "Closed"].includes(status)) {
        return res.status(400).json({ message: "Status must be Open or Closed" });
      }

      vacancy.status = status;
    }

    await vacancy.save();

    const [chit, group] = await Promise.all([
      ChitScheme.findOne({ chitId: vacancy.chitId }).lean(),
      Group.findOne({ groupId: vacancy.groupId, chitId: vacancy.chitId }).lean(),
    ]);

    return res.json({
      message: "Vacancy updated successfully",
      vacancy: buildVacancyView(vacancy, chit, group),
    });
  } catch (err) {
    console.error("Update vacancy error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: DELETE VACANCY

   Only the vacancy is removed. The chit, the group and every
   group member stay exactly as they are.
========================================================= */

export const deleteVacancy = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid vacancy id" });
    }

    const deleted = await Vacancy.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Vacancy not found" });
    }

    await VacancyRequest.deleteMany({ vacancyId: deleted._id });

    return res.json({ message: "Vacancy deleted successfully" });
  } catch (err) {
    console.error("Delete vacancy error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   MEMBER: OPEN VACANCIES

   A vacancy is shown only when:
     - admin status is "Open", AND
     - the REAL group still has a free seat
       (totalCollections - members.length > 0)
========================================================= */

export const getOpenVacancies = async (req, res) => {
  try {
    const { userid } = req.query;

    const vacancies = await Vacancy.find({ status: "Open" })
      .sort({ createdAt: -1 })
      .lean();

    const { chitMap, groupMap } = await loadLookups();

    /* Requests this member already raised, so the card can show
       "Requested" instead of offering Subscribe twice. */
    let myRequestMap = {};

    if (userid) {
      const myRequests = await VacancyRequest.find({
        memberId: String(userid),
      }).lean();

      myRequests.forEach((r) => {
        myRequestMap[String(r.vacancyId)] = r.status;
      });
    }

    const result = vacancies
      .map((v) => {
        const group = groupMap[`${String(v.chitId)}::${String(v.groupId)}`];

        if (!group) return null;

        const view = buildVacancyView(v, chitMap[String(v.chitId)], group);

        /* Group is full -> not an available vacancy */
        if (view.availableSeats <= 0) return null;

        /* Already a member of this group -> nothing to subscribe to */
        const alreadyInGroup =
          userid &&
          (group.members || []).some(
            (m) => String(m.memberId) === String(userid)
          );

        return {
          ...view,
          alreadyInGroup: Boolean(alreadyInGroup),
          myRequestStatus: myRequestMap[String(v._id)] || null,
        };
      })
      .filter(Boolean);

    return res.json(result);
  } catch (err) {
    console.error("Get open vacancies error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   MEMBER: SUBSCRIBE  ->  PENDING REQUEST

   The member is NOT added to the group here.

   The frontend sends only the logged-in userid. Every other
   detail (name, phone, address, chit, group) is resolved by
   this controller from the existing collections.
========================================================= */

export const createVacancyRequest = async (req, res) => {
  try {
    const { vacancyId, userid } = req.body;

    if (!vacancyId || !userid) {
      return res.status(400).json({
        message: "Vacancy and logged in user are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(String(vacancyId))) {
      return res.status(400).json({ message: "Invalid vacancy id" });
    }

    /* IDENTITY COMES FROM THE DATABASE, NOT FROM THE REQUEST BODY */
    const member = await Member.findOne({ userid: String(userid) }).lean();

    if (!member) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (member.status !== "active") {
      return res.status(403).json({ message: "Member account is inactive" });
    }

    const vacancy = await Vacancy.findById(vacancyId).lean();

    if (!vacancy) {
      return res.status(404).json({ message: "Vacancy not found" });
    }

    if (vacancy.status !== "Open") {
      return res.status(400).json({ message: "This vacancy is closed" });
    }

    const group = await Group.findOne({
      groupId: vacancy.groupId,
      chitId: vacancy.chitId,
    }).lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    /* REAL SEAT CHECK AGAINST THE REAL MEMBER LIST */
    const seats = seatsFor(group);

    if (seats.available <= 0) {
      return res.status(400).json({
        message: "This group is already full. No seats left.",
      });
    }



    const existing = await VacancyRequest.findOne({
      vacancyId: vacancy._id,
      memberId: member.userid,
    }).lean();

    if (existing) {
      return res.status(400).json({
        message: `You already have a ${existing.status.toLowerCase()} request for this group`,
      });
    }

    const request = await VacancyRequest.create({
      vacancyId: vacancy._id,
      chitId: vacancy.chitId,
      groupId: vacancy.groupId,
      memberId: member.userid,
      requestDate: new Date(),
      status: "Pending",
      seenByAdmin: false,
    });

    return res.status(201).json({
      message: "Subscription request sent. Admin will review it shortly.",
      request: {
        _id: request._id,
        vacancyId: request.vacancyId,
        chitId: request.chitId,
        groupId: request.groupId,
        memberId: request.memberId,
        requestDate: request.requestDate,
        status: request.status,
      },
    });
  } catch (err) {
    console.error("Create vacancy request error:", err);

    if (err?.code === 11000) {
      return res.status(400).json({
        message: "You have already requested this vacancy",
      });
    }

    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: LIST SUBSCRIPTION REQUESTS

   Member name / phone / address / chit amount / seats are all
   resolved LIVE from the existing collections.
========================================================= */

export const getVacancyRequests = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status && ["Pending", "Approved", "Rejected"].includes(status)) {
      filter.status = status;
    }

    const requests = await VacancyRequest.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    if (requests.length === 0) {
      return res.json({ pendingCount: 0, unseenCount: 0, requests: [] });
    }

    const { chitMap, groupMap } = await loadLookups();

    const memberIds = [...new Set(requests.map((r) => String(r.memberId)))];

    const members = await Member.find(
      { userid: { $in: memberIds } },
      { userid: 1, username: 1, phone: 1, email: 1, address: 1, status: 1 }
    ).lean();

    const memberMap = {};
    members.forEach((m) => {
      memberMap[String(m.userid)] = m;
    });

    const vacancyIds = [...new Set(requests.map((r) => String(r.vacancyId)))];

    const vacancies = await Vacancy.find({ _id: { $in: vacancyIds } }).lean();

    const vacancyMap = {};
    vacancies.forEach((v) => {
      vacancyMap[String(v._id)] = v;
    });

    const result = requests.map((r) => {
      const chit = chitMap[String(r.chitId)];
      const group = groupMap[`${String(r.chitId)}::${String(r.groupId)}`];
      const member = memberMap[String(r.memberId)];
      const vacancy = vacancyMap[String(r.vacancyId)];

      const seats = seatsFor(group);

      const alreadyInGroup = group
        ? (group.members || []).some(
            (m) => String(m.memberId) === String(r.memberId)
          )
        : false;

      /* Suggested next group member id, derived from the group's
         EXISTING members. Admin can change it before confirming. */
      let suggestedGroupMemberId = "M01";

      if (group && Array.isArray(group.members)) {
        let maxNumber = 0;

        group.members.forEach((m) => {
          const match = String(m.groupMemberId || "").match(/(\d+)/);
          if (match) {
            maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
          }
        });

        suggestedGroupMemberId = `M${String(maxNumber + 1).padStart(2, "0")}`;
      }

      return {
        _id: r._id,
        vacancyId: r.vacancyId,
        status: r.status,
        requestDate: r.requestDate,
        seenByAdmin: r.seenByAdmin,
        approvedGroupMemberId: r.approvedGroupMemberId,
        approvedAt: r.approvedAt,

        /* MEMBER - live from Member collection */
        memberId: r.memberId,
        memberName: member?.username || "Unknown",
        memberPhone: member?.phone || "-",
        memberEmail: member?.email || "-",
        memberAddress: member?.address || "-",
        memberStatus: member?.status || "-",

        /* CHIT - live from ChitScheme */
        chitId: r.chitId,
        chitAmount: chit ? Number(chit.chitAmount || 0) : 0,
        durationMonths: chit ? Number(chit.durationMonths || 0) : 0,

        /* GROUP - live from Group */
        groupId: r.groupId,
        capacity: seats.capacity,
        filledSeats: seats.filled,
        availableSeats: seats.available,
        alreadyInGroup,
        suggestedGroupMemberId,

        /* VACANCY */
        maxBidPercent: vacancy?.maxBidPercent ?? null,
        frequency: vacancy?.frequency || "-",
        subscriptionAmount: vacancy
          ? subscriptionAmountFor(chit, vacancy.frequency)
          : 0,
      };
    });

    const pendingCount = await VacancyRequest.countDocuments({
      status: "Pending",
    });

    const unseenCount = await VacancyRequest.countDocuments({
      status: "Pending",
      seenByAdmin: false,
    });

    return res.json({ pendingCount, unseenCount, requests: result });
  } catch (err) {
    console.error("Get vacancy requests error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: BADGE COUNT ONLY (cheap poll for the red tick)
========================================================= */

export const getVacancyRequestCount = async (req, res) => {
  try {
    const [pendingCount, unseenCount] = await Promise.all([
      VacancyRequest.countDocuments({ status: "Pending" }),
      VacancyRequest.countDocuments({ status: "Pending", seenByAdmin: false }),
    ]);

    return res.json({ pendingCount, unseenCount });
  } catch (err) {
    console.error("Get vacancy request count error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: MARK REQUESTS AS SEEN (clears the red tick)
========================================================= */

export const markRequestsSeen = async (req, res) => {
  try {
    await VacancyRequest.updateMany(
      { status: "Pending", seenByAdmin: false },
      { $set: { seenByAdmin: true } }
    );

    return res.json({ message: "Requests marked as seen" });
  } catch (err) {
    console.error("Mark requests seen error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: CONFIRM APPROVAL

   IMPORTANT - THIS DOES NOT ADD THE MEMBER.

   The admin app adds the member with the EXISTING endpoint
   POST /api/groups/:groupId/members  (unchanged group logic),
   and only then calls this. Here we simply VERIFY that the
   member really is in the group now and flip the request to
   Approved. If the member is not actually in the group the
   request stays Pending, so the status can never lie.
========================================================= */

export const approveVacancyRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { groupMemberId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const request = await VacancyRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    const group = await Group.findOne({
      groupId: request.groupId,
      chitId: request.chitId,
    }).lean();

    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    const entry = (group.members || []).find(
      (m) => String(m.memberId) === String(request.memberId)
    );

    if (!entry) {
      return res.status(400).json({
        message:
          "Member is not in the group yet. Add the member to the group first, then confirm.",
      });
    }

    request.status = "Approved";
    request.approvedGroupMemberId =
      groupMemberId || entry.groupMemberId || "";
    request.approvedAt = new Date();
    request.seenByAdmin = true;

    await request.save();

    const seats = seatsFor(group);

    return res.json({
      message: "Request approved. Member is now in the group.",
      request: {
        _id: request._id,
        status: request.status,
        approvedGroupMemberId: request.approvedGroupMemberId,
        approvedAt: request.approvedAt,
      },
      seats,
    });
  } catch (err) {
    console.error("Approve vacancy request error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: REJECT REQUEST
========================================================= */

export const rejectVacancyRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const request = await VacancyRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status === "Approved") {
      return res.status(400).json({
        message: "This request is already approved",
      });
    }

    request.status = "Rejected";
    request.seenByAdmin = true;

    await request.save();

    return res.json({ message: "Request rejected", request });
  } catch (err) {
    console.error("Reject vacancy request error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   ADMIN: DELETE REQUEST
========================================================= */

export const deleteVacancyRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid request id" });
    }

    const deleted = await VacancyRequest.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Request not found" });
    }

    return res.json({ message: "Request deleted successfully" });
  } catch (err) {
    console.error("Delete vacancy request error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* =========================================================
   MEMBER: MY REQUESTS
========================================================= */

export const getMyVacancyRequests = async (req, res) => {
  try {
    const { userid } = req.params;

    if (!userid) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const requests = await VacancyRequest.find({ memberId: String(userid) })
      .sort({ createdAt: -1 })
      .lean();

    if (requests.length === 0) return res.json([]);

    const { chitMap } = await loadLookups();

    return res.json(
      requests.map((r) => ({
        _id: r._id,
        chitId: r.chitId,
        chitAmount: chitMap[String(r.chitId)]
          ? Number(chitMap[String(r.chitId)].chitAmount || 0)
          : 0,
        groupId: r.groupId,
        status: r.status,
        requestDate: r.requestDate,
        approvedGroupMemberId: r.approvedGroupMemberId,
      }))
    );
  } catch (err) {
    console.error("Get my vacancy requests error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};
