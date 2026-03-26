// db/gameDb.js
// ─────────────────────────────────────────────────────────────────────────────
// RTDB operations for real-time games: Tambola + Kahoot Quiz.
//
// RTDB structure:
//   /games/{gameId}                          → game meta
//   /games/{gameId}/players/{uid}            → player scores (live)
//   /games/{gameId}/tambola                  → tambola state
//   /games/{gameId}/tambola/tickets/{uid}    → player tickets
//   /games/{gameId}/quiz                     → quiz state
//   /games/{gameId}/quiz/questions/{idx}     → questions array
//   /games/{gameId}/quiz/answers/{idx}/{uid} → player answers
//
// REAL-TIME:
//   Leaderboard uses onValue() listener on /games/{gameId}/players
//   All players see same state via onValue() on /games/{gameId}/tambola
//   or /games/{gameId}/quiz
// ─────────────────────────────────────────────────────────────────────────────

import { ref, onValue, off } from "firebase/database";
import { db }                from "../lib/firebase";
import { rtdb }              from "./rtdb";
import {
  gameDoc, gamePlayerDoc,
  tambolaGameStateDoc, tambolaTicketDoc,
  quizGameStateDoc, quizQuestionDoc, quizAnswerDoc,
  newGameId, newGameCode,
} from "./schema";

// ─────────────────────────────────────────────────────────────────────────────
// GAME — CREATE & META
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new game (Tambola or Quiz).
 * Called by Admin or Game Host.
 *
 * @param {object} params
 * @param {'tambola'|'quiz'} params.type
 * @param {string}  params.familyId   - null for cross-family game
 * @param {string}  params.hostId     - uid of host
 * @param {string}  params.hostName
 * @param {number}  params.maxPlayers - default 100
 *
 * @returns {{ gameId: string, gameCode: string }}
 */
export async function createGame({ type, familyId, hostId, hostName, maxPlayers = 100 }) {
  const gameId   = newGameId();
  const gameCode = newGameCode();

  const meta = gameDoc({
    type,
    familyId:   familyId || null,
    hostId,
    hostName:   hostName || "",
    gameCode,
    status:     "waiting",
    maxPlayers,
    createdAt:  Date.now(),
  });

  await rtdb.set(`games/${gameId}`, meta);

  // Initialize game-type specific state
  if (type === "tambola") {
    await rtdb.set(`games/${gameId}/tambola`, tambolaGameStateDoc());
  } else if (type === "quiz") {
    await rtdb.set(`games/${gameId}/quiz`, quizGameStateDoc());
  }

  return { gameId, gameCode };
}

/**
 * Get game meta by gameId.
 */
export async function getGame(gameId) {
  if (!gameId) return null;
  return rtdb.get(`games/${gameId}`);
}

/**
 * Find a game by its 6-char join code.
 * Scans recent games — code is unique per active game.
 * Returns { gameId, game } or null.
 */
export async function findGameByCode(gameCode) {
  if (!gameCode) return null;

  // Get all games (in production, use RTDB query with orderByChild)
  const snap = await rtdb.getList("games");
  const match = snap.find(
    g => g.gameCode?.toUpperCase() === gameCode.toUpperCase() &&
         g.status !== "finished"
  );

  return match ? { gameId: match.id, game: match } : null;
}

/**
 * Update game status.
 * status: "waiting" | "active" | "finished"
 */
export async function updateGameStatus(gameId, status) {
  await rtdb.update(`games/${gameId}`, {
    status,
    ...(status === "active"   ? { startedAt:  Date.now() } : {}),
    ...(status === "finished" ? { finishedAt: Date.now() } : {}),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYERS — JOIN & SCORE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add a player to a game.
 * Called when user joins via game code.
 */
export async function joinGame(gameId, uid, { name, familyName, photoURL }) {
  const player = gamePlayerDoc({
    name:       name       || "",
    familyName: familyName || "",
    photoURL:   photoURL   || "",
    score:      0,
    joinedAt:   Date.now(),
  });

  await rtdb.set(`games/${gameId}/players/${uid}`, player);
}

/**
 * Update a player's score in real-time.
 * Called by Cloud Function or trusted client after answer verified.
 */
export async function updatePlayerScore(gameId, uid, scoreToAdd) {
  const current = await rtdb.get(`games/${gameId}/players/${uid}`);
  if (!current) return;

  const newScore = (current.score || 0) + scoreToAdd;
  await rtdb.update(`games/${gameId}/players/${uid}`, {
    score: newScore,
  });
  return newScore;
}

/**
 * Get all players sorted by score (for leaderboard snapshot).
 * For live updates, use listenToLeaderboard() instead.
 */
export async function getLeaderboard(gameId) {
  const players = await rtdb.getList(`games/${gameId}/players`);
  return players
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME LISTENERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Listen to leaderboard in real-time.
 * Returns unsubscribe function — call it on component unmount.
 *
 * @param {string}   gameId
 * @param {function} onUpdate - callback({ players: [...sorted] })
 * @returns {function} unsubscribe
 *
 * Usage:
 *   const unsub = listenToLeaderboard(gameId, ({ players }) => setPlayers(players));
 *   useEffect(() => () => unsub(), []);
 */
export function listenToLeaderboard(gameId, onUpdate) {
  const r = ref(db, `games/${gameId}/players`);

  const handler = (snap) => {
    if (!snap.exists()) { onUpdate({ players: [] }); return; }

    const players = [];
    snap.forEach(child => {
      players.push({ uid: child.key, ...child.val() });
    });

    const sorted = players
      .sort((a, b) => b.score - a.score)
      .map((p, i) => ({ ...p, rank: i + 1 }));

    onUpdate({ players: sorted });
  };

  onValue(r, handler);
  return () => off(r, "value", handler);
}

/**
 * Listen to game meta changes (status, etc.).
 * Returns unsubscribe function.
 */
export function listenToGame(gameId, onUpdate) {
  const r = ref(db, `games/${gameId}`);
  const handler = (snap) => onUpdate(snap.exists() ? snap.val() : null);
  onValue(r, handler);
  return () => off(r, "value", handler);
}

// ─────────────────────────────────────────────────────────────────────────────
// TAMBOLA — HOST OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a valid Tambola ticket (3 rows × 9 cols, 15 numbers).
 *
 * Rules:
 *   Col 0: numbers 1-9
 *   Col 1: numbers 10-19
 *   ...
 *   Col 8: numbers 80-90
 *   Each row has exactly 5 numbers + 4 blanks (0)
 *   Each column has at least 1 number
 */
export function generateTambolaTicket() {
  const ROWS = 3;
  const COLS = 9;
  const NUMS_PER_ROW = 5;

  // For each column, pick 1-3 numbers from its range
  const colPools = Array.from({ length: COLS }, (_, c) => {
    const min = c === 0 ? 1  : c * 10;
    const max = c === 8 ? 90 : c * 10 + 9;
    const pool = [];
    for (let n = min; n <= max; n++) pool.push(n);
    return pool;
  });

  // Shuffle each column pool
  colPools.forEach(pool => {
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
  });

  // Build a 3×9 grid — ensure each row has exactly 5 numbers
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));

  // Assign at least 1 number per column across all rows
  const colAssigned = Array(COLS).fill(0); // how many assigned per col

  // Random row assignments for each col
  for (let c = 0; c < COLS; c++) {
    const row = Math.floor(Math.random() * ROWS);
    grid[row][c] = colPools[c].shift();
    colAssigned[c]++;
  }

  // Fill remaining to reach 15 total (5 per row)
  const rowCounts = grid.map(row => row.filter(n => n > 0).length);

  for (let r = 0; r < ROWS; r++) {
    while (rowCounts[r] < NUMS_PER_ROW) {
      // Find a column that still has numbers and this row is empty
      const candidates = colPools
        .map((pool, c) => ({ c, pool }))
        .filter(({ c, pool }) => grid[r][c] === 0 && pool.length > 0);

      if (!candidates.length) break;

      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      grid[r][pick.c] = pick.pool.shift();
      rowCounts[r]++;
    }
  }

  // Sort numbers within each column (ascending)
  for (let c = 0; c < COLS; c++) {
    const colNums = grid.map((row, r) => ({ r, n: row[c] })).filter(x => x.n > 0);
    colNums.sort((a, b) => a.n - b.n);
    // Clear column
    grid.forEach(row => { row[c] = 0; });
    // Re-assign sorted
    colNums.forEach(({ r, n }) => { grid[r][c] = n; });
  }

  return grid;
}

/**
 * Issue tickets to all waiting players before game starts.
 * Host calls this when starting game.
 */
export async function issueTicketsToAllPlayers(gameId) {
  const players = await rtdb.getList(`games/${gameId}/players`);
  if (!players.length) return;

  const writes = {};
  players.forEach(player => {
    const grid   = generateTambolaTicket();
    const marked = Array.from({ length: 3 }, () => Array(9).fill(false));
    writes[`games/${gameId}/tambola/tickets/${player.id}`] = tambolaTicketDoc({
      numbers: grid,
      marked,
      claimed: false,
    });
  });

  await rtdb.batch(writes);
}

/**
 * Host calls next number.
 * Picks random from remaining (1-90), broadcasts via RTDB.
 *
 * @returns {number} the called number
 */
export async function callNextNumber(gameId) {
  const state = await rtdb.get(`games/${gameId}/tambola`);
  const called = state?.calledNumbers || [];

  // All numbers remaining
  const remaining = [];
  for (let i = 1; i <= 90; i++) {
    if (!called.includes(i)) remaining.push(i);
  }

  if (!remaining.length) return null; // all numbers called

  const number = remaining[Math.floor(Math.random() * remaining.length)];
  const updated = [...called, number];

  await rtdb.update(`games/${gameId}/tambola`, {
    calledNumbers:  updated,
    currentNumber:  number,
  });

  return number;
}

/**
 * Player marks a number on their ticket.
 * Client-side only — just updates marked[][] in RTDB.
 */
export async function markNumber(gameId, uid, row, col) {
  await rtdb.update(`games/${gameId}/tambola/tickets/${uid}`, {
    [`marked/${row}/${col}`]: true,
  });
}

/**
 * Player claims a prize.
 * Server-side verifies the claim before awarding.
 *
 * @param {'topLine'|'middleLine'|'bottomLine'|'fullHouse'} prizeType
 * @returns {{ valid: boolean, reason?: string }}
 */
export async function claimPrize(gameId, uid, prizeType) {
  const [state, ticket] = await Promise.all([
    rtdb.get(`games/${gameId}/tambola`),
    rtdb.get(`games/${gameId}/tambola/tickets/${uid}`),
    rtdb.get(`games/${gameId}/players/${uid}`),
  ]);

  if (!state || !ticket) return { valid: false, reason: "not_found" };

  // Check if prize already won
  if (state.prizes?.[prizeType]?.won) {
    return { valid: false, reason: "already_won" };
  }

  const called  = new Set(state.calledNumbers || []);
  const numbers = ticket.numbers || [[], [], []];
  const marked  = ticket.marked  || [[], [], []];

  // Verify claim based on prize type
  let isValid = false;

  if (prizeType === "topLine") {
    isValid = _verifyRow(numbers[0], marked[0], called);
  } else if (prizeType === "middleLine") {
    isValid = _verifyRow(numbers[1], marked[1], called);
  } else if (prizeType === "bottomLine") {
    isValid = _verifyRow(numbers[2], marked[2], called);
  } else if (prizeType === "fullHouse") {
    isValid =
      _verifyRow(numbers[0], marked[0], called) &&
      _verifyRow(numbers[1], marked[1], called) &&
      _verifyRow(numbers[2], marked[2], called);
  }

  if (!isValid) return { valid: false, reason: "invalid_claim" };

  // Award prize
  const player = await rtdb.get(`games/${gameId}/players/${uid}`);
  const points = prizeType === "fullHouse" ? 2000 : 500;

  await rtdb.update(`games/${gameId}/tambola`, {
    [`prizes/${prizeType}/won`]:        true,
    [`prizes/${prizeType}/winnerId`]:   uid,
    [`prizes/${prizeType}/winnerName`]: player?.name || "",
  });

  await updatePlayerScore(gameId, uid, points);

  return { valid: true, points };
}

// Verify all numbers in a row are marked and were called
function _verifyRow(numbers, marked, calledSet) {
  return numbers.every((n, i) => n === 0 || (marked[i] === true && calledSet.has(n)));
}

/**
 * Listen to Tambola game state in real-time.
 * Returns unsubscribe function.
 */
export function listenToTambola(gameId, onUpdate) {
  const r = ref(db, `games/${gameId}/tambola`);
  const handler = (snap) => onUpdate(snap.exists() ? snap.val() : null);
  onValue(r, handler);
  return () => off(r, "value", handler);
}

/**
 * Listen to player's own ticket.
 */
export function listenToTicket(gameId, uid, onUpdate) {
  const r = ref(db, `games/${gameId}/tambola/tickets/${uid}`);
  const handler = (snap) => onUpdate(snap.exists() ? snap.val() : null);
  onValue(r, handler);
  return () => off(r, "value", handler);
}

// ─────────────────────────────────────────────────────────────────────────────
// QUIZ — HOST OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save questions to a quiz game.
 * Called by host before starting.
 */
export async function saveQuizQuestions(gameId, questions) {
  const writes = {};

  questions.forEach((q, i) => {
    writes[`games/${gameId}/quiz/questions/${i}`] = quizQuestionDoc(q);
  });

  writes[`games/${gameId}/quiz/totalQuestions`] = questions.length;

  await rtdb.batch(writes);
}

/**
 * Start the quiz — move to first question.
 * Host calls this after all players joined.
 */
export async function startQuiz(gameId) {
  await updateGameStatus(gameId, "active");
  await showQuestion(gameId, 0);
}

/**
 * Show a specific question to all players.
 * Host calls this to advance to next question.
 */
export async function showQuestion(gameId, questionIndex) {
  await rtdb.update(`games/${gameId}/quiz`, {
    currentQuestion:   questionIndex,
    questionStartedAt: Date.now(),
    showAnswer:        false,
    status:            "question",
  });
}

/**
 * Reveal the answer for current question.
 * Host calls this after timer ends.
 */
export async function revealAnswer(gameId) {
  await rtdb.update(`games/${gameId}/quiz`, {
    showAnswer: true,
    status:     "answer",
  });
}

/**
 * Player submits an answer.
 * Calculates speed-based points and saves.
 *
 * Speed tiers:
 *   0-5 sec  → +50 bonus  = 150 total
 *   5-10 sec → +30 bonus  = 130 total
 *   10-15sec → +10 bonus  = 110 total
 *   15-20sec → +0 bonus   = 100 total
 *   Wrong    → 0 points
 *
 * @returns {{ pointsEarned: number, correct: boolean }}
 */
export async function submitAnswer(gameId, uid, questionIndex, answerIndex) {
  const [quizState, question] = await Promise.all([
    rtdb.get(`games/${gameId}/quiz`),
    rtdb.get(`games/${gameId}/quiz/questions/${questionIndex}`),
  ]);

  if (!quizState || !question) return { pointsEarned: 0, correct: false };

  // Check if already answered
  const existing = await rtdb.get(`games/${gameId}/quiz/answers/${questionIndex}/${uid}`);
  if (existing) return { pointsEarned: existing.pointsEarned, correct: existing.correct };

  const answeredAt = Date.now();
  const startedAt  = quizState.questionStartedAt || answeredAt;
  const timeTaken  = Math.min((answeredAt - startedAt) / 1000, 20); // seconds, max 20

  const isCorrect = answerIndex === question.correctIndex;
  let pointsEarned = 0;

  if (isCorrect) {
    const base  = question.points || 100;
    let   bonus = 0;
    if      (timeTaken <  5) bonus = 50;
    else if (timeTaken < 10) bonus = 30;
    else if (timeTaken < 15) bonus = 10;
    pointsEarned = base + bonus;
  }

  // Save answer
  await rtdb.set(
    `games/${gameId}/quiz/answers/${questionIndex}/${uid}`,
    quizAnswerDoc({
      answer:       answerIndex,
      answeredAt,
      pointsEarned,
      timeTaken,
      correct:      isCorrect,
    })
  );

  // Update player score
  if (pointsEarned > 0) {
    await updatePlayerScore(gameId, uid, pointsEarned);
  }

  return { pointsEarned, correct: isCorrect };
}

/**
 * Listen to quiz state in real-time.
 * Returns unsubscribe function.
 */
export function listenToQuiz(gameId, onUpdate) {
  const r = ref(db, `games/${gameId}/quiz`);
  const handler = (snap) => onUpdate(snap.exists() ? snap.val() : null);
  onValue(r, handler);
  return () => off(r, "value", handler);
}

/**
 * Finish the quiz — set status to finished.
 */
export async function finishQuiz(gameId) {
  await rtdb.update(`games/${gameId}/quiz`, { status: "finished" });
  await updateGameStatus(gameId, "finished");
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME HISTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get past games for a family (last 10).
 */
export async function getFamilyGameHistory(familyId, limit = 10) {
  const games = await rtdb.getList("games");
  return games
    .filter(g => g.familyId === familyId && g.status === "finished")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}