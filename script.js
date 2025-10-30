let texts = [];
let currentText = null;
let username = "";

async function loadTexts() {
  const res = await fetch("data/texts.json");
  texts = await res.json();
}

let currentRound = null;

function startGame() {
  username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter your name!");
    return;
  }

  document.getElementById("login").style.display = "none";
  document.getElementById("waiting").style.display = "block";

  // Watch current round from Firebase
  db.ref("currentRound").on("value", async (snapshot) => {
    const data = snapshot.val();

    // No active round → waiting screen
    if (!data || !data.id || !data.textId) {
      currentRound = null;
      document.getElementById("game").style.display = "none";
      document.getElementById("results").style.display = "none";
      document.getElementById("waiting").style.display = "block";
      return;
    }

    // Active round detected
    if (!texts.length) await loadTexts();
    const textObj = texts.find((t) => t.id === data.textId);
    if (!textObj) return;

    currentRound = data;
    currentText = textObj;

    document.getElementById("waiting").style.display = "none";
    document.getElementById("results").style.display = "none";
    document.getElementById("game").style.display = "block";
    showText(currentText);

    // Start listening to this round’s leaderboard
    fetchLeaderboard();
  });
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
    roundId: currentRound.id
  };


  db.ref("results").push(result);

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



function fetchLeaderboard() {
  const leaderboardEl = document.getElementById("leaderboard");

  db.ref("results")
    .orderByChild("roundId")
    .equalTo(currentRound.id)
    .on("value", (snapshot) => {
      let results = [];
      snapshot.forEach((child) => results.push(child.val()));

      if (results.length === 0) {
        leaderboardEl.innerHTML = "<li>No results yet for this round.</li>";
        return;
      }

      const total = currentText.answers.length;

      // Sort by score, then most recent
      results.sort((a, b) => {
        if (b.score === a.score) {
          return new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`);
        }
        return b.score - a.score;
      });

      leaderboardEl.innerHTML = `
        <li><strong>Live Leaderboard (Round ${currentRound.id})</strong></li>
        ${results
          .map((r, i) => {
            const pct = ((r.score / total) * 100).toFixed(0);
            const isYou = r.username.toLowerCase() === username.toLowerCase();
            return `<li ${isYou ? 'class="highlighted"' : ''}>
              ${i + 1}. ${r.username}: ${r.score}/${total} (${pct}%) — ${r.date} ${r.time}
            </li>`;
          })
          .join("")}
      `;
    });
}





function restartGame() {
  document.getElementById("results").style.display = "none";
  document.getElementById("login").style.display = "block";
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("submit-btn").addEventListener("click", submitAnswers);
document.getElementById("restart-btn").addEventListener("click", restartGame);

loadTexts();
