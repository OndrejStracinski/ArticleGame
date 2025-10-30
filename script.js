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
      html += `<input type="text" class="blank" id="blank-${i}" />`;
    }
  }
  document.getElementById("text").innerHTML = html;
}

function submitAnswers() {
  let score = 0;
  currentText.answers.forEach((answer, i) => {
    let userAns = document.getElementById(`blank-${i}`).value.trim();
    if (userAns.toLowerCase() === answer.toLowerCase()) {
      score++;
    }
  });

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

  // Show results
  document.getElementById("game").style.display = "none";
  document.getElementById("results").style.display = "block";
  document.getElementById("score").textContent = `${username}, your score: ${score}/${currentText.answers.length}`;

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
