(() => {
  const CHOICES = ['rock', 'paper', 'scissors'];
  const WINS_AGAINST = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  const REASONS = {
    'rock_scissors': 'Rock crushes Scissors',
    'scissors_paper': 'Scissors cuts Paper',
    'paper_rock': 'Paper covers Rock'
  };

  const STORAGE_KEY = 'rps_pro_stats';
  const THEME_KEY = 'rps_theme';

  const playerScoreEl = document.getElementById('playerScore');
  const computerScoreEl = document.getElementById('computerScore');
  const tieScoreEl = document.getElementById('tieScore');
  const playerChoiceDisplay = document.getElementById('playerChoiceDisplay');
  const computerChoiceDisplay = document.getElementById('computerChoiceDisplay');
  const resultTextEl = document.getElementById('resultText');
  const choiceButtons = Array.from(document.querySelectorAll('.choice-btn'));
  const modeSelect = document.getElementById('modeSelect');
  const totalWinsEl = document.getElementById('totalWins');
  const totalLossesEl = document.getElementById('totalLosses');
  const totalTiesEl = document.getElementById('totalTies');
  const matchesWonEl = document.getElementById('matchesWon');
  const confettiCanvas = document.getElementById('confettiCanvas');
  const resetStatsBtn = document.getElementById('resetStats');
  const themeToggle = document.getElementById('themeToggle');
  const nextRoundBtn = document.getElementById('nextRound');
  const restartMatchBtn = document.getElementById('restartMatch');
  const resultCard = document.getElementById('resultCard');

  let state = {
    round: 0,
    playerRoundWins: 0,
    computerRoundWins: 0,
    ties: 0,
    bestOf: 'endless'
  };

  let stats = {
    totalWins: 0,
    totalLosses: 0,
    totalTies: 0,
    matchesWon: 0,
    matchesLost: 0
  };

  let audioCtx = null;
  let confettiRunner = null;

  function init() {
    loadStorage();
    applyTheme();
    bindUI();
    resetMatchState();
    updateUI();
  }

  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) stats = Object.assign(stats, JSON.parse(raw));
    } catch {}
  }

  function saveStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }

  function applyTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    themeToggle.setAttribute('aria-pressed', savedTheme === 'dark');
  }

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    themeToggle.setAttribute('aria-pressed', isDark);
  }

  function bindUI() {
    choiceButtons.forEach(b => {
      b.addEventListener('click', () => handlePlayerChoice(b.dataset.choice, b));
    });

    modeSelect.value = state.bestOf;
    modeSelect.addEventListener('change', () => {
      state.bestOf = modeSelect.value;
      resetMatchState();
      updateUI();
    });

    themeToggle.addEventListener('click', toggleTheme);

    resetStatsBtn.addEventListener('click', () => {
      if (confirm('Reset all saved stats? This cannot be undone.')) {
        stats = { totalWins:0, totalLosses:0, totalTies:0, matchesWon:0, matchesLost:0 };
        saveStorage();
        updateUI();
      }
    });

    nextRoundBtn.addEventListener('click', hideResult);

    restartMatchBtn.addEventListener('click', () => {
      resetMatchState();
      updateUI();
    });

    window.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'r') triggerChoice('rock');
      if (e.key.toLowerCase() === 'p') triggerChoice('paper');
      if (e.key.toLowerCase() === 's') triggerChoice('scissors');
    });

    window.addEventListener('resize', () => {
      if (confettiRunner) confettiRunner.resize();
    });
  }

  function triggerChoice(choice) {
    const btn = choiceButtons.find(b => b.dataset.choice === choice);
    if (btn) {
      btn.classList.add('clicked');
      setTimeout(()=>btn.classList.remove('clicked'), 160);
      handlePlayerChoice(choice, btn);
    }
  }

  function handlePlayerChoice(playerChoice) {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    const computerChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];

    let outcome = 'tie';
    if (playerChoice === computerChoice) outcome = 'tie';
    else if (WINS_AGAINST[playerChoice] === computerChoice) outcome = 'win';
    else outcome = 'lose';

    state.round++;
    if (outcome === 'win') state.playerRoundWins++;
    if (outcome === 'lose') state.computerRoundWins++;
    if (outcome === 'tie') state.ties++;

    if (outcome === 'win') stats.totalWins++;
    if (outcome === 'lose') stats.totalLosses++;
    if (outcome === 'tie') stats.totalTies++;

    showRoundResult(playerChoice, computerChoice, outcome);
    playTone(outcome);

    if (state.bestOf !== 'endless') {
      const goal = Math.ceil(Number(state.bestOf) / 2);
      if (state.playerRoundWins >= goal || state.computerRoundWins >= goal) {
        if (state.playerRoundWins > state.computerRoundWins) {
          stats.matchesWon++;
          runConfetti();
          playCelebration();
          resultTextEl.textContent = `You won the match! (${state.playerRoundWins}–${state.computerRoundWins})`;
        } else {
          stats.matchesLost++;
          resultTextEl.textContent = `Computer won the match. (${state.playerRoundWins}–${state.computerRoundWins})`;
        }
        saveStorage();
      } else saveStorage();
    } else saveStorage();

    updateUI();
  }

  function showRoundResult(playerChoice, computerChoice, outcome) {
    playerChoiceDisplay.textContent = capitalize(playerChoice);
    computerChoiceDisplay.textContent = capitalize(computerChoice);

    if (outcome === 'tie') {
      resultTextEl.textContent = `It's a tie — both chose ${capitalize(playerChoice)}.`;
      resultTextEl.style.color = 'var(--muted)';
    } else {
      const key = `${outcome === 'win' ? playerChoice : computerChoice}_${outcome === 'win' ? computerChoice : playerChoice}`;
      const reason = REASONS[key] || '';
      resultTextEl.textContent = outcome === 'win' ? `You win — ${reason}` : `You lose — ${reason}`;
      resultTextEl.style.color = outcome === 'win' ? 'var(--win)' : 'var(--lose)';
    }

    resultCard.setAttribute('aria-hidden', 'false');
    flashWinner(outcome);
  }

  function hideResult() {
    resultCard.setAttribute('aria-hidden', 'true');
  }

  function flashWinner(outcome) {
    if (outcome === 'win') {
      playerScoreEl.classList.add('pulse-win');
      setTimeout(()=>playerScoreEl.classList.remove('pulse-win'), 650);
    } else if (outcome === 'lose') {
      computerScoreEl.classList.add('pulse-lose');
      setTimeout(()=>computerScoreEl.classList.remove('pulse-lose'), 650);
    } else {
      tieScoreEl.classList.add('pulse-tie');
      setTimeout(()=>tieScoreEl.classList.remove('pulse-tie'), 650);
    }
  }

  function updateUI() {
    playerScoreEl.textContent = state.playerRoundWins;
    computerScoreEl.textContent = state.computerRoundWins;
    tieScoreEl.textContent = state.ties;
    totalWinsEl.textContent = stats.totalWins;
    totalLossesEl.textContent = stats.totalLosses;
    totalTiesEl.textContent = stats.totalTies;
    matchesWonEl.textContent = stats.matchesWon;
  }

  function resetMatchState() {
    state.round = 0;
    state.playerRoundWins = 0;
    state.computerRoundWins = 0;
    state.ties = 0;
    state.bestOf = modeSelect ? modeSelect.value : 'endless';
    hideResult();
  }

  function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
  }

  function playTone(outcome) {
    if (!audioCtx) return;
    try {
      const ctx = audioCtx;
      const now = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      if (outcome === 'win') { o.frequency.value = 880; g.gain.value = 0.02; }
      else if (outcome === 'lose') { o.frequency.value = 160; g.gain.value = 0.02; }
      else { o.frequency.value = 400; g.gain.value = 0.012; }
      o.type = 'sine';
      o.start(now);
      o.stop(now + 0.08);
    } catch {}
  }

  function playCelebration() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = audioCtx;
    const now = ctx.currentTime;
    [880, 1100, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = 'triangle';
      g.gain.value = 0.02;
      o.start(now + i * 0.06);
      o.stop(now + i * 0.06 + 0.12);
    });
  }

  function runConfetti() {
    if (!confettiRunner) confettiRunner = createConfetti(confettiCanvas);
    confettiRunner.run(1200);
  }

  function createConfetti(canvas) {
    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const colors = ['#ff6b6b','#f59e0b','#10b981','#60a5fa','#a78bfa'];
    let particles = [];
    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }
    function spawn(n = 80) {
      particles = [];
      for (let i = 0; i < n; i++) {
        particles.push({
          x: Math.random() * W,
          y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 6,
          vy: 2 + Math.random() * 5,
          size: 6 + Math.random() * 8,
          color: colors[Math.floor(Math.random() * colors.length)],
          rot: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 10
        });
      }
    }
    function step() {
      ctx.clearRect(0, 0, W, H);
      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06;
        p.rot += p.rotSpeed;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
        ctx.restore();
      }
      particles = particles.filter(p => p.y < H + 60);
      if (particles.length) requestAnimationFrame(step);
    }
    function run(duration = 1000) {
      spawn(Math.min(200, 80 + Math.floor(duration / 10)));
      const stopAt = performance.now() + duration;
      function frame() {
        if (particles.length === 0 || performance.now() > stopAt + 800) {
          ctx.clearRect(0,0,W,H);
          return;
        }
        requestAnimationFrame(frame);
      }
      step();
      frame();
    }
    return { run, resize };
  }

  init();
})();
