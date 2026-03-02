const palette = ["red", "blue", "yellow", "green"];
const vocab = ["eu", "quero", "gosto", "de", "montar", "brincar", "robôs", "histórias", "com", "lego"];
const targetLength = 4;

const tinyModel = {
  "": { eu: 0.45, lego: 0.2, histórias: 0.2, robôs: 0.15 },
  eu: { quero: 0.55, gosto: 0.45 },
  quero: { montar: 0.5, brincar: 0.3, lego: 0.2 },
  gosto: { de: 0.9, lego: 0.1 },
  de: { montar: 0.35, brincar: 0.35, robôs: 0.15, histórias: 0.15 },
  montar: { com: 0.65, lego: 0.35 },
  brincar: { com: 0.8, lego: 0.2 },
  com: { lego: 0.6, robôs: 0.2, histórias: 0.2 },
};

const state = {
  builtSentence: [],
  points: 0,
  round: 1,
};

const tokenBox = document.getElementById("tokenBox");
const sentenceEl = document.getElementById("sentence");
const predictionsEl = document.getElementById("predictions");
const explainEl = document.getElementById("explain");
const missionEl = document.getElementById("mission");
const scoreEl = document.getElementById("score");
const resultEl = document.getElementById("result");

const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");
const predictBtn = document.getElementById("predictBtn");
const autoBtn = document.getElementById("autoBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");

const audio = { ctx: null, enabled: false };

function ensureAudio() {
  if (!audio.ctx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audio.ctx = new Ctx();
  }
  audio.enabled = true;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playNote(midi = 60, duration = 0.14) {
  if (!audio.enabled || !audio.ctx) return;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  const now = audio.ctx.currentTime;

  osc.type = "triangle";
  osc.frequency.value = midiToFreq(midi);
  gain.gain.value = 0.0001;

  osc.connect(gain);
  gain.connect(audio.ctx.destination);

  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function updateHud() {
  missionEl.innerHTML = `<strong>Missão:</strong> rodada ${state.round} — monte ${targetLength} peças.`;
  scoreEl.innerHTML = `<strong>Pontos:</strong> ${state.points}`;
}

function makeBlock(tag, word, classIndex) {
  const node = document.createElement(tag);
  node.className = `block ${palette[classIndex % palette.length]}`;
  node.textContent = word;
  return node;
}

function renderTokenBox() {
  tokenBox.innerHTML = "";
  vocab.forEach((word, index) => {
    const btn = makeBlock("button", word, index);
    btn.addEventListener("click", () => addWord(word, index));
    tokenBox.appendChild(btn);
  });
}

function renderSentence() {
  sentenceEl.innerHTML = "";
  if (!state.builtSentence.length) {
    sentenceEl.textContent = "(vazia)";
    return;
  }

  state.builtSentence.forEach((word, idx) => {
    sentenceEl.appendChild(makeBlock("span", word, idx));
  });
}

function getCandidates() {
  const lastWord = state.builtSentence[state.builtSentence.length - 1] || "";
  return tinyModel[lastWord] || tinyModel[""];
}

function renderPredictions() {
  const candidates = getCandidates();
  const sorted = Object.entries(candidates).sort((a, b) => b[1] - a[1]);

  predictionsEl.innerHTML = "";
  sorted.forEach(([word, prob], idx) => {
    const card = document.createElement("button");
    card.className = `block ${palette[idx % palette.length]}`;
    card.innerHTML = `${word} <span class="prob-badge">${Math.round(prob * 100)}%</span>`;
    card.addEventListener("click", () => {
      addWord(word, idx + 5);
    });
    predictionsEl.appendChild(card);
  });

  const lastWord = state.builtSentence[state.builtSentence.length - 1];
  explainEl.textContent = lastWord
    ? `O modelo olhou para "${lastWord}" e calculou as próximas peças mais prováveis.`
    : "Sem contexto ainda: o modelo usa probabilidades iniciais.";
}

function addWord(word, noteIndex = 0) {
  if (state.builtSentence.length >= targetLength) return;
  ensureAudio();
  playNote(60 + (noteIndex % 10) * 2, 0.14);
  state.builtSentence.push(word);
  renderSentence();

  if (state.builtSentence.length === targetLength) {
    finishRound();
  }
}

function evaluateSentence(sentence) {
  let total = 0;
  let prev = "";

  sentence.forEach((word) => {
    const options = tinyModel[prev] || tinyModel[""];
    const p = options[word] || 0.01;
    total += Math.log(p);
    prev = word;
  });

  const normalized = Math.max(0, Math.round((total + 12) * 10));
  return Math.min(100, normalized);
}

function finishRound() {
  const quality = evaluateSentence(state.builtSentence);
  const earned = 10 + Math.round(quality / 10);
  state.points += earned;
  updateHud();

  ensureAudio();
  playNote(76, 0.25);

  resultEl.textContent = `Frase: "${state.builtSentence.join(" ")}" | Coerência do modelo: ${quality}% | +${earned} pontos!`;
  explainEl.textContent = "Rodada concluída! Clique em Próxima rodada para continuar.";
  nextRoundBtn.disabled = false;
}

undoBtn.addEventListener("click", () => {
  if (!state.builtSentence.length) return;
  ensureAudio();
  playNote(52, 0.1);
  state.builtSentence.pop();
  renderSentence();
});

clearBtn.addEventListener("click", () => {
  state.builtSentence = [];
  renderSentence();
  predictionsEl.innerHTML = "";
  explainEl.textContent = "Rodada limpa. Monte novas peças.";
});

predictBtn.addEventListener("click", () => {
  ensureAudio();
  playNote(72, 0.18);
  renderPredictions();
});

autoBtn.addEventListener("click", () => {
  if (state.builtSentence.length >= targetLength) return;
  ensureAudio();
  const sorted = Object.entries(getCandidates()).sort((a, b) => b[1] - a[1]);
  const [bestWord] = sorted[0];
  addWord(bestWord, 8);
  renderPredictions();
});

nextRoundBtn.addEventListener("click", () => {
  state.round += 1;
  state.builtSentence = [];
  renderSentence();
  predictionsEl.innerHTML = "";
  explainEl.textContent = "Nova rodada iniciada!";
  resultEl.textContent = "Monte 4 peças para fechar a rodada.";
  nextRoundBtn.disabled = true;
  updateHud();
});

updateHud();
renderTokenBox();
renderSentence();
