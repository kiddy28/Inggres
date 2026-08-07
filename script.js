/* ===================== KONEKSI SUPABASE ===================== */
const SUPABASE_URL = 'https://kcskkvvvppccjowroopx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtjc2trdnZ2cHBjY2pvd3Jvb3B4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwNjA5NjYsImV4cCI6MjEwMTYzNjk2Nn0.vX6zrEXc6uirLCYlGc8BqTBypDUzpjGyanQSADwhzPs';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===================== DATA PAKET ===================== */
const packages = [
  { id: 'sd-vocab', title: 'Kosakata Sehari-hari (Daily Vocab)', level: 'SD13', count: 20, desc: 'Mengenal nama buah, hewan, & benda sekitar' },
  { id: 'sd-basic', title: 'Grammar Dasar & Vocabulary', level: 'SD46', count: 20, desc: 'Latihan dasar kata kerja & penyusunan kalimat' },
  { id: 'smp-tenses', title: 'Simple Present & Past Tense', level: 'SMP', count: 20, desc: 'Latihan tenses untuk percakapan harian' },
  { id: 'sma-advanced', title: 'Conditional & Passive Voice', level: 'SMA', count: 20, desc: 'Persiapan ujian & pemahaman tingkat lanjut' }
];
/* ===================== DATA PAKET & SOAL ===================== */
const packages = [
  { id: 'sd-vocab', title: 'Kosakata Sehari-hari (Daily Vocab)', level: 'SD13', count: 5, desc: 'Mengenal nama buah, hewan, & benda sekitar' },
  { id: 'sd-basic', title: 'Grammar Dasar & Vocabulary', level: 'SD46', count: 5, desc: 'Latihan dasar kata kerja & penyusunan kalimat' },
  { id: 'smp-tenses', title: 'Simple Present & Past Tense', level: 'SMP', count: 5, desc: 'Latihan tenses untuk percakapan harian' },
  { id: 'sma-advanced', title: 'Conditional & Passive Voice', level: 'SMA', count: 5, desc: 'Persiapan ujian & pemahaman tingkat lanjut' }
];

const questionBank = {
  'sd-vocab': [
    {
      text: "Look at the picture! I eat an ___ in the morning.",
      image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400", // Contoh Gambar Apel
      hint: "Buah berwarna merah dan rasanya manis.",
      options: ["Apple", "Banana", "Cat", "House"],
      correct: 0,
      explain: [
        { text: "BENAR! 'Apple' adalah buah apel.", example: "An apple a day keeps the doctor away." },
        { text: "Salah. 'Banana' artinya pisang.", example: "Monkeys love bananas." },
        { text: "Salah. 'Cat' adalah hewan kucing.", example: "The cat is sleeping." },
        { text: "Salah. 'House' artinya rumah.", example: "This is my house." }
      ]
    },
    {
      text: "Look at the animal! An elephant is very ___.",
      image: "https://images.unsplash.com/photo-1557050543-4d5f4e07ef46?w=400", // Contoh Gambar Gajah
      hint: "Gajah adalah hewan yang berukuran sangat besar.",
      options: ["Small", "Big", "Thin", "Short"],
      correct: 1,
      explain: [
        { text: "Salah. 'Small' artinya kecil.", example: "An ant is small." },
        { text: "BENAR! 'Big' artinya besar.", example: "An elephant has a big body." },
        { text: "Salah. 'Thin' artinya kurus/tipis.", example: "Paper is thin." },
        { text: "Salah. 'Short' artinya pendek.", example: "Grass is short." }
      ]
    }
  ]
};

const defaultQuestions = questionBank['sd-vocab'];

/* ===================== STATE ===================== */
let currentPkg = null;
let currentQuestions = [];
let qIndex = 0;
let userAnswers = {}; 
let eliminatedOptions = {}; // Format: { 0: Set([2, 3]) }
let currentFontSize = 20;
let bookmarkedQuestions = new Set();

// Timer State
let timerOn = false;
let timerSeconds = 0;
let timerInterval = null;

/* ===================== TEXT TO SPEECH (AUDIO) ===================== */
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Hentikan audio sebelumnya
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9; // Kecepatan pengucapan agak lambat untuk siswa
    window.speechSynthesis.speak(utterance);
  } else {
    alert("Browser kamu tidak mendukung audio pengucapan.");
  }
}

function speakQuestionText() {
  const q = currentQuestions[qIndex];
  speakText(q.text.replace('___', 'blank'));
}

/* ===================== NAVIGATION & CATALOG ===================== */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function scrollToCatalog() {
  document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
}

function filterCatalog(level, event) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  if (event) event.target.classList.add('active');
  renderCatalog(level);
}

function renderCatalog(filter = 'all') {
  const grid = document.getElementById('catalogGrid');
  const filtered = filter === 'all' ? packages : packages.filter(p => p.level === filter);

  grid.innerHTML = filtered.map(p => `
    <div class="pkg-card">
      <span class="badge-level badge-${p.level.toLowerCase()}">${p.level.replace('SD13','SD 1-3').replace('SD46','SD 4-6')}</span>
      <h3 style="margin:0; font-size:18px;">${p.title}</h3>
      <p style="margin:0; font-size:13.5px; color:var(--ink-soft);">${p.desc}</p>
      <button class="btn btn-primary" onclick="startQuiz('${p.id}')">Mulai Latihan</button>
    </div>
  `).join('');
}

/* ===================== QUIZ ENGINE ===================== */
async function startQuiz(pkgId) {
  currentPkg = packages.find(p => p.id === pkgId);
  showView('view-quiz');
  
  // Tampilan loading sementara
  document.getElementById('qText').textContent = 'Memuat soal dari database...';
  document.getElementById('optionsWrap').innerHTML = '';

  try {
    // 1. Ambil seluruh bank soal sesuai level (misal 'SMA') dari Supabase
    const { data: allQuestions, error } = await supabaseClient
      .from('questions')
      .select('*')
      .eq('level', currentPkg.level);

    if (error || !allQuestions || allQuestions.length === 0) {
      alert('Gagal memuat soal dari database atau soal belum diisi!');
      showView('view-landing');
      return;
    }

    // 2. Acak 100 soal tersebut dan ambil 20 soal saja
    currentQuestions = getRandom20(allQuestions);

    // 3. Reset State Kuis
    qIndex = 0;
    userAnswers = {};
    eliminatedOptions = {};
    bookmarkedQuestions.clear();
    
    // Reset Timer
    timerSeconds = 0;
    if (timerOn) startTimerInterval();

    // 4. Render Soal Pertama
    renderQuestion();

  } catch (err) {
    console.error('Error:', err);
    alert('Terjadi kesalahan koneksi ke database.');
    showView('view-landing');
  }
}
function renderQuestion() {
  const q = currentQuestions[qIndex];
  document.getElementById('qProgress').textContent = `${qIndex + 1}/${currentQuestions.length}`;
  document.getElementById('qLevelTag').textContent = `${currentPkg.level.replace('SD13','SD Class 1-3')} Level`;

  // Render Gambar Soal jika ada
  const imgWrap = document.getElementById('qImageWrap');
  const imgEl = document.getElementById('qImage');
  if (q.image) {
    imgEl.src = q.image;
    imgWrap.style.display = 'block';
  } else {
    imgWrap.style.display = 'none';
  }

  const qTextEl = document.getElementById('qText');
  qTextEl.textContent = q.text;
  qTextEl.style.fontSize = currentFontSize + 'px';

  updateBookmarkUI();

  document.getElementById('hintBox').style.display = 'none';
  document.getElementById('hintBox').textContent = q.hint;

  const state = userAnswers[qIndex] || { selected: null, checked: false };
  const currentEliminated = eliminatedOptions[qIndex] || new Set();

  // Render Opsi + Tombol Eliminer
  const optWrap = document.getElementById('optionsWrap');
  optWrap.innerHTML = q.options.map((opt, i) => {
    let classes = ['opt'];
    if (state.checked) {
      if (i === q.correct) classes.push('is-correct');
      else if (i === state.selected) classes.push('is-wrong');
      else classes.push('is-dim');
    } else if (i === state.selected) {
      classes.push('is-selected');
    }

    if (currentEliminated.has(i) && !state.checked) {
      classes.push('is-eliminated');
    }

    return `
      <div class="opt-row">
        <button class="${classes.join(' ')}" ${state.checked ? 'disabled' : ''} onclick="selectOption(${i})">
          <span>${String.fromCharCode(65 + i)}.</span>
          <span>${opt}</span>
        </button>
        ${!state.checked ? `
          <button class="btn-eliminate ${currentEliminated.has(i) ? 'active' : ''}" 
                  onclick="toggleEliminate(${i})" title="Coret Opsi">
            ${currentEliminated.has(i) ? '↩' : '✕'}
          </button>
        ` : ''}
      </div>
    `;
  }).join('');

  const checkBtn = document.getElementById('checkBtn');
  if (state.checked) {
    checkBtn.disabled = true;
    checkBtn.textContent = 'Sudah Diperiksa';
    renderPembahasan();
  } else {
    checkBtn.disabled = state.selected === null;
    checkBtn.textContent = 'Periksa Jawaban';
    document.getElementById('pembahasanWrap').classList.remove('open');
  }

  document.getElementById('prevBtn').disabled = qIndex === 0;
  document.getElementById('nextBtn').textContent = qIndex === currentQuestions.length - 1 ? 'Selesai →' : 'Next →';
}

function selectOption(idx) {
  if (userAnswers[qIndex]?.checked) return;

  userAnswers[qIndex] = { selected: idx, checked: false };
  renderQuestion();
}

function toggleEliminate(optIdx) {
  if (userAnswers[qIndex]?.checked) return;

  if (!eliminatedOptions[qIndex]) eliminatedOptions[qIndex] = new Set();
  
  if (eliminatedOptions[qIndex].has(optIdx)) {
    eliminatedOptions[qIndex].delete(optIdx);
  } else {
    eliminatedOptions[qIndex].add(optIdx);
    if (userAnswers[qIndex]?.selected === optIdx) {
      userAnswers[qIndex].selected = null; // Unselect jika opsi yang dicoret sedang dipilih
    }
  }
  renderQuestion();
}

function checkAnswer() {
  const state = userAnswers[qIndex];
  if (!state || state.selected === null) return;

  state.checked = true;
  renderQuestion();
}

function renderPembahasan() {
  const q = currentQuestions[qIndex];
  const list = document.getElementById('pembahasanList');

  list.innerHTML = q.explain.map((item, i) => `
    <div class="peh-card ${i === q.correct ? 'ok' : 'no'}">
      <div class="peh-header-row">
        <strong>(${String.fromCharCode(65 + i)}) ${q.options[i]} ${i === q.correct ? '✅' : ''}</strong>
        <button class="btn-audio" onclick="speakText('${q.options[i]}')" title="Dengarkan kata">🔊</button>
      </div>
      <p style="margin:6px 0; font-size:13.5px; color:var(--ink);">${item.text}</p>
      
      <div class="peh-example-box">
        <div class="peh-header-row">
          <span class="example-tag">💡 Contoh Kalimat</span>
          <button class="btn-audio" onclick="speakText('${item.example.replace(/'/g, "\\'")}')" style="width:28px;height:28px;font-size:12px;">🔊</button>
        </div>
        <p class="example-text">"${item.example}"</p>
      </div>
    </div>
  `).join('');

  document.getElementById('pembahasanWrap').classList.add('open');
}

/* ===================== TIMER FUNCTIONS ===================== */
function toggleTimer() {
  timerOn = !timerOn;
  const sw = document.getElementById('timerSwitch');
  const val = document.getElementById('timerVal');
  sw.classList.toggle('on', timerOn);
  val.style.display = timerOn ? 'inline' : 'none';

  if (timerOn) startTimerInterval();
  else stopTimerInterval();
}

function startTimerInterval() {
  stopTimerInterval();
  timerInterval = setInterval(() => {
    timerSeconds++;
    const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
    const s = String(timerSeconds % 60).padStart(2, '0');
    document.getElementById('timerVal').textContent = `${m}:${s}`;
  }, 1000);
}

function stopTimerInterval() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

/* ===================== NAVIGASI & PALETTE ===================== */
function prevQuestion() {
  if (qIndex > 0) { qIndex--; renderQuestion(); }
}

function nextQuestion() {
  if (qIndex < currentQuestions.length - 1) { qIndex++; renderQuestion(); } 
  else { finishQuiz(); }
}

function togglePaletteModal() {
  const modal = document.getElementById('paletteModal');
  const isOpen = modal.classList.toggle('open');
  if (isOpen) renderPalette();
}

function renderPalette() {
  const grid = document.getElementById('paletteGrid');
  grid.innerHTML = currentQuestions.map((_, i) => {
    const state = userAnswers[i];
    let cls = 'p-num';
    if (i === qIndex) cls += ' is-current';
    else if (state?.checked) cls += ' is-checked';
    else if (state?.selected !== null && state?.selected !== undefined) cls += ' is-selected';

    return `<button class="${cls}" onclick="jumpToQuestion(${i})">${i + 1}</button>`;
  }).join('');
}

function jumpToQuestion(i) {
  qIndex = i;
  togglePaletteModal();
  renderQuestion();
}

/* ===================== EXTRA TOOLS & RESULT ===================== */
function changeFontSize(delta) {
  currentFontSize = Math.min(Math.max(currentFontSize + delta, 16), 28);
  document.getElementById('qText').style.fontSize = currentFontSize + 'px';
}

function toggleHint() {
  const box = document.getElementById('hintBox');
  box.style.display = box.style.display === 'block' ? 'none' : 'block';
}

function toggleBookmark() {
  if (bookmarkedQuestions.has(qIndex)) bookmarkedQuestions.delete(qIndex);
  else bookmarkedQuestions.add(qIndex);
  updateBookmarkUI();
}

function updateBookmarkUI() {
  const btn = document.getElementById('bookmarkBtn');
  if (bookmarkedQuestions.has(qIndex)) {
    btn.classList.add('active');
    btn.innerHTML = '🔖 <span>Tersimpan</span>';
  } else {
    btn.classList.remove('active');
    btn.innerHTML = '🔖 <span>Tandai Soal</span>';
  }
}

function exitQuiz() {
  if (confirm("Yakin ingin keluar? Progres kuis akan hilang.")) {
    stopTimerInterval();
    showView('view-landing');
  }
}

function finishQuiz() {
  stopTimerInterval();
  showView('view-result');
  let correctCount = 0;

  currentQuestions.forEach((q, i) => {
    if (userAnswers[i]?.selected === q.correct) correctCount++;
  });

  const accuracy = Math.round((correctCount / currentQuestions.length) * 100);
  document.getElementById('scoreAccuracy').textContent = accuracy + '%';
  document.getElementById('scoreStats').textContent = `Kamu menjawab benar ${correctCount} dari ${currentQuestions.length} soal.`;

  if (accuracy >= 80 && typeof confetti === 'function') {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }

  renderRecapData('all');
}

let activeRecapFilter = 'all';
function switchRecapTab(filter, event) {
  activeRecapFilter = filter;
  document.querySelectorAll('.recap-tab').forEach(t => t.classList.remove('active'));
  if (event) event.target.classList.add('active');
  renderRecapData(filter);
}

function renderRecapData(filter = 'all') {
  const content = document.getElementById('recapContent');
  
  const list = currentQuestions.map((q, i) => {
    const isBookmarked = bookmarkedQuestions.has(i);
    if (filter === 'bookmarked' && !isBookmarked) return '';

    const ans = userAnswers[i];
    const isCorrect = ans && ans.selected === q.correct;
    const ansText = ans && ans.selected !== null ? `(${String.fromCharCode(65 + ans.selected)}) ${q.options[ans.selected]}` : 'Belum dijawab';

    return `
      <div style="background:#fff; border-radius:12px; padding:16px; margin-bottom:12px; border:1px solid var(--rule);">
        <p style="font-weight:800; margin:0 0 8px;">${i + 1}. ${q.text} ${isBookmarked ? '🔖' : ''}</p>
        <p style="margin:0; font-size:14px; color:${isCorrect ? 'var(--green)' : 'var(--red)'};">
          Jawabanmu: ${ansText}
        </p>
      </div>
    `;
  }).join('');

  content.innerHTML = list || '<p style="color:var(--ink-soft); text-align:center;">Tidak ada soal yang ditandai.</p>';
}

function toggleRecap() {
  const box = document.getElementById('recapBox');
  box.style.display = box.style.display === 'block' ? 'none' : 'block';
}

function restartQuiz() {
  startQuiz(currentPkg.id);
}

// Inisialisasi
renderCatalog();

/* ===================== CUSTOM EXIT MODAL LOGIC ===================== */
function exitQuiz() {
  openExitModal();
}

function openExitModal() {
  document.getElementById('exitModal').classList.add('open');
}

function closeExitModal() {
  document.getElementById('exitModal').classList.remove('open');
}

function confirmExit() {
  closeExitModal();

  /* Fungsi Mengacak Array & Memotong Jadi 20 Soal */
function getRandom20(arraySoal) {
  const shuffled = [...arraySoal];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, 20);
}
