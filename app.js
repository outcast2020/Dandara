const palette = ["red", "blue", "yellow", "green"];
const vocab = ["eu", "quero", "gosto", "de", "montar", "brincar", "robôs", "histórias", "com", "lego"];

const tokenBox = document.getElementById("tokenBox");
const sentenceEl = document.getElementById("sentence");
const predictionsEl = document.getElementById("predictions");
const explainEl = document.getElementById("explain");

const undoBtn = document.getElementById("undoBtn");
const clearBtn = document.getElementById("clearBtn");
const predictBtn = document.getElementById("predictBtn");

const builtSentence = [];

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

const audio = {
  ctx: null,
  enabled: false,
};

function ensureAudio() {
  if (!audio.ctx) {
    audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  audio.enabled = true;
}

function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function playNote(midi = 60, duration = 0.15) {
  if (!audio.enabled || !audio.ctx) return;
  const ctx = audio.ctx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "triangle";
  osc.frequency.value = midiToFreq(midi);
  gain.gain.value = 0.0001;

  osc.connect(gain);
  gain.connect(ctx.destination);

  const now = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

function renderTokenBox() {
  vocab.forEach((word, index) => {
    const btn = document.createElement("button");
    btn.className = `block ${palette[index % palette.length]}`;
    btn.textContent = word;
    btn.addEventListener("click", () => {
      ensureAudio();
      playNote(60 + (index % 8) * 2, 0.14);
      builtSentence.push(word);
      renderSentence();
    });
    tokenBox.appendChild(btn);
  });
}

function renderSentence() {
  sentenceEl.innerHTML = "";

  if (!builtSentence.length) {
    sentenceEl.textContent = "(vazia)";
    return;
  }

  builtSentence.forEach((word, idx) => {
    const span = document.createElement("span");
    span.className = `block ${palette[idx % palette.length]}`;
    span.textContent = word;
    sentenceEl.appendChild(span);
  });
}

function predictNext() {
  ensureAudio();
  playNote(72, 0.2);

  predictionsEl.innerHTML = "";

  const lastWord = builtSentence[builtSentence.length - 1] || "";
  const candidates = tinyModel[lastWord] || tinyModel[""];

  const sorted = Object.entries(candidates).sort((a, b) => b[1] - a[1]);

  explainEl.textContent = lastWord
    ? `O modelo olha para a última peça (“${lastWord}”) e busca padrões aprendidos.`
    : "Sem peças ainda: o modelo usa probabilidades iniciais.";

  sorted.forEach(([word, prob], idx) => {
    const card = document.createElement("button");
    card.className = `block ${palette[idx % palette.length]}`;
    card.innerHTML = `${word} <span class="prob-badge">${Math.round(prob * 100)}%</span>`;
    card.addEventListener("click", () => {
      playNote(67 + idx * 2, 0.18);
      builtSentence.push(word);
      renderSentence();
      predictNext();
    });
    predictionsEl.appendChild(card);
  });
}

undoBtn.addEventListener("click", () => {
  if (!builtSentence.length) return;
  ensureAudio();
  playNote(55, 0.1);
  builtSentence.pop();
  renderSentence();
});

clearBtn.addEventListener("click", () => {
  ensureAudio();
  playNote(50, 0.1);
  builtSentence.length = 0;
  renderSentence();
  predictionsEl.innerHTML = "";
  explainEl.textContent = "Clique em “Prever próximo bloco” para ver a mágica.";
});

predictBtn.addEventListener("click", predictNext);

renderTokenBox();
renderSentence();
