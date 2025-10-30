let texts = [];
let currentText = null;
let username = "";

async function loadTexts() {
  const res = await fetch("data/texts.json");
  texts = await res.json();
}

function startGame() {
  username = document.getElementById("username").value.trim();
  if (!username) {
    alert("Please enter your name!");
    return;
  }

  document.getElementById("login").style.display = "none";
  document.getElementById("game").style.display = "block";
  
  showRandomText();
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
  const options = ["—", "a", "an", "the", "A", "An", "The"];
  let html = `<select class="blank" id="blank-${index}">`;
  html += `<option value="">(select)</option>`;
  options.forEach(opt => {
    html += `<option value="${opt}">${opt}</option>`;
  });
  html += `</select>`;
  return html;
}

function submitAnswers() {
  let score = 0;
  let displayHtml = "";
  const parts = currentText.text.split("___");

  for (let i = 0; i < currentText.answers.length; i++) {
    const userAns = document.getElementById(`blank-${i}`).value.trim();
    const validAnswers = Array.isArray(currentText.answers[i])
      ? currentText.answers[i]
      : [currentText.answers[i]];

    const isCorrect = validAnswers.some(
      opt => opt.toLowerCase() === userAns.toLowerCase()
    );
    if (isCorrect) score++;

    // Tooltip text for hover (all valid answers)
    const tooltip = validAnswers.join(" / ");
    // Optional explanation
    const explanation =
      currentText.explanations && currentText.explanations[i]
        ? `<div class="explanation">${currentText.explanations[i]}</div>`
        : "";

    // Build colored span for the user's answer
    const colorClass = isCorrect ? "correct" : "incorrect";
    const answerHtml = `<span class="${colorClass}" title="Correct: ${tooltip}">${userAns || "(blank)"}${explanation}</span>`;

    displayHtml += parts[i] + answerHtml;
  }

  // Add final text fragment (after last blank)
  displayHtml += parts[parts.length - 1];

  const now = new Date();
  const date = now.toISOString().split("T")[0];
  const time = now.toLocaleTimeString();

  const result = {
    username: username,
    score: score,
    date: date,
    time: time,
    textId: currentText.id
  };

  // Save to Firebase
  db.ref("results").push(result);

  // Display feedback text + leaderboard
  document.getElementById("game").style.display = "none";
  document.getElementById("results").style.display = "block";
  document.getElementById("score").textContent =
    `${username}, your score: ${score}/${currentText.answers.length}`;

  const resultDisplay = document.createElement("div");
  resultDisplay.classList.add("answer-review");
  resultDisplay.innerHTML = `<h3>Your Answers:</h3><p>${displayHtml}</p>`;
  document.getElementById("results").prepend(resultDisplay);

  fetchLeaderboard();
}



function fetchLeaderboard() {
  const leaderboardEl = document.getElementById("leaderboard");
  leaderboardEl.innerHTML = "<li>Loading...</li>";

  db.ref("results").once("value", snapshot => {
    let results = [];
    snapshot.forEach(child => {
      results.push(child.val());
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    leaderboardEl.innerHTML = results
      .map(r => `<li>${r.username}: ${r.score} pts (${r.date} ${r.time})</li>`)
      .join("");
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
