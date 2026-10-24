import BACKEND_URL from "../../config";

/* =========================================================
   SPINNER API (HTTP) + TYPES
========================================================= */

// BACKEND_URL is ".../api". Socket.IO lives on the same server root.
export const SOCKET_ORIGIN = String(BACKEND_URL).replace(/\/api\/?$/, "");

export type SpinMode = "RANDOM" | "ADMIN_SELECTED";

export type SpinState = {
  exists: true;
  notificationId: string;
  groupId: string;
  auctionEndDate: string;
  auctionEndTime: string;
  status: "starting" | "spinning" | "completed";
  mode: SpinMode;
  candidates: { groupMemberId: string }[];
  winnerIndex: number;
  winner: {
    groupMemberId: string;
    memberName: string; // empty unless this device belongs to the winner (or admin)
    bidAmount: number;
    isWinner?: boolean;
  };
  chitValue?: number;
  previousWinningBid?: number;
  auctionNumber?: number;
  rotations: number;
  durationMs: number;
  seed: number;
  startsAt: number; // server clock, ms
  endsAt: number; // server clock, ms
  serverTime: number;
  // admin only
  audit?: { event: string; at: string; by: string; detail: string }[];
  usedFallback?: boolean;
};

export type AuctionIdentity = {
  notificationId?: string;
  groupId?: string;
  auctionEndDate?: string;
  auctionEndTime?: string;
};

export type AdminCandidate = {
  memberId: string;
  groupMemberId: string;
  memberName: string;
  bidAmount: number;
  bidTime?: string | null;
};

export type CandidatesResponse = {
  success: boolean;
  message?: string;
  notificationId: string;
  groupId: string;
  auctionEndDate: string;
  auctionEndTime: string;
  auctionEndsAt: number | null;
  auctionEnded: boolean;
  maxBidAmount: number;
  topBidAmount: number;
  usedFallback: boolean;
  totalBids: number;
  candidates: AdminCandidate[];
  winnerAlreadyRecorded: boolean;
  session: SpinState | null;
  serverTime: number;
};

const toQuery = (obj: Record<string, string | undefined>) =>
  Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");

export class SpinnerHttpError extends Error {
  status: number;
  body: any;
  constructor(status: number, message: string, body?: any) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const parse = async (res: Response) => {
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    throw new SpinnerHttpError(
      res.status,
      body?.message || `Request failed (${res.status})`,
      body
    );
  }
  return body;
};

/* ---------- member + admin ---------- */

// Returns the state and an estimate of (serverClock - deviceClock).
export const fetchSpinState = async (
  identity: AuctionIdentity & { userid?: string },
  adminKey?: string
) => {
  const t0 = Date.now();
  const res = await fetch(
    `${BACKEND_URL}/spinner/state?${toQuery({
      notificationId: identity.notificationId,
      groupId: identity.groupId,
      auctionEndDate: identity.auctionEndDate,
      auctionEndTime: identity.auctionEndTime,
      userid: identity.userid,
    })}`,
    { headers: adminKey ? { "x-spinner-key": adminKey } : undefined }
  );
  const t1 = Date.now();
  const body = await parse(res);

  const clockOffset =
    typeof body.serverTime === "number"
      ? body.serverTime - (t0 + t1) / 2
      : 0;

  return {
    clockOffset,
    auctionEnded: Boolean(body.auctionEnded),
    notificationId: String(body.notificationId || ""),
    state: body.exists ? (body as SpinState) : null,
  };
};

/* ---------- admin ---------- */

export const fetchCandidates = async (
  identity: AuctionIdentity,
  adminKey: string
): Promise<CandidatesResponse> => {
  const res = await fetch(
    `${BACKEND_URL}/spinner/candidates?${toQuery({
      notificationId: identity.notificationId,
      groupId: identity.groupId,
      auctionEndDate: identity.auctionEndDate,
      auctionEndTime: identity.auctionEndTime,
    })}`,
    { headers: { "x-spinner-key": adminKey } }
  );
  return parse(res);
};

export const startSpinRequest = async (
  body: AuctionIdentity & {
    targetGroupMemberId?: string;
    durationSec?: number;
    rotations?: number;
  },
  adminKey: string
): Promise<{ session: SpinState }> => {
  const res = await fetch(`${BACKEND_URL}/spinner/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-spinner-key": adminKey,
    },
    body: JSON.stringify(body),
  });
  return parse(res);
};
