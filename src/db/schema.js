// db/schema.js
// ─────────────────────────────────────────────────────────────────────────────
// v3.0 — Clean schema. Zero legacy data, fresh start.
//
// ARCHITECTURE:
//   Firestore  → /families/{familyId}          Tree structure (couples + meta)
//   RTDB       → /members/{familyId}/{memberId} Member detail data
//   RTDB       → /invites/{pin}                 Invite tokens
//   RTDB       → /users/{uid}                   User profile + family pointer
//   RTDB       → /editHistory/{fid}/{mid}/{id}  Edit audit log
//   RTDB       → /games/{gameId}                Real-time game data
//
// MOBILE RULE (unchanged):
//   Always store as full E.164 format: "+919974021397"
//   Never store 10-digit only.
// ─────────────────────────────────────────────────────────────────────────────

const ts = () => Date.now();

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE — /families/{familyId}
// 1 document = 1 family = full tree structure
// 1 Firestore read = entire tree loaded (billing optimal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Firestore /families/{familyId}
 * Stores tree structure only — NO member details here (those go in RTDB)
 */
export function familyTreeDoc(f = {}) {
  return {
    familyId:     f.familyId     || null,
    treeName:     f.treeName     || "",
    adminUid:     f.adminUid     || null,   // Firebase Auth UID of admin
    rootCoupleId: f.rootCoupleId || null,   // oldest couple (દાદા-દાદી)
    memberCount:  f.memberCount  || 0,      // dashboard stats
    status:       f.status       || "active", // "active" | "archived"

    // Tree structure — couple nodes
    // couples.{coupleId} = { fatherId, motherId, parentCoupleId,
    //                        childCoupleIds[], unmarriedChildIds[] }
    couples: f.couples || {},

    // Members map — name + photo only (for tree display)
    // members.{memberId} = { name, photoURL, gender, coupleId, status }
    members: f.members || {},

    // Family meta
    vatan:    f.vatan    || "",   // વટાદરા — village of origin
    atak:     f.atak     || "",   // અટક — surname
    kuldevi:  f.kuldevi  || "",   // કુળદેવી

    createdAt: f.createdAt || ts(),
    updatedAt: f.updatedAt || ts(),
  };
}

/**
 * A single couple node inside families/{familyId}.couples
 */
export function coupleNode(f = {}) {
  return {
    fatherId:          f.fatherId          || null,
    motherId:          f.motherId          || null,
    parentCoupleId:    f.parentCoupleId    || null,  // null = root couple
    childCoupleIds:    f.childCoupleIds    || [],    // married children's couple ids
    unmarriedChildIds: f.unmarriedChildIds || [],    // unmarried children member ids
  };
}

/**
 * A member entry inside families/{familyId}.members
 * Minimal — only what tree display needs
 */
export function memberTreeEntry(f = {}) {
  return {
    name:     f.name     || "",
    photoURL: f.photoURL || "",
    gender:   f.gender   || "",   // "M" | "F"
    coupleId: f.coupleId || null, // which couple this member belongs to (as spouse)
    status:   f.status   || "active", // "active" | "removed" (soft delete)
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RTDB — /members/{familyId}/{memberId}
// Full member details — loaded on demand (profile view)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RTDB /members/{familyId}/{memberId}
 * Full member detail — phone, email, dob etc.
 */
export function memberDoc(f = {}) {
  return {
    name:          f.name          || "",
    gender:        f.gender        || "",    // "M" | "F"
    phone:         f.phone         || "",    // "+91XXXXXXXXXX" always E.164
    countryCode:   f.countryCode   || "+91",
    email:         f.email         || "",
    photoURL:      f.photoURL      || "",
    dob:           f.dob           || "",    // "YYYY-MM-DD"
    address:       f.address       || "",
    occupation:    f.occupation    || "",
    native:        f.native        || "",    // વતન

    // Tree links
    coupleId:      f.coupleId      || null,  // couple this member belongs to
    familyId:      f.familyId      || null,

    // Registration
    registeredUid: f.registeredUid || null,  // Firebase Auth UID (null if anonymous)
    isAnonymous:   f.isAnonymous   || false,
    invitedBy:     f.invitedBy     || null,  // memberId of inviter

    // Soft delete
    status:        f.status        || "active", // "active" | "removed"

    createdAt:     f.createdAt     || ts(),
    updatedAt:     f.updatedAt     || ts(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RTDB — /users/{uid}
// Firebase Auth user's profile + family pointer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RTDB /users/{uid}
 */
export function userDoc(f = {}) {
  return {
    name:        f.name        || "",
    email:       f.email       || null,
    phone:       f.phone       || null,     // "+91XXXXXXXXXX"
    countryCode: f.countryCode || "+91",
    photoURL:    f.photoURL    || "",

    // Family membership
    familyId:    f.familyId    || null,     // primary family
    familyIds:   f.familyIds   || [],       // all families (for cross-family games)
    memberId:    f.memberId    || null,     // member id in primary family

    // Role
    role:        f.role        || "member", // "member" | "admin" | "gameHost"

    createdAt:   f.createdAt   || ts(),
    updatedAt:   f.updatedAt   || ts(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RTDB — /invites/{pin}
// WhatsApp invite tokens
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RTDB /invites/{pin}
 * pin = 6-digit unique code sent via WhatsApp
 */
export function inviteDoc(f = {}) {
  return {
    familyId:  f.familyId  || null,
    memberId:  f.memberId  || null,   // pre-existing member this invite is for
    name:      f.name      || "",     // invitee name (pre-filled in registration)
    phone:     f.phone     || "",     // invitee phone
    type:      f.type      || "join", // "create" (admin) | "join" (member)
    sentBy:    f.sentBy    || null,   // uid of sender

    // Usage tracking (v3.0)
    maxUses:   f.maxUses   || 1,
    usedCount: f.usedCount || 0,

    expiresAt: f.expiresAt || (ts() + 7 * 24 * 60 * 60 * 1000), // 7 days
    status:    f.status    || "pending", // "pending" | "used" | "expired"
    createdAt: f.createdAt || ts(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RTDB — /editHistory/{familyId}/{memberId}/{historyId}
// Audit log for member profile edits
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RTDB /editHistory/{familyId}/{memberId}/{historyId}
 */
export function editHistoryDoc(f = {}) {
  return {
    editedBy:     f.editedBy     || null,  // uid
    editedByName: f.editedByName || "",
    editedAt:     f.editedAt     || ts(),
    // changes = { fieldName: { old: "...", new: "..." } }
    changes:      f.changes      || {},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RTDB — /games/{gameId}
// Real-time game data (Tambola + Kahoot Quiz)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RTDB /games/{gameId}
 */
export function gameDoc(f = {}) {
  return {
    type:       f.type       || "tambola",  // "tambola" | "quiz"
    familyId:   f.familyId   || null,       // null = cross-family game
    hostId:     f.hostId     || null,       // uid of host
    hostName:   f.hostName   || "",
    gameCode:   f.gameCode   || "",         // 6-char join code e.g. "SHA42"
    status:     f.status     || "waiting",  // "waiting"|"active"|"finished"
    maxPlayers: f.maxPlayers || 100,
    createdAt:  f.createdAt  || ts(),
  };
}

/**
 * RTDB /games/{gameId}/players/{uid}
 * One entry per player — score updates in real-time
 */
export function gamePlayerDoc(f = {}) {
  return {
    name:       f.name       || "",
    familyName: f.familyName || "",
    photoURL:   f.photoURL   || "",
    score:      f.score      || 0,
    rank:       f.rank       || 0,
    joinedAt:   f.joinedAt   || ts(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RTDB — /games/{gameId}/tambola
// Tambola-specific game data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RTDB /games/{gameId}/tambola
 */
export function tambolaGameStateDoc(f = {}) {
  return {
    calledNumbers:  f.calledNumbers  || [],    // numbers called so far
    currentNumber:  f.currentNumber  || null,  // latest called number
    prizes: {
      topLine:    { won: false, winnerId: null, winnerName: "" },
      middleLine: { won: false, winnerId: null, winnerName: "" },
      bottomLine: { won: false, winnerId: null, winnerName: "" },
      fullHouse:  { won: false, winnerId: null, winnerName: "" },
    },
  };
}

/**
 * RTDB /games/{gameId}/tambola/tickets/{uid}
 * Player's tambola ticket — 3 rows x 9 cols, 15 numbers
 */
export function tambolaTicketDoc(f = {}) {
  return {
    // numbers[row][col] = number or 0 (blank)
    numbers: f.numbers || [[], [], []],
    // marked[row][col] = true/false
    marked:  f.marked  || [[],[],[]],
    claimed: f.claimed || false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RTDB — /games/{gameId}/quiz
// Kahoot-style quiz game data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * RTDB /games/{gameId}/quiz
 */
export function quizGameStateDoc(f = {}) {
  return {
    currentQuestion:   f.currentQuestion   || 0,
    questionStartedAt: f.questionStartedAt || null, // timestamp for timer sync
    showAnswer:        f.showAnswer        || false,
    status: f.status || "waiting", // "waiting"|"question"|"answer"|"finished"
    totalQuestions:    f.totalQuestions    || 0,
  };
}

/**
 * A single quiz question
 * Stored in Firestore /quizTemplates/{id} OR inline in game
 */
export function quizQuestionDoc(f = {}) {
  return {
    text:         f.text         || "",
    type:         f.type         || "mcq",  // "mcq" | "truefalse"
    category:     f.category     || "gk",   // "gk" | "gujarati" | "family" | "custom"
    options:      f.options      || [],     // ["A","B","C","D"]
    correctIndex: f.correctIndex ?? 0,
    timeLimit:    f.timeLimit    || 20,     // seconds
    points:       f.points       || 100,
  };
}

/**
 * RTDB /games/{gameId}/quiz/answers/{questionIdx}/{uid}
 * Player's answer for a specific question
 */
export function quizAnswerDoc(f = {}) {
  return {
    answer:       f.answer       ?? -1,   // option index (-1 = no answer)
    answeredAt:   f.answeredAt   || null, // timestamp
    pointsEarned: f.pointsEarned || 0,
    timeTaken:    f.timeTaken    || 0,    // seconds
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Generate unique member ID */
export function newMemberId() {
  return "m_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/** Generate unique couple ID */
export function newCoupleId() {
  return "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6);
}

/** Generate unique family ID */
export function newFamilyId() {
  return "FAM_" + Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Generate unique game ID */
export function newGameId() {
  return "game_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 5);
}

/** Generate 6-char game code e.g. "SHA42K" */
export function newGameCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

/** Generate 6-digit invite PIN */
export function newInvitePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Check if invite is expired */
export function isInviteExpired(invite) {
  if (!invite?.expiresAt) return false;
  return Date.now() > invite.expiresAt;
}

/** Check if invite is still usable */
export function isInviteUsable(invite) {
  if (!invite) return false;
  if (isInviteExpired(invite)) return false;
  if (invite.status === "expired") return false;
  if (invite.usedCount >= invite.maxUses) return false;
  return true;
}