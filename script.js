/* ============================================
   QuizArena — Player Game Engine
   ============================================ */

let questions = [];
let currentTest = null;
let currentRound = null;
let username = "";
let timerInterval = null;
let hasSubmitted = false;
let hasPlayedRounds = new Set();
let leaderboardListener = null;
let globalListener = null;

// ========== LOADING ==========

async function loadQuestions() {
  const res = await fetch("data/questions.json");
  questions = await res.json();
}

// ========== SCREEN MANAGEMENT ==========

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ========== LOGIN ==========

function startGame() {
  username = document.getElementById("username").value.trim();
  if (!username) { shakeInput(); return; }

  showScreen("waiting-screen");
  document.getElementById("player-name-display").textContent = `Playing as ${username}`;

  // Show sidebar toggle
  ensureSidebarToggle();

  updateGlobalLeaderboard();
  attachGlobalLeaderboardListener();
  watchRounds();
}

function shakeInput() {
  const inp = document.getElementById("username");
  inp.style.animation = "none";
  inp.offsetHeight; // reflow
  inp.style.animation = "shake 0.4s ease";
  inp.focus();
}

// ========== ROUND WATCHER ==========

function watchRounds() {
  db.ref("currentRound").on("value", async (snapshot) => {
    const data = snapshot.val();

    if (!data || !data.id || !data.testId) {
      currentRound = null;
      clearInterval(timerInterval);
      if (document.getElementById("game-screen").classList.contains("active")) {
        showScreen("waiting-screen");
      }
      // Only reset to default waiting if we're on waiting screen
      const ws = document.getElementById("waiting-screen");
      if (ws.classList.contains("active")) {
        resetWaitingMessage();
      }
      return;
    }

    if (!questions.length) await loadQuestions();
    const testObj = questions.find(t => t.id === data.testId);
    if (!testObj) return;

    const now = Date.now();
    const endTime = data.startTime + data.duration * 1000;

    if (now > endTime) {
      currentRound = data;
      currentTest = testObj;
      showScreen("waiting-screen");
      document.querySelector("#waiting-screen .waiting-card h2").textContent = "Round ended!";
      document.querySelector("#waiting-screen .waiting-sub").textContent = "Wait for the teacher to start the next round.";
      return;
    }

    if (hasPlayedRounds.has(String(data.id))) {
      currentRound = data;
      currentTest = testObj;
      showScreen("results-screen");
      document.getElementById("score-detail").textContent = `${username}, you already played this round.`;
      fetchLeaderboard();
      return;
    }

    currentRound = data;
    currentTest = testObj;
    hasSubmitted = false;
    showScreen("game-screen");
    renderTest(testObj);
    startCountdown(data.startTime, data.duration);
    fetchLeaderboard();
  });
}

function resetWaitingMessage() {
  const card = document.querySelector("#waiting-screen .waiting-card");
  if (!card) return;
  card.querySelector("h2").textContent = "Waiting for the teacher…";
  card.querySelector(".waiting-sub").textContent = "The next round will appear here automatically.";
}

// ========== COUNTDOWN ==========

function startCountdown(startTime, durationSec) {
  clearInterval(timerInterval);
  const fill = document.getElementById("timer-fill");
  const text = document.getElementById("timer-text");
  const endTime = startTime + durationSec * 1000;
  const totalMs = durationSec * 1000;

  function update() {
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    const secs = Math.ceil(remaining / 1000);
    const pct = (remaining / totalMs) * 100;

    fill.style.width = pct + "%";
    fill.classList.toggle("urgent", pct < 20);
    text.textContent = `${secs}s remaining`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      text.textContent = "Time's up!";
      autoSubmitIfNotYet();
    }
  }
  update();
  timerInterval = setInterval(update, 250);
}

// ========== RENDER QUESTIONS ==========

function renderTest(test) {
  const body = document.getElementById("game-body");
  const title = document.getElementById("test-title");
  const badge = document.getElementById("test-type-badge");

  title.textContent = test.title;

  const typeLabels = {
    multiple_choice: "Multiple Choice",
    true_false: "True / False",
    fill_in: "Fill in the Blanks"
  };
  badge.textContent = typeLabels[test.type] || test.type;

  body.innerHTML = "";

  if (test.type === "fill_in") {
    renderFillIn(test, body);
  } else if (test.type === "multiple_choice") {
    renderMultipleChoice(test, body);
  } else if (test.type === "true_false") {
    renderTrueFalse(test, body);
  }

  updateProgressInfo();
}

// ---------- Fill-In ----------

function renderFillIn(test, container) {
  const card = document.createElement("div");
  card.className = "question-card";

  const parts = test.text.split("___");
  let html = '<div class="fill-in-passage">';
  for (let i = 0; i < parts.length; i++) {
    html += escapeHtml(parts[i]);
    if (i < test.blanks.length) {
      const blank = test.blanks[i];
      html += `<select class="blank-select" data-index="${i}">`;
      html += `<option value="">(select)</option>`;
      blank.options.forEach(opt => {
        html += `<option value="${escapeHtml(opt)}">${escapeHtml(opt)}</option>`;
      });
      html += `</select>`;
    }
  }
  html += '</div>';
  card.innerHTML = html;
  container.appendChild(card);

  // Track changes for progress
  card.querySelectorAll(".blank-select").forEach(sel => {
    sel.addEventListener("change", updateProgressInfo);
  });
}

// ---------- Multiple Choice ----------

function renderMultipleChoice(test, container) {
  const letters = ["A", "B", "C", "D", "E", "F"];

  test.questions.forEach((q, qi) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.dataset.qindex = qi;

    let html = `<div class="question-number">Question ${qi + 1}</div>`;
    html += `<div class="question-text">${escapeHtml(q.question)}</div>`;
    html += `<div class="options-grid">`;

    q.options.forEach((opt, oi) => {
      html += `
        <button class="option-btn" data-q="${qi}" data-o="${oi}" type="button">
          <span class="option-letter">${letters[oi] || oi}</span>
          <span>${escapeHtml(opt)}</span>
        </button>`;
    });

    html += `</div>`;
    card.innerHTML = html;
    container.appendChild(card);

    // Click handlers
    card.querySelectorAll(".option-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        updateProgressInfo();
      });
    });
  });
}

// ---------- True / False ----------

function renderTrueFalse(test, container) {
  test.questions.forEach((q, qi) => {
    const card = document.createElement("div");
    card.className = "question-card";
    card.dataset.qindex = qi;

    let html = `<div class="question-number">Statement ${qi + 1}</div>`;
    html += `<div class="question-text">${escapeHtml(q.statement)}</div>`;
    html += `<div class="tf-options">`;
    html += `<button class="tf-btn sel-true" data-q="${qi}" data-val="true" type="button">True</button>`;
    html += `<button class="tf-btn sel-false" data-q="${qi}" data-val="false" type="button">False</button>`;
    html += `</div>`;

    card.innerHTML = html;
    container.appendChild(card);

    card.querySelectorAll(".tf-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        card.querySelectorAll(".tf-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        updateProgressInfo();
      });
    });
  });
}

// ========== PROGRESS TRACKER ==========

function updateProgressInfo() {
  if (!currentTest) return;
  const answered = getAnsweredCount();
  const total = getTotalQuestions();
  document.getElementById("progress-info").textContent = `${answered} of ${total} answered`;
}

function getAnsweredCount() {
  if (!currentTest) return 0;
  if (currentTest.type === "fill_in") {
    return document.querySelectorAll(".blank-select").length
      ? [...document.querySelectorAll(".blank-select")].filter(s => s.value !== "").length
      : 0;
  }
  if (currentTest.type === "multiple_choice") {
    return document.querySelectorAll(".options-grid .option-btn.selected").length;
  }
  if (currentTest.type === "true_false") {
    const cards = document.querySelectorAll(".question-card");
    let count = 0;
    cards.forEach(c => { if (c.querySelector(".tf-btn.selected")) count++; });
    return count;
  }
  return 0;
}

function getTotalQuestions() {
  if (!currentTest) return 0;
  if (currentTest.type === "fill_in") return currentTest.blanks.length;
  return currentTest.questions.length;
}

// ========== SUBMIT & GRADE ==========

function submitAnswers() {
  if (hasSubmitted) return;
  hasSubmitted = true;
  clearInterval(timerInterval);

  let score = 0;
  const total = getTotalQuestions();
  const reviewItems = [];

  if (currentTest.type === "fill_in") {
    score = gradeFillIn(reviewItems);
  } else if (currentTest.type === "multiple_choice") {
    score = gradeMultipleChoice(reviewItems);
  } else if (currentTest.type === "true_false") {
    score = gradeTrueFalse(reviewItems);
  }

  // Save to Firebase
  const now = new Date();
  const result = {
    username,
    score,
    total,
    date: now.toISOString().split("T")[0],
    time: now.toLocaleTimeString(),
    testId: currentTest.id,
    roundId: String(currentRound.id)
  };
  db.ref("results").push(result);
  hasPlayedRounds.add(String(currentRound.id));

  // Show results
  showResults(score, total, reviewItems);
  updateGlobalLeaderboard();
}

function autoSubmitIfNotYet() {
  if (!hasSubmitted) submitAnswers();
}

// ---------- Grading Functions ----------

function gradeFillIn(reviewItems) {
  let score = 0;
  const blanks = currentTest.blanks;

  blanks.forEach((blank, i) => {
    const sel = document.querySelector(`.blank-select[data-index="${i}"]`);
    const userAns = sel ? sel.value : "";
    const validAnswers = Array.isArray(blank.answer) ? blank.answer : [blank.answer];
    const isCorrect = validAnswers.some(a => (a || "").toLowerCase() === (userAns || "").toLowerCase());
    if (isCorrect) score++;

    reviewItems.push({
      type: "fill_in",
      index: i,
      userAnswer: userAns || "(blank)",
      correctAnswers: validAnswers,
      isCorrect,
      explanation: blank.explanation || ""
    });
  });
  return score;
}

function gradeMultipleChoice(reviewItems) {
  let score = 0;
  currentTest.questions.forEach((q, qi) => {
    const selected = document.querySelector(`.option-btn.selected[data-q="${qi}"]`);
    const userIdx = selected ? parseInt(selected.dataset.o) : -1;
    const isCorrect = userIdx === q.answer;
    if (isCorrect) score++;

    reviewItems.push({
      type: "mc",
      question: q.question,
      userAnswer: userIdx >= 0 ? q.options[userIdx] : "(no answer)",
      correctAnswer: q.options[q.answer],
      isCorrect,
      explanation: q.explanation || ""
    });
  });
  return score;
}

function gradeTrueFalse(reviewItems) {
  let score = 0;
  currentTest.questions.forEach((q, qi) => {
    const selected = document.querySelector(`.question-card[data-qindex="${qi}"] .tf-btn.selected`);
    const userVal = selected ? selected.dataset.val === "true" : null;
    const isCorrect = userVal === q.answer;
    if (isCorrect) score++;

    reviewItems.push({
      type: "tf",
      statement: q.statement,
      userAnswer: userVal === null ? "(no answer)" : (userVal ? "True" : "False"),
      correctAnswer: q.answer ? "True" : "False",
      isCorrect,
      explanation: q.explanation || ""
    });
  });
  return score;
}

// ========== SHOW RESULTS ==========

function showResults(score, total, reviewItems) {
  showScreen("results-screen");

  // Animate score ring
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const circle = document.getElementById("score-circle");
  const circumference = 2 * Math.PI * 54; // r=54
  setTimeout(() => {
    circle.style.strokeDashoffset = circumference - (circumference * pct / 100);
    if (pct >= 70) circle.style.stroke = "var(--green)";
    else if (pct >= 40) circle.style.stroke = "var(--orange)";
    else circle.style.stroke = "var(--red)";
  }, 100);

  document.getElementById("score-number").textContent = pct + "%";
  document.getElementById("score-detail").textContent = `${username}: ${score} out of ${total} correct`;

  // Build review
  const reviewBody = document.getElementById("review-body");
  reviewBody.innerHTML = "";

  if (currentTest.type === "fill_in") {
    buildFillInReview(reviewBody, reviewItems);
  } else {
    reviewItems.forEach((item, i) => {
      const card = document.createElement("div");
      card.className = `review-card ${item.isCorrect ? "correct" : "incorrect"}`;

      let inner = `<div class="review-q">${i + 1}. ${escapeHtml(item.question || item.statement)}</div>`;
      inner += `<div class="review-answer">`;
      if (item.isCorrect) {
        inner += `<span class="correct-ans">✓ ${escapeHtml(item.userAnswer)}</span>`;
      } else {
        inner += `<span class="wrong-ans">✗ ${escapeHtml(item.userAnswer)}</span>`;
        inner += `<span class="correct-ans">→ ${escapeHtml(item.correctAnswer)}</span>`;
      }
      inner += `</div>`;
      if (item.explanation) {
        inner += `<div class="review-explanation">${escapeHtml(item.explanation)}</div>`;
      }

      card.innerHTML = inner;
      reviewBody.appendChild(card);
    });
  }

  fetchLeaderboard();
}

function buildFillInReview(container, reviewItems) {
  const parts = currentTest.text.split("___");
  const card = document.createElement("div");
  card.className = "review-card correct";
  card.style.borderLeft = "none";

  let html = '<div class="review-passage">';
  for (let i = 0; i < parts.length; i++) {
    html += escapeHtml(parts[i]);
    if (i < reviewItems.length) {
      const item = reviewItems[i];
      const cls = item.isCorrect ? "correct" : "incorrect";
      const correctStr = item.correctAnswers.join(" / ");
      const tipParts = [];
      if (!item.isCorrect) tipParts.push(`Correct: ${correctStr}`);
      if (item.explanation) tipParts.push(item.explanation);
      const tip = tipParts.join(" — ");

      html += `<span class="answer-inline ${cls}">${escapeHtml(item.userAnswer)}`;
      if (tip) html += `<span class="tooltip">${escapeHtml(tip)}</span>`;
      html += `</span>`;
    }
  }
  html += '</div>';
  card.innerHTML = html;
  container.appendChild(card);
}

// ========== LEADERBOARD ==========

function fetchLeaderboard() {
  const leaderboardEl = document.getElementById("leaderboard");
  if (leaderboardListener) leaderboardListener.off();

  if (!currentRound) {
    leaderboardEl.innerHTML = '<li><span class="lb-name">No active round</span></li>';
    return;
  }

  const ref = db.ref("results").orderByChild("roundId").equalTo(String(currentRound.id));
  leaderboardListener = ref;
  let results = [];

  ref.on("child_added", snap => {
    results.push(snap.val());
    renderLeaderboard(results);
  });
  ref.on("child_removed", () => {
    results = [];
    renderLeaderboard(results);
  });
}

function renderLeaderboard(results) {
  const el = document.getElementById("leaderboard");
  if (!results.length) {
    el.innerHTML = '<li><span class="lb-name" style="color:var(--text-dim)">Waiting for results…</span></li>';
    return;
  }

  const total = results[0]?.total || getTotalQuestions();
  results.sort((a, b) => b.score - a.score || a.time.localeCompare(b.time));

  el.innerHTML = results.map(r => {
    const pct = total > 0 ? ((r.score / total) * 100).toFixed(0) : 0;
    const isYou = r.username.toLowerCase() === username.toLowerCase();
    return `<li ${isYou ? 'class="highlighted"' : ''}>
      <span class="lb-name">${escapeHtml(r.username)}</span>
      <span class="lb-score">${r.score}/${total}</span>
      <span class="lb-pct">(${pct}%)</span>
    </li>`;
  }).join("");
}

// ========== GLOBAL LEADERBOARD ==========

function updateGlobalLeaderboard() {
  const el = document.getElementById("global-leaderboard");

  db.ref("results").once("value", snap => {
    const results = snap.val();
    if (!results) {
      el.innerHTML = '<li class="empty-state">No results yet</li>';
      return;
    }

    const stats = {};
    for (const key in results) {
      const r = results[key];
      if (!stats[r.username]) stats[r.username] = { correct: 0, total: 0, rounds: new Set() };
      stats[r.username].correct += r.score;
      stats[r.username].total += r.total || 1;
      stats[r.username].rounds.add(r.roundId);
    }

    const table = Object.entries(stats)
      .map(([name, d]) => ({
        name,
        correct: d.correct,
        total: d.total,
        pct: ((d.correct / d.total) * 100).toFixed(1),
        rounds: d.rounds.size
      }))
      .sort((a, b) => b.correct - a.correct || b.pct - a.pct);

    el.innerHTML = table.map(u => {
      const isYou = username && u.name.toLowerCase() === username.toLowerCase();
      return `<li ${isYou ? 'class="highlighted"' : ''}>
        <span><strong>${escapeHtml(u.name)}</strong> — ${u.correct}/${u.total} (${u.pct}%) · ${u.rounds} rnd${u.rounds !== 1 ? 's' : ''}</span>
      </li>`;
    }).join("");
  });
}

function attachGlobalLeaderboardListener() {
  if (globalListener) globalListener.off();
  globalListener = db.ref("results");
  globalListener.on("child_added", updateGlobalLeaderboard);
  globalListener.on("child_removed", updateGlobalLeaderboard);
}

// ========== SIDEBAR TOGGLE ==========

function ensureSidebarToggle() {
  if (document.getElementById("sidebar-toggle-btn")) return;
  const btn = document.createElement("button");
  btn.id = "sidebar-toggle-btn";
  btn.className = "sidebar-toggle visible";
  btn.textContent = "🏆";
  btn.title = "Toggle Rankings";
  btn.addEventListener("click", () => {
    document.getElementById("global-sidebar").classList.toggle("open");
  });
  document.body.appendChild(btn);
}

// ========== RESTART ==========

function restartGame() {
  // Reset score ring
  const circle = document.getElementById("score-circle");
  circle.style.strokeDashoffset = 2 * Math.PI * 54;
  circle.style.stroke = "var(--accent)";

  showScreen("waiting-screen");
  resetWaitingMessage();
}

// ========== UTILITY ==========

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ========== INIT ==========

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("username").addEventListener("keydown", e => { if (e.key === "Enter") startGame(); });
document.getElementById("submit-btn").addEventListener("click", submitAnswers);
document.getElementById("restart-btn").addEventListener("click", restartGame);

// Add shake animation to stylesheet
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `@keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-6px)} 40%,80%{transform:translateX(6px)} }`;
document.head.appendChild(shakeStyle);

loadQuestions();
