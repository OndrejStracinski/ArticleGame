let texts = [];
let currentText = null;
let username = "";
let timerInterval = null;

async function loadTexts() {
  const res = await fetch("data/texts.json");
  texts = await res.json();
}

let currentRound = null;

let hasPlayedRounds = new Set();

function startGame() {
  username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter your name!");
    return;
  }

  document.getElementById("login").style.display = "none";
  document.getElementById("waiting").style.display = "block";

  document.getElementById("global-sidebar").style.display = "block";
  updateGlobalLeaderboardForPlayers();
  attachGlobalLeaderboardListener();

  // Watch current round from Firebase
  db.ref("currentRound").on("value", async (snapshot) => {
    const data = snapshot.val();

    if (!data || !data.id || !data.textId) {
      // No active round
      currentRound = null;
      document.getElementById("game").style.display = "none";
      document.getElementById("results").style.display = "none";
      document.getElementById("waiting").style.display = "block";
      clearInterval(timerInterval);
      document.getElementById("timer").textContent = "";
      return;
    }

    if (!texts.length) await loadTexts();
    const textObj = texts.find((t) => t.id === data.textId);
    if (!textObj) return;

    const now = Date.now();
    const endTime = data.startTime + data.duration * 1000;
    if (now > endTime) {
      currentRound = null;
      document.getElementById("game").style.display = "none";
      document.getElementById("results").style.display = "none";
      document.getElementById("waiting").style.display = "block";
      document.getElementById("waiting").innerHTML = `
        <h2>Round ended!</h2>
        <p>Wait for the teacher to start the next round.</p>`;
      return;
    }

    if (hasPlayedRounds.has(String(data.id))) {
      currentRound = data;
      document.getElementById("game").style.display = "none";
      document.getElementById("results").style.display = "block";
      document.getElementById("waiting").style.display = "none";
      document.getElementById("score").textContent =
        `${username}, you already played this round! Wait for the next one.`;
      fetchLeaderboard();
      return;
    }

    currentRound = data;
    currentText = textObj;
    document.getElementById("waiting").style.display = "none";
    document.getElementById("results").style.display = "none";
    document.getElementById("game").style.display = "block";
    showText(currentText);
    fetchLeaderboard();
    startCountdown(data.startTime, data.duration);
  });


}

function startCountdown(startTime, durationSec) {
  clearInterval(timerInterval);

  const timerEl = document.getElementById("timer");
  const endTime = startTime + durationSec * 1000;

  function updateTimer() {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));

    timerEl.textContent = `⏰ Time left: ${remaining}s`;

    if (remaining <= 0) {
      clearInterval(timerInterval);
      timerEl.textContent = "⏳ Time's up!";
      autoSubmitIfNotYet();
    }
  }

  updateTimer();
  timerInterval = setInterval(updateTimer, 500);
}



function showText(textObj) {
  document.getElementById("title").textContent = textObj.title;
  const parts = textObj.text.split("___");
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    html += parts[i];
    if (i < textObj.answers.length) html += createDropdown(i);
  }
  document.getElementById("text").innerHTML = html;
}


function showRandomText() {
  currentText = texts[Math.floor(Math.random() * texts.length)];
  document.getElementById("title").textContent = currentText.title;

  let parts = currentText.text.split("___");
  let html = "";
  for (let i = 0; i < parts.length; i++) {
    html += parts[i];
    if (i < currentText.answers.length) {
      html += createDropdown(i);
    }
  }
  document.getElementById("text").innerHTML = html;
}

function createDropdown(index) {
  // Define possible article choices
  const options = ["—", "a", "an", "the"];
  let html = `<select class="blank" id="blank-${index}">`;
  html += `<option value="">(select)</option>`;
  options.forEach(opt => {
    html += `<option value="${opt}">${opt}</option>`;
  });
  html += `</select>`;
  return html;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function submitAnswers() {
  hasSubmitted = true;
  clearInterval(timerInterval);
  let score = 0;
  let displayHtml = "";
  const parts = currentText.text.split("___");

  // build colored, tooltip’d answer text
  for (let i = 0; i < currentText.answers.length; i++) {
    const userAns = (document.getElementById(`blank-${i}`).value || "").trim();
    const validAnswers = Array.isArray(currentText.answers[i])
      ? currentText.answers[i]
      : [currentText.answers[i]];

    const isCorrect = validAnswers.some(
      opt => (opt || "").toLowerCase() === userAns.toLowerCase()
    );
    if (isCorrect) score++;

    // tooltip text = Correct answers + optional explanation
    const correctList = validAnswers.join(" / ");
    const explanation =
      currentText.explanations && currentText.explanations[i]
        ? `\nWhy: ${currentText.explanations[i]}`
        : "";

    const tooltipText = `Correct: ${correctList}${explanation}`;

    const colorClass = isCorrect ? "correct" : "incorrect";
    // use data-tip to avoid native title tooltips & quoting issues
    const safeTip = escapeHtml(tooltipText);
    const safeUser = escapeHtml(userAns || "(blank)");

    const answerHtml =
      `<span class="${colorClass}" data-tip="${safeTip}">${safeUser}</span>`;

    displayHtml += parts[i] + answerHtml;
  }

  // tail fragment after last blank
  displayHtml += parts[parts.length - 1];

  // save result
  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toLocaleTimeString();

  const result = {
    username,
    score,
    date,
    time,
    textId: currentText.id,
    roundId: String(currentRound.id)
  };

  db.ref("results").push(result);

  hasPlayedRounds.add(String(currentRound.id));

  // show review + leaderboard
  document.getElementById("game").style.display = "none";
  document.getElementById("results").style.display = "block";
  document.getElementById("score").textContent =
    `${username}, your score: ${score}/${currentText.answers.length}`;

  // clear any previous review block
  const oldReview = document.querySelector(".answer-review");
  if (oldReview) oldReview.remove();

  const resultDisplay = document.createElement("div");
  resultDisplay.classList.add("answer-review");
  resultDisplay.innerHTML = `<h3>Your Answers:</h3><p>${displayHtml}</p>`;
  document.getElementById("results").prepend(resultDisplay);

  fetchLeaderboard(); // should already be the filtered-by-id version
}



let leaderboardListener = null; // keep reference so we can detach old listeners

function fetchLeaderboard() {
  const leaderboardEl = document.getElementById("leaderboard");

  // If a previous listener exists, remove it (avoid duplicate data)
  if (leaderboardListener) leaderboardListener.off();

  const ref = db.ref("results").orderByChild("roundId").equalTo(String(currentRound.id));
  leaderboardListener = ref;

  let results = [];

  ref.on("child_added", (snapshot) => {
    const result = snapshot.val();
    results.push(result);
    updateLeaderboardDisplay(results);
  });

  ref.on("child_removed", (snapshot) => {
    // if round resets, clear the leaderboard
    results = results.filter(r => r.roundId !== String(currentRound.id));
    updateLeaderboardDisplay(results);
  });

  function updateLeaderboardDisplay(resultsArr) {
    if (!resultsArr.length) {
      leaderboardEl.innerHTML = "<li>No results yet for this round.</li>";
      return;
    }

    const total = currentText.answers.length;

    resultsArr.sort((a, b) => {
      if (b.score === a.score) {
        return new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`);
      }
      return b.score - a.score;
    });

    leaderboardEl.innerHTML = `
      <li><strong>Live Leaderboard (Round ${currentRound.id})</strong></li>
      ${resultsArr
        .map((r, i) => {
          const pct = ((r.score / total) * 100).toFixed(0);
          const isYou = r.username.toLowerCase() === username.toLowerCase();
          return `<li ${isYou ? 'class="highlighted"' : ''}>
            ${i + 1}. ${r.username}: ${r.score}/${total} (${pct}%) — ${r.date} ${r.time}
          </li>`;
        })
        .join("")}
    `;
  }
}

let hasSubmitted = false;

function autoSubmitIfNotYet() {
  if (hasSubmitted) return;
  hasSubmitted = true;
  submitAnswers();
}



function restartGame() {
  document.getElementById("results").style.display = "none";
  document.getElementById("waiting").style.display = "block";
}


document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("submit-btn").addEventListener("click", submitAnswers);
document.getElementById("restart-btn").addEventListener("click", restartGame);

loadTexts();


// ====================================
// 🌍 GLOBAL LEADERBOARD FOR PLAYERS
// ====================================

let globalListener = null;

function updateGlobalLeaderboardForPlayers() {
  const globalEl = document.getElementById("global-leaderboard");

  db.ref("results").once("value", (snapshot) => {
    const results = snapshot.val();
    if (!results) {
      globalEl.innerHTML = "<li>No results yet.</li>";
      return;
    }

    const userStats = {};

    for (const key in results) {
      const r = results[key];
      const textObj = texts.find(t => t.id === r.textId);
      const total = textObj ? textObj.answers.length : 1;

      if (!userStats[r.username]) {
        userStats[r.username] = { correct: 0, total: 0, rounds: new Set() };
      }

      userStats[r.username].correct += r.score;
      userStats[r.username].total += total;
      userStats[r.username].rounds.add(r.roundId);
    }

    const table = Object.entries(userStats).map(([username, data]) => {
      const pct = ((data.correct / data.total) * 100).toFixed(1);
      return {
        username,
        correct: data.correct,
        total: data.total,
        pct,
        rounds: data.rounds.size
      };
    });

    // Sort by total correct, then percentage
    table.sort((a, b) => b.correct - a.correct || b.pct - a.pct);

    globalEl.innerHTML = table
      .map(
        (u, i) => `
        <li ${username && u.username.toLowerCase() === username.toLowerCase() ? 'class="highlighted"' : ''}>
          ${i + 1}. <strong>${u.username}</strong> — 
          ${u.correct}/${u.total} (${u.pct}%) — ${u.rounds} rounds
        </li>`
      )
      .join("");
  });
}

function attachGlobalLeaderboardListener() {
  if (globalListener) globalListener.off();
  globalListener = db.ref("results");
  globalListener.on("child_added", updateGlobalLeaderboardForPlayers);
  globalListener.on("child_removed", updateGlobalLeaderboardForPlayers);
}
