/* ============================================================
   TAROT 3D – Main Script
   Click-to-flip mechanic + cinematic shuffle animation
   ============================================================ */

/* ---- Position labels per mode ---- */
const POSITIONS = {
  1: ['คำทำนาย'],
  3: ['อดีต', 'ปัจจุบัน', 'อนาคต'],
  5: ['ตัวเอง', 'ความท้าทาย', 'อดีต', 'อนาคต', 'ผลลัพธ์']
};

/* ---- State ---- */
let deck        = [];
let mode        = 1;
let drawnCards  = [];   // cards dealt (face-down)
let flippedCount= 0;    // how many have been flipped face-up
let drawsLeft   = 1;
let isAnimating = false;
let canFlip     = false;

/* ---- DOM ---- */
const deckWrapper   = document.getElementById('deck-wrapper');
const shuffleStage  = document.getElementById('shuffle-stage');
const drawHint      = document.getElementById('draw-hint');
const statusBar     = document.getElementById('status-bar');
const spreadArea    = document.getElementById('spread-area');
const resultPanel   = document.getElementById('result-panel');
const resultContent = document.getElementById('result-content');
const resetBtn      = document.getElementById('reset-btn');
const shuffleBtn    = document.getElementById('shuffle-btn');
const revealAllBtn  = document.getElementById('reveal-all-btn');

/* ---- AI DOM ---- */
const questionInput = document.getElementById('question-input');
const preRevealQuestion = document.getElementById('pre-reveal-question');
const confirmQuestionBtn = document.getElementById('confirm-question-btn');
const askAiBtn      = document.getElementById('ask-ai-btn');
const aiResponse    = document.getElementById('ai-response');

// ใส่ Groq API Key ที่นี่ (ถ้าใช้วิธีฝังในโค้ด)
const DEFAULT_GROQ_KEY = 'YOUR_GROQ_API_KEY_HERE';

// Groq API
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/* ============================================================
   STARFIELD
   ============================================================ */
;(function () {
  const canvas = document.getElementById('starfield');
  const ctx    = canvas.getContext('2d');
  let stars = [];

  function resize () {
    canvas.width  = innerWidth;
    canvas.height = innerHeight;
  }
  resize();
  addEventListener('resize', resize);

  function makeStars (n) {
    stars = Array.from({ length: n }, () => ({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      r:     Math.random() * 1.5 + .2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * .006 + .002
    }));
  }
  makeStars(260);

  function draw () {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
    g.addColorStop(0, '#04040f');
    g.addColorStop(1, '#0b0520');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    stars.forEach(s => {
      s.phase += s.speed;
      const a = .35 + .65 * Math.abs(Math.sin(s.phase));
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ============================================================
   PARTICLES
   ============================================================ */
;(function () {
  const container = document.getElementById('particles');
  const COLORS = ['#a855f7','#ec4899','#818cf8','#fbbf24','#f0abfc','#38bdf8'];

  function spawn () {
    const p    = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 7 + 1.5;
    const dur  = Math.random() * 14 + 9;
    Object.assign(p.style, {
      width:               size + 'px',
      height:              size + 'px',
      left:                Math.random() * 100 + '%',
      background:          COLORS[Math.floor(Math.random() * COLORS.length)],
      animationDuration:   dur + 's',
      animationDelay:      Math.random() * dur + 's'
    });
    container.appendChild(p);
    setTimeout(() => p.remove(), (dur + 3) * 1000);
  }
  for (let i = 0; i < 35; i++) spawn();
  setInterval(spawn, 900);
})();

/* ============================================================
   DECK LOGIC
   ============================================================ */
function shuffleDeck () {
  deck = [...TAROT_CARDS];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

/* ============================================================
   CINEMATIC SHUFFLE ANIMATION
   ============================================================ */
function playShuffle (callback) {
  if (isAnimating) return;
  isAnimating = true;
  shuffleBtn.disabled = true;
  
  deckWrapper.classList.add('shuffling');
  deckWrapper.classList.remove('idle');

  const GHOST_COUNT = 8;
  const ghosts = Array.from({ length: GHOST_COUNT }).map((_, i) => {
    const g = document.createElement('div');
    g.className = 'shuffle-ghost spinning-ghost';
    g.innerHTML = '<img src="assets/img/back.jpg" alt="ไพ่">';
    
    const rx = Math.random(); 
    const ry = Math.random();
    g.style.setProperty('--rand-x', rx);
    g.style.setProperty('--rand-y', ry);
    
    shuffleStage.appendChild(g);

    g.style.animation = `spinShuffle 1.2s cubic-bezier(0.25, 1, 0.5, 1) ${i * 0.08}s forwards`;
    
    setTimeout(() => { if (typeof playCardSound === 'function') playCardSound(); }, i * 80);

    return { el: g, delay: i * 80 };
  });

  const totalAnimTime = (GHOST_COUNT - 1) * 80 + 1200 + 100;

  setTimeout(() => {
    ghosts.forEach(g => g.el.remove());

    deckWrapper.classList.remove('shuffling');
    deckWrapper.classList.add('idle');
    isAnimating = false;
    shuffleBtn.disabled = false;
    if (callback) callback();
  }, totalAnimTime);
}

/* ============================================================
   MODE SELECTION
   ============================================================ */
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (isAnimating) return;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    mode = parseInt(btn.dataset.mode);
    resetSession();
  });
});

/* ============================================================
   DRAW FLOW — click deck
   ============================================================ */
deckWrapper.addEventListener('click', onDeckClick);
deckWrapper.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') onDeckClick();
});

function onDeckClick () {
  if (isAnimating || drawsLeft <= 0) return;
  dealCard();
}

function dealCard () {
  if (deck.length === 0) shuffleDeck();
  if (typeof playCardSound === 'function') playCardSound();

  isAnimating = true;
  const card  = deck.pop();
  drawnCards.push(card);
  drawsLeft  -= 1;

  const idx    = drawnCards.length - 1;
  const label  = POSITIONS[mode][idx] || '';

  const slot = spreadArea.querySelector(`.card-slot[data-index="${idx}"]`);
  if (!slot) { isAnimating = false; return; }

  const cardEl = buildCardElement(card, label, idx);
  slot.replaceWith(cardEl);

  cardEl.classList.add('dealing');

  setTimeout(() => {
    cardEl.classList.remove('dealing');
    isAnimating = false;
    updateStatus();

    if (drawsLeft <= 0) {
      deckWrapper.style.opacity  = '.35';
      deckWrapper.style.cursor   = 'not-allowed';
      deckWrapper.onclick        = null;
      deckWrapper.classList.remove('idle');

      drawHint.textContent = 'แตะไพ่แต่ละใบเพื่อเปิดเผยคำทำนาย';
      canFlip = true;

      if (mode > 1 && flippedCount < mode) {
        revealAllBtn.style.display = 'inline-block';
      }
    }
  }, 700);

  // Deck "pop" effect
  const topCard = deckWrapper.querySelector('.deck-top-card');
  if (topCard) {
    topCard.style.transform = 'scale(.93) translateY(4px)';
    setTimeout(() => { topCard.style.transform = ''; }, 180);
  }
}

/* ============================================================
   BUILD CARD ELEMENT (face-down by default)
   ============================================================ */
function buildCardElement (card, posLabel, idx) {
  const wrap        = document.createElement('div');
  wrap.className    = 'tarot-card';
  wrap.dataset.idx  = idx;
  wrap.dataset.name = card.name;

  wrap.innerHTML = `
    <div class="card-inner">
      <!-- Front face (hidden until flip) -->
      <div class="card-face">
        <img src="${card.img}" alt="${card.name}"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="emoji-face" style="display:none">TAROT</div>
        <div class="card-label">${card.name}</div>
      </div>
      <!-- Back face (shown first) -->
      <div class="card-back-face">
        <img src="assets/img/back.jpg" alt="หลังไพ่">
      </div>
    </div>
    ${posLabel ? `<div class="card-position-label">${posLabel}</div>` : ''}
  `;

  wrap.addEventListener('click', () => flipCard(wrap, card, idx));

  return wrap;
}

/* ============================================================
   FLIP CARD (face-down → face-up)
   ============================================================ */
function flipCard (wrap, card, idx) {
  if (drawsLeft > 0) return;
  if (!canFlip) return;
  if (wrap.classList.contains('face-up')) return;

  if (typeof playCardSound === 'function') playCardSound();
  wrap.classList.add('face-up');
  flippedCount += 1;

  updateStatus();

  if (flippedCount >= mode) {
    revealAllBtn.style.display = 'none';
    setTimeout(showResults, 1000);
  }
}

/* ============================================================
   STATUS BAR
   ============================================================ */
function updateStatus () {
  const drawn   = drawnCards.length;
  const total   = mode;
  const flipped = flippedCount;

  if (drawn < total) {
    statusBar.innerHTML = `<span><span class="status-dot"></span>หยิบแล้ว ${drawn}/${total} ใบ</span>`;
  } else if (flipped < total) {
    statusBar.innerHTML = `<span><span class="status-dot"></span>เปิดแล้ว ${flipped}/${total} ใบ</span>`;
  } else {
    statusBar.innerHTML = `<span>เปิดครบแล้ว — กำลังอ่านคำทำนาย</span>`;
  }
}

/* ============================================================
   SPREAD SLOTS
   ============================================================ */
function buildSpread () {
  spreadArea.innerHTML = '';
  const labels = POSITIONS[mode];
  for (let i = 0; i < mode; i++) {
    const slot         = document.createElement('div');
    slot.className     = 'card-slot';
    slot.dataset.index = i;
    slot.innerHTML     = `<span>✦</span><div class="card-position-label">${labels[i] || ''}</div>`;
    spreadArea.appendChild(slot);
  }
}

/* ============================================================
   RESULTS
   ============================================================ */
function showResults () {
  const labels = POSITIONS[mode];
  resultContent.innerHTML = '';

  drawnCards.forEach((card, i) => {
    const item       = document.createElement('div');
    item.className   = 'result-item';

    item.innerHTML = `
      <div class="img-placeholder">TAROT</div>
      <div class="info">
        ${labels[i] ? `<span class="position-tag">${labels[i]}</span>` : ''}
        <h3>${card.name}</h3>
        <p>${card.meaning}</p>
      </div>
    `;

    const img  = new Image();
    img.onload = () => {
      const ph    = item.querySelector('.img-placeholder');
      const ri    = document.createElement('img');
      ri.src      = card.img;
      ri.alt      = card.name;
      ph.replaceWith(ri);
    };
    img.src = card.img;

    resultContent.appendChild(item);
  });

  resultPanel.style.display = 'block';
  aiResponse.style.display = 'none';
  aiResponse.textContent = '';
  setTimeout(() => resultPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  getAiReading();
}

/* ============================================================
   AI READING WITH GROQ (ฟรี — console.groq.com)
   ============================================================ */
async function getAiReading() {
  const apiKey = DEFAULT_GROQ_KEY;
  if (apiKey === 'YOUR_GROQ_API_KEY_HERE' || !apiKey) {
    aiResponse.style.display = 'block';
    aiResponse.textContent = 'ยังไม่ได้ตั้งค่า Secret (YOUR_GROQ_API_KEY_HERE) บน GitHub หรือระบบ Deploy ยังรันไม่เสร็จครับ โปรดตรวจสอบ Settings > Secrets อีกครั้ง';
    return;
  }

  const question = questionInput.value.trim();

  const labels = POSITIONS[mode];
  let cardInfoString = '';
  drawnCards.forEach((card, idx) => {
    const label = labels[idx] ? `(ในตำแหน่ง ${labels[idx]})` : '';
    cardInfoString += `- ไพ่ ${card.name} ${label}: ความหมายพื้นฐานคือ "${card.meaning}"\n`;
  });

  const prompt = `คุณคือแม่หมอไพ่ยิปซีผู้เชี่ยวชาญการทำนายและให้แนวทางชีวิต กรุณาทำนายโชคชะตาด้วยความอ่อนโยน ลึกลับ และน่าดึงดูด

คำถามของผู้ดูดวง: ${question ? `"${question}"` : 'ดูภาพรวมชีวิตทั่วไป'}
จำนวนไพ่ที่สับได้: ${mode} ใบ
ไพ่ที่สับได้มีรายละเอียดดังนี้:
${cardInfoString}

โปรดเรียบเรียงคำทำนายและคำอธิบายโดยละเอียดเป็นภาษาไทย โดยให้มีความเชื่องโยงกันอย่างนุ่มนวลและเหมาะสมกับคำถาม และสรุปข้อคิดเตือนใจท้ายคำทำนายด้วย`;

  askAiBtn.disabled = true;
  askAiBtn.textContent = 'แม่หมอกำลังสื่อสารกับดวงดาว...';
  aiResponse.style.display = 'block';
  aiResponse.textContent = 'กำลังติดต่อสายตรงกับห้วงอวกาศเพื่อรับพลังวิเศษ...';

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
        temperature: 0.85
      })
    });

    const data = await response.json();
    if (data.choices && data.choices[0] && data.choices[0].message) {
      aiResponse.textContent = data.choices[0].message.content;
    } else if (data.error) {
      aiResponse.textContent = `เกิดข้อผิดพลาด: ${data.error.message}`;
    } else {
      aiResponse.textContent = 'ไม่สามารถอ่านพลังงานจากไพ่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง';
    }
  } catch (error) {
    console.error(error);
    aiResponse.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาตรวจสอบ API Key และอินเทอร์เน็ต';
  } finally {
    askAiBtn.disabled = false;
    askAiBtn.textContent = 'ขอคำทำนายจากดวงดาว';
  }
}

askAiBtn.addEventListener('click', getAiReading);

/* ============================================================
   RESET
   ============================================================ */
function resetSession () {
  drawnCards   = [];
  flippedCount = 0;
  drawsLeft    = mode;
  isAnimating  = false;
  canFlip      = false;

  resultPanel.style.display = 'none';
  resultContent.innerHTML   = '';
  revealAllBtn.style.display = 'none';
  
  preRevealQuestion.style.display = 'block';

  deckWrapper.style.opacity = '.35';
  deckWrapper.style.cursor  = 'not-allowed';
  deckWrapper.onclick       = null;
  deckWrapper.classList.remove('idle');

  drawHint.textContent = 'กรุณาตั้งจิตอธิษฐานก่อนเริ่มหยิบไพ่';
  statusBar.innerHTML  = '';
  questionInput.value  = '';
  aiResponse.textContent = '';
  aiResponse.style.display = 'none';

  buildSpread();
  scrollTo({ top: 0, behavior: 'smooth' });
}

/* ============================================================
   REVEAL ALL & CONFIRM QUESTION
   ============================================================ */
confirmQuestionBtn.addEventListener('click', () => {
  preRevealQuestion.style.display = 'none';
  
  deckWrapper.style.opacity = '';
  deckWrapper.style.cursor  = '';
  deckWrapper.onclick       = onDeckClick;
  deckWrapper.classList.add('idle');
  
  drawHint.textContent = 'คลิกที่สำรับเพื่อหยิบไพ่';
  
  if (typeof playAmbientMusic === 'function') playAmbientMusic();
});

revealAllBtn.addEventListener('click', () => {
  if (!canFlip) return;
  if (drawsLeft > 0 || flippedCount >= mode) return;
  revealAllBtn.style.display = 'none';
  
  const cards = spreadArea.querySelectorAll('.tarot-card:not(.face-up)');
  cards.forEach((card, i) => {
    setTimeout(() => {
      card.classList.add('face-up');
      flippedCount += 1;
      updateStatus();
      if (flippedCount >= mode) {
        setTimeout(showResults, 1000);
      }
    }, i * 150);
  });
});

/* ============================================================
   SHUFFLE BUTTON
   ============================================================ */
shuffleBtn.addEventListener('click', () => {
  if (isAnimating) return;
  shuffleDeck();
  playShuffle(() => resetSession());
});

resetBtn.addEventListener('click', resetSession);

/* ============================================================
   WEB AUDIO API (Synthesized BGM & SFX)
   ============================================================ */
let audioCtx;
let ambientGain;
let isAmbientPlaying = false;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function playAmbientMusic() {
  if (isAmbientPlaying) return;
  initAudio();
  isAmbientPlaying = true;
  
  // Sacred Drone (Singing Bowl)
  const droneGain = audioCtx.createGain();
  const now = audioCtx.currentTime;
  droneGain.gain.setValueAtTime(0, now);
  droneGain.gain.linearRampToValueAtTime(0.12, now + 4);
  droneGain.connect(audioCtx.destination);
  
  // Multiple detuned sines for rich beating drone
  [108, 110.5, 216].forEach(f => {
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f;
    osc.connect(droneGain);
    osc.start();
  });

  // Generative Mystical Chimes (Pentatonic Minor scale)
  const scale = [220, 261.63, 293.66, 329.63, 392.00, 440, 523.25, 587.33, 659.25];
  
  function playChime() {
    if (!isAmbientPlaying) return;
    const freq = scale[Math.floor(Math.random() * scale.length)];
    
    const osc = audioCtx.createOscillator();
    osc.type = 'sine'; // pure bell tone
    osc.frequency.value = freq;
    
    const gain = audioCtx.createGain();
    gain.connect(audioCtx.destination);
    osc.connect(gain);
    
    const t = audioCtx.currentTime;
    const attack = 1.5;
    const release = 5.0;
    
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t + attack + release);
    
    osc.start(t);
    osc.stop(t + attack + release);
    
    // Schedule next chime randomly
    setTimeout(playChime, Math.random() * 4000 + 1500);
  }
  
  // Start two independent chime layers
  playChime();
  setTimeout(playChime, 2500);
}

function playCardSound() {
  try {
    initAudio();
    const dur = 0.25;
    const bufferSize = audioCtx.sampleRate * dur;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.7; // Softer noise
    }
    
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    
    // Bandpass for a softer paper sound (not too sharp)
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 0.7;
    
    const gain = audioCtx.createGain();
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.04); // Slower attack (soft whoosh)
    gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    noise.start();
  } catch(e) {}
}

/* ============================================================
   INIT
   ============================================================ */
shuffleDeck();
resetSession();
