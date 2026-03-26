// hooks/useGame.js
// hooks/useTambola.js
// hooks/useQuiz.js
// ─────────────────────────────────────────────────────────────────────────────
// Three game hooks in one file for easy import.
//
// useGame      — lobby, join, players list, leaderboard (shared by both games)
// useTambola   — ticket, number tracking, prize claiming
// useQuiz      — question display, answer submit, timer, score
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createGame, getGame, findGameByCode,
  joinGame, updateGameStatus,
  listenToGame, listenToLeaderboard,
  // Tambola
  issueTicketsToAllPlayers, callNextNumber,
  markNumber, claimPrize,
  listenToTambola, listenToTicket,
  // Quiz
  saveQuizQuestions, startQuiz,
  showQuestion, revealAnswer,
  submitAnswer, finishQuiz,
  listenToQuiz,
} from "../db/gameDb";

// ═════════════════════════════════════════════════════════════════════════════
// useGame — shared lobby + leaderboard hook
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Shared hook for game lobby and real-time leaderboard.
 * Used by both Tambola and Quiz host/player screens.
 *
 * @param {string} gameId
 * @param {string} uid        - current user's uid
 * @param {object} userInfo   - { name, familyName, photoURL }
 */
export function useGame(gameId, uid, userInfo = {}) {
  const [game,       setGame]       = useState(null);
  const [players,    setPlayers]    = useState([]);  // sorted by score
  const [myRank,     setMyRank]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [joining,    setJoining]    = useState(false);
  const [error,      setError]      = useState("");

  // ── Load game + subscribe ──────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) { setLoading(false); return; }

    // One-time load
    getGame(gameId)
      .then(data => { setGame(data); setLoading(false); })
      .catch(e  => { setError(e.message); setLoading(false); });

    // Real-time game status
    const unsubGame = listenToGame(gameId, (data) => {
      if (data) setGame(data);
    });

    // Real-time leaderboard
    const unsubLb = listenToLeaderboard(gameId, ({ players: sorted }) => {
      setPlayers(sorted);
      if (uid) {
        const me = sorted.find(p => p.uid === uid);
        setMyRank(me?.rank ?? null);
      }
    });

    return () => { unsubGame(); unsubLb(); };
  }, [gameId, uid]);

  // ── Join game ──────────────────────────────────────────────────────────────
  const join = useCallback(async () => {
    if (!gameId || !uid) return;
    setJoining(true);
    try {
      await joinGame(gameId, uid, {
        name:       userInfo.name       || "",
        familyName: userInfo.familyName || "",
        photoURL:   userInfo.photoURL   || "",
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setJoining(false);
    }
  }, [gameId, uid, userInfo]);

  // ── Find game by code (lobby entry) ───────────────────────────────────────
  const findByCode = useCallback(async (code) => {
    setError("");
    try {
      const result = await findGameByCode(code);
      if (!result) { setError("Game code invalid છે"); return null; }
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    }
  }, []);

  // ── Host: create game ──────────────────────────────────────────────────────
  const create = useCallback(async ({ type, familyId, hostName, maxPlayers }) => {
    setError("");
    try {
      const result = await createGame({
        type,
        familyId,
        hostId:   uid,
        hostName: hostName || userInfo.name || "",
        maxPlayers: maxPlayers || 100,
      });
      return result; // { gameId, gameCode }
    } catch (e) {
      setError(e.message);
      throw e;
    }
  }, [uid, userInfo]);

  // ── Host: start game ───────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!gameId) return;
    await updateGameStatus(gameId, "active");
  }, [gameId]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const isHost     = game?.hostId === uid;
  const isWaiting  = game?.status === "waiting";
  const isActive   = game?.status === "active";
  const isFinished = game?.status === "finished";
  const myPlayer   = players.find(p => p.uid === uid) || null;
  const myScore    = myPlayer?.score || 0;

  return {
    game,
    players,
    myPlayer,
    myScore,
    myRank,
    loading,
    joining,
    error,
    isHost,
    isWaiting,
    isActive,
    isFinished,
    playerCount: players.length,
    gameCode:    game?.gameCode || "",
    gameType:    game?.type     || "",
    join,
    findByCode,
    create,
    startGame,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// useTambola — Tambola game state for player + host
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Tambola game hook.
 *
 * @param {string} gameId
 * @param {string} uid     - current user's uid
 * @param {boolean} isHost - true for host screen
 */
export function useTambola(gameId, uid, isHost = false) {
  const [tambolaState, setTambolaState] = useState(null);
  // { calledNumbers[], currentNumber, prizes{} }

  const [ticket,    setTicket]    = useState(null);
  // { numbers[][], marked[][], claimed }

  const [calling,   setCalling]   = useState(false); // host calling next number
  const [claiming,  setClaiming]  = useState(false); // player claiming prize
  const [claimResult, setClaimResult] = useState(null);
  // { valid, points, reason } after claim

  const [error,     setError]     = useState("");

  // ── Subscribe to tambola state ─────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;

    const unsubTambola = listenToTambola(gameId, (state) => {
      setTambolaState(state);
    });

    // Subscribe to player's own ticket
    const unsubTicket = uid
      ? listenToTicket(gameId, uid, (t) => { if (t) setTicket(t); })
      : () => {};

    return () => { unsubTambola(); unsubTicket(); };
  }, [gameId, uid]);

  // ── Host: call next number ─────────────────────────────────────────────────
  const callNumber = useCallback(async () => {
    if (!isHost || !gameId) return;
    setCalling(true);
    setError("");
    try {
      const number = await callNextNumber(gameId);
      return number;
    } catch (e) {
      setError(e.message);
    } finally {
      setCalling(false);
    }
  }, [gameId, isHost]);

  // ── Host: start game + issue tickets ──────────────────────────────────────
  const startTambola = useCallback(async () => {
    if (!isHost || !gameId) return;
    try {
      await issueTicketsToAllPlayers(gameId);
      await updateGameStatus(gameId, "active");
    } catch (e) {
      setError(e.message);
    }
  }, [gameId, isHost]);

  // ── Player: mark a number on ticket ───────────────────────────────────────
  const tapNumber = useCallback(async (row, col) => {
    if (!gameId || !uid || !ticket) return;

    const num = ticket.numbers?.[row]?.[col];
    if (!num) return; // blank cell

    const called = tambolaState?.calledNumbers || [];
    if (!called.includes(num)) return; // number not called yet

    // Optimistic local update
    setTicket(prev => {
      if (!prev) return prev;
      const newMarked = prev.marked.map((r, ri) =>
        r.map((v, ci) => (ri === row && ci === col ? true : v))
      );
      return { ...prev, marked: newMarked };
    });

    await markNumber(gameId, uid, row, col).catch(console.warn);
  }, [gameId, uid, ticket, tambolaState]);

  // ── Player: claim a prize ──────────────────────────────────────────────────
  const claim = useCallback(async (prizeType) => {
    if (!gameId || !uid) return;
    setClaiming(true);
    setClaimResult(null);
    setError("");
    try {
      const result = await claimPrize(gameId, uid, prizeType);
      setClaimResult(result);
      return result;
    } catch (e) {
      setError(e.message);
      return { valid: false, reason: "error" };
    } finally {
      setClaiming(false);
    }
  }, [gameId, uid]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const calledNumbers  = tambolaState?.calledNumbers || [];
  const currentNumber  = tambolaState?.currentNumber || null;
  const prizes         = tambolaState?.prizes        || {};
  const allPrizesWon   = prizes.fullHouse?.won       || false;

  // Check which numbers on ticket are called (for auto-highlight)
  const isNumberCalled = useCallback((num) => calledNumbers.includes(num), [calledNumbers]);

  // Check if a prize row is complete (for claim button activation)
  const canClaimTopLine    = _isRowComplete(ticket, 0, calledNumbers);
  const canClaimMiddleLine = _isRowComplete(ticket, 1, calledNumbers);
  const canClaimBottomLine = _isRowComplete(ticket, 2, calledNumbers);
  const canClaimFullHouse  = canClaimTopLine && canClaimMiddleLine && canClaimBottomLine;

  return {
    // State
    tambolaState,
    ticket,
    calledNumbers,
    currentNumber,
    prizes,
    allPrizesWon,

    // UI state
    calling,
    claiming,
    claimResult,
    error,

    // Host actions
    callNumber,
    startTambola,

    // Player actions
    tapNumber,
    claim,
    isNumberCalled,

    // Claim eligibility
    canClaimTopLine:    canClaimTopLine    && !prizes.topLine?.won,
    canClaimMiddleLine: canClaimMiddleLine && !prizes.middleLine?.won,
    canClaimBottomLine: canClaimBottomLine && !prizes.bottomLine?.won,
    canClaimFullHouse:  canClaimFullHouse  && !prizes.fullHouse?.won,
  };
}

// Check if all numbers in a row are called
function _isRowComplete(ticket, rowIndex, calledNumbers) {
  if (!ticket?.numbers?.[rowIndex]) return false;
  const called = new Set(calledNumbers);
  return ticket.numbers[rowIndex].every(n => n === 0 || called.has(n));
}

// ═════════════════════════════════════════════════════════════════════════════
// useQuiz — Kahoot-style quiz state for player + host
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Quiz game hook.
 *
 * @param {string} gameId
 * @param {string} uid
 * @param {boolean} isHost
 */
export function useQuiz(gameId, uid, isHost = false) {
  const [quizState,   setQuizState]   = useState(null);
  // { currentQuestion, questionStartedAt, showAnswer, status, totalQuestions }

  const [questions,   setQuestions]   = useState([]);
  const [myAnswers,   setMyAnswers]   = useState({});
  // { [questionIndex]: { answer, pointsEarned, correct } }

  const [timeLeft,    setTimeLeft]    = useState(20);
  const [timerActive, setTimerActive] = useState(false);

  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");

  const timerRef = useRef(null);

  // ── Subscribe to quiz state ────────────────────────────────────────────────
  useEffect(() => {
    if (!gameId) return;

    const unsub = listenToQuiz(gameId, (state) => {
      setQuizState(state);

      if (state?.status === "question" && state?.questionStartedAt) {
        // Sync timer with server timestamp
        const elapsed = Math.floor((Date.now() - state.questionStartedAt) / 1000);
        const remaining = Math.max(0, 20 - elapsed);
        setTimeLeft(remaining);
        setTimerActive(remaining > 0);
      }

      if (state?.status === "answer") {
        setTimerActive(false);
        setTimeLeft(0);
      }
    });

    return () => unsub();
  }, [gameId]);

  // ── Local countdown timer ──────────────────────────────────────────────────
  useEffect(() => {
    if (!timerActive) {
      clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [timerActive]);

  // ── Load questions (host preloads, players read from RTDB) ─────────────────
  useEffect(() => {
    if (!gameId || !quizState) return;
    const total = quizState.totalQuestions || 0;
    if (!total || questions.length === total) return;

    // Load all questions once
    const promises = Array.from({ length: total }, (_, i) =>
      import("../db/rtdb").then(({ rtdb }) =>
        rtdb.get(`games/${gameId}/quiz/questions/${i}`)
      )
    );

    Promise.all(promises)
      .then(qs => setQuestions(qs.filter(Boolean)))
      .catch(console.warn);
  }, [gameId, quizState?.totalQuestions]);

  // ── Host: setup quiz with questions ───────────────────────────────────────
  const setupQuiz = useCallback(async (questionList) => {
    if (!isHost || !gameId) return;
    try {
      await saveQuizQuestions(gameId, questionList);
      setQuestions(questionList);
    } catch (e) {
      setError(e.message);
    }
  }, [gameId, isHost]);

  // ── Host: start quiz ───────────────────────────────────────────────────────
  const start = useCallback(async () => {
    if (!isHost || !gameId) return;
    try { await startQuiz(gameId); }
    catch (e) { setError(e.message); }
  }, [gameId, isHost]);

  // ── Host: next question ────────────────────────────────────────────────────
  const nextQuestion = useCallback(async () => {
    if (!isHost || !gameId || !quizState) return;
    const next = (quizState.currentQuestion || 0) + 1;
    if (next >= (quizState.totalQuestions || 0)) {
      await finishQuiz(gameId);
    } else {
      await showQuestion(gameId, next);
    }
  }, [gameId, isHost, quizState]);

  // ── Host: reveal answer ────────────────────────────────────────────────────
  const reveal = useCallback(async () => {
    if (!isHost || !gameId) return;
    try { await revealAnswer(gameId); }
    catch (e) { setError(e.message); }
  }, [gameId, isHost]);

  // ── Player: submit answer ──────────────────────────────────────────────────
  const submit = useCallback(async (answerIndex) => {
    if (!gameId || !uid || submitting) return;
    const qIdx = quizState?.currentQuestion ?? 0;

    // Already answered this question?
    if (myAnswers[qIdx] !== undefined) return;

    setSubmitting(true);
    setError("");
    try {
      const result = await submitAnswer(gameId, uid, qIdx, answerIndex);

      // Save locally
      setMyAnswers(prev => ({ ...prev, [qIdx]: { answer: answerIndex, ...result } }));

      return result;
    } catch (e) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }, [gameId, uid, quizState, myAnswers, submitting]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const currentQIdx    = quizState?.currentQuestion ?? 0;
  const currentQ       = questions[currentQIdx]   || null;
  const showAnswer     = quizState?.showAnswer    || false;
  const quizStatus     = quizState?.status        || "waiting";
  const totalQuestions = quizState?.totalQuestions || 0;
  const isLastQuestion = currentQIdx >= totalQuestions - 1;
  const myAnswerForQ   = myAnswers[currentQIdx];
  const hasAnswered    = myAnswerForQ !== undefined;
  const isCorrect      = myAnswerForQ?.correct || false;

  // Timer color
  const timerColor = timeLeft > 10 ? "safe" : timeLeft > 5 ? "warning" : "danger";
  // "safe" → blue, "warning" → orange, "danger" → red

  // My total score from answers
  const myTotalScore = Object.values(myAnswers)
    .reduce((sum, a) => sum + (a.pointsEarned || 0), 0);

  return {
    // State
    quizState,
    questions,
    currentQ,
    currentQIdx,
    totalQuestions,
    showAnswer,
    quizStatus,
    isLastQuestion,

    // Timer
    timeLeft,
    timerActive,
    timerColor,

    // My answer state
    myAnswers,
    myAnswerForQ,
    hasAnswered,
    isCorrect,
    myTotalScore,

    // UI state
    submitting,
    error,

    // Host actions
    setupQuiz,
    start,
    nextQuestion,
    reveal,

    // Player actions
    submit,
  };
}