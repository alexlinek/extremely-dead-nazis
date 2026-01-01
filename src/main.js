import "../styles.css";

const DIFFICULTY = {
  easy: {
    label: "Easy",
    timeSec: 45,
    goal: 8,
    spawnEveryMs: 1200,
    visibleMinMs: 900,
    visibleMaxMs: 1500,
  },
  medium: {
    label: "Medium",
    timeSec: 40,
    goal: 12,
    spawnEveryMs: 1000,
    visibleMinMs: 700,
    visibleMaxMs: 1200,
  },
  hard: {
    label: "Hard",
    timeSec: 35,
    goal: 16,
    spawnEveryMs: 850,
    visibleMinMs: 550,
    visibleMaxMs: 950,
  },
};

const ASSETS = {
  targetImg: "/assets/zombie.png",
  splashImg: "/assets/splash.png",
  winImg: "/assets/win.png",
  loseImg: "/assets/lose.png",
};

const $ = (sel) => document.querySelector(sel);

const screenMenu = $("#screenMenu");
const screenPlay = $("#screenPlay");
const screenEnd = $("#screenEnd");

const hudTime = $("#hudTime");
const hudKills = $("#hudKills");
const hudGoal = $("#hudGoal");

const arena = $("#arena");
const target = $("#target");
const targetImg = $("#targetImg");
const message = $("#message");

const btnPause = $("#btnPause");
const btnRestart = $("#btnRestart");
const btnQuit = $("#btnQuit");

const endImg = $("#endImg");
const endTitle = $("#endTitle");
const endText = $("#endText");
const btnPlayAgain = $("#btnPlayAgain");
const btnBackToMenu = $("#btnBackToMenu");

const jumpScareFlash = $("#jumpScareFlash");

const uiMove = $("#uiMove");
const uiSelect = $("#uiSelect");

const sfxHit = $("#sfxHit");
const musicWin = $("#musicWin");
const musicLose = $("#musicLose");

// Set base images
targetImg.src = ASSETS.targetImg;

let state = "menu"; // menu | play | end
let paused = false;

let difficultyKey = "easy";
let cfg = DIFFICULTY[difficultyKey];

let kills = 0;
let timeLeftMs = 0;

let timerInterval = null;
let spawnInterval = null;
let hideTimeout = null;

let targetVisible = false;

function setScreen(active) {
  screenMenu.classList.toggle("screenActive", active === "menu");
  screenPlay.classList.toggle("screenActive", active === "play");
  screenEnd.classList.toggle("screenActive", active === "end");
}

function stopAllAudio() {
  [musicWin, musicLose, sfxHit, uiMove, uiSelect].forEach((a) => {
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
    } catch {}
  });
}

function playUI(aud) {
  if (!aud) return;
  try {
    aud.volume = 0.55;
    aud.currentTime = 0;
    aud.play().catch(() => {});
  } catch {}
}

function setMessage(text) {
  message.textContent = text || "";
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function updateHUD() {
  hudKills.textContent = String(kills);
  hudGoal.textContent = String(cfg.goal);

  const secs = Math.ceil(timeLeftMs / 1000);
  hudTime.textContent = String(Math.max(0, secs));
  hudTime.style.color = secs <= 5 ? "rgba(255,70,90,0.95)" : "";
}

function showTargetAt(xPct, yPct) {
  target.style.left = `${xPct}%`;
  target.style.top = `${yPct}%`;
  target.classList.add("show");
  targetVisible = true;
}

function hideTarget() {
  target.classList.remove("show");
  targetVisible = false;
}

function spawnTarget() {
  if (state !== "play" || paused) return;
  if (targetVisible) return;

  const rect = arena.getBoundingClientRect();

  // ✅ tweak: padding computed for 64x64 target (and scaled by arena size)
  const spriteSize = 64;
  const padXPct = (spriteSize / rect.width) * 50;
  const padYPct = (spriteSize / rect.height) * 50;

  const x = randInt(Math.ceil(padXPct), Math.floor(100 - padXPct));
  const y = randInt(Math.ceil(padYPct), Math.floor(100 - padYPct));

  showTargetAt(x, y);

  const visibleFor = randInt(cfg.visibleMinMs, cfg.visibleMaxMs);

  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => hideTarget(), visibleFor);
}

function endGame(didWin) {
  state = "end";
  setScreen("end");

  clearInterval(timerInterval);
  clearInterval(spawnInterval);
  clearTimeout(hideTimeout);

  hideTarget();
  stopAllAudio();

  if (didWin) {
    endImg.src = ASSETS.winImg;
    endTitle.textContent = "YOU WIN 🎄";
    endText.textContent =
      "Merry Christmas. Target neutralized. Victory achieved.";
    try {
      musicWin.volume = 0.85;
      musicWin.play().catch(() => {});
    } catch {}
  } else {
    endImg.src = ASSETS.loseImg;
    endTitle.textContent = "YOU LOSE";
    const snark = [
      "Too slow. Santa saw everything.",
      "That was… not your finest hour.",
      "Skill issue. (It happens.)",
      "The target popped up. You popped off… incorrectly.",
    ];
    endText.textContent = snark[randInt(0, snark.length - 1)];
    try {
      musicLose.volume = 0.85;
      musicLose.play().catch(() => {});
    } catch {}

    // quick flash to give it a tiny “jump” feeling without settings
    jumpScareFlash.classList.add("on");
    setTimeout(() => jumpScareFlash.classList.remove("on"), 140);
  }
}

function tickTimer() {
  if (state !== "play" || paused) return;

  timeLeftMs -= 100;
  timeLeftMs = Math.max(0, timeLeftMs);
  updateHUD();

  // ✅ tweak: only decide win/lose when time runs out
  if (timeLeftMs <= 0) {
    endGame(kills >= cfg.goal);
  }
}

function startGame(newDifficultyKey) {
  difficultyKey = newDifficultyKey;
  cfg = DIFFICULTY[difficultyKey];

  state = "play";
  paused = false;
  setScreen("play");
  stopAllAudio();

  kills = 0;
  timeLeftMs = cfg.timeSec * 1000;

  updateHUD();
  setMessage(`${cfg.label}: Get ${cfg.goal} kills in ${cfg.timeSec}s.`);

  hideTarget();

  clearInterval(timerInterval);
  clearInterval(spawnInterval);
  clearTimeout(hideTimeout);

  timerInterval = setInterval(tickTimer, 100);

  spawnInterval = setInterval(spawnTarget, cfg.spawnEveryMs);

  setTimeout(spawnTarget, 250);
}

function goMenu() {
  state = "menu";
  paused = false;
  setScreen("menu");

  clearInterval(timerInterval);
  clearInterval(spawnInterval);
  clearTimeout(hideTimeout);

  hideTarget();
  stopAllAudio();

  hudTime.textContent = "—";
  hudKills.textContent = "—";
  hudGoal.textContent = "—";
}

function setPaused(next) {
  paused = next;
  btnPause.textContent = paused ? "Resume" : "Pause";
  setMessage(paused ? "Paused. Take a breath." : `${cfg.label}: Go!`);
  if (paused) hideTarget();
}

// ---------------------------
// Splash (difficulty + start)
// ---------------------------

function initSplash({ onStart }) {
  const diffButtons = Array.from(document.querySelectorAll(".diffBtn"));
  const btnStart = document.querySelector("#btnStartSplash");

  let selected = "easy";

  function setSelected(key) {
    selected = key;
    diffButtons.forEach((b) => {
      const isActive = b.getAttribute("data-diff") === key;
      b.classList.toggle("isActive", isActive);
      b.setAttribute("aria-checked", isActive ? "true" : "false");
    });
  }

  function start() {
    playUI(uiSelect);
    onStart?.(selected);
  }

  diffButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      playUI(uiMove);
      setSelected(btn.getAttribute("data-diff"));
    });
    btn.addEventListener("mouseenter", () => {
      playUI(uiMove);
      setSelected(btn.getAttribute("data-diff"));
    });
  });

  btnStart?.addEventListener("click", (e) => {
    e.preventDefault();
    start();
  });

  // Keyboard: ← → or ↑ ↓ cycle difficulty, Enter/Space starts
  window.addEventListener("keydown", (e) => {
    const menuVisible = document
      .querySelector("#screenMenu")
      ?.classList.contains("screenActive");
    if (!menuVisible) return;

    const keysPrev = ["ArrowLeft", "ArrowUp"];
    const keysNext = ["ArrowRight", "ArrowDown"];

    if (keysPrev.includes(e.key)) {
      e.preventDefault();
      playUI(uiMove);
      const idx = diffButtons.findIndex(
        (b) => b.getAttribute("data-diff") === selected
      );
      const prev = (idx - 1 + diffButtons.length) % diffButtons.length;
      setSelected(diffButtons[prev].getAttribute("data-diff"));
    }

    if (keysNext.includes(e.key)) {
      e.preventDefault();
      playUI(uiMove);
      const idx = diffButtons.findIndex(
        (b) => b.getAttribute("data-diff") === selected
      );
      const next = (idx + 1) % diffButtons.length;
      setSelected(diffButtons[next].getAttribute("data-diff"));
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      start();
    }
  });

  setSelected("easy");
  // Snow disabled for arcade style
}

// ---------------------------
// Snow overlay (splash only)
// ---------------------------

function initSnow() {
  const canvas = document.getElementById("snow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  let w = 0,
    h = 0,
    dpr = 1;
  let flakes = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = Math.floor(rect.width * dpr);
    h = Math.floor(rect.height * dpr);
    canvas.width = w;
    canvas.height = h;

    const count = Math.floor((rect.width * rect.height) / 14000);
    flakes = Array.from({ length: clamp(count, 40, 120) }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: (Math.random() * 1.6 + 0.6) * dpr,
      vy: (Math.random() * 0.9 + 0.35) * dpr,
      vx: (Math.random() * 0.35 - 0.175) * dpr,
      a: Math.random() * 0.6 + 0.3,
    }));
  }

  function step() {
    const menuVisible = document
      .querySelector("#screenMenu")
      ?.classList.contains("screenActive");

    // Always RAF, but only draw while on splash.
    if (!menuVisible) {
      requestAnimationFrame(step);
      return;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "white";

    for (const f of flakes) {
      f.x += f.vx;
      f.y += f.vy;

      if (f.y > h + 10) {
        f.y = -10;
        f.x = Math.random() * w;
      }
      if (f.x < -10) f.x = w + 10;
      if (f.x > w + 10) f.x = -10;

      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(step);
  }

  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(step);
}

// ---------------------------
// Gameplay interactions
// ---------------------------

target.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  if (state !== "play" || paused) return;
  if (!targetVisible) return;

  kills += 1;
  updateHUD();

  try {
    sfxHit.volume = 0.6;
    sfxHit.currentTime = 0;
    sfxHit.play().catch(() => {});
  } catch {}

  const remaining = Math.max(0, cfg.goal - kills);

  if (remaining <= 0) {
    // Goal reached - win immediately!
    hideTarget();
    endGame(true);
    return;
  }

  setMessage(`Nice. ${remaining} to go.`);
  hideTarget();
});

btnPause.addEventListener("click", () => {
  if (state !== "play") return;
  setPaused(!paused);
});

btnRestart.addEventListener("click", () => {
  if (state !== "play") return;
  startGame(difficultyKey);
});

btnQuit.addEventListener("click", () => {
  goMenu();
});

btnPlayAgain.addEventListener("click", () => {
  startGame(difficultyKey);
});

btnBackToMenu.addEventListener("click", () => {
  goMenu();
});

// Escape pauses during play; R restarts
document.addEventListener("keydown", (e) => {
  if (state === "play") {
    if (e.key === "Escape") setPaused(!paused);
    if (e.key.toLowerCase() === "r") startGame(difficultyKey);
  }
});

// Init
goMenu();
initSplash({
  onStart: (difficulty) => startGame(difficulty),
});
