/**
 * Interactive Quiz App — Tugas Rutin 6
 * Fitur inti:
 *  - Minimal 5 soal pilihan ganda (pool 18 soal, diambil 6 acak tiap sesi —
 *    tiap user cenderung mendapat kombinasi soal berbeda)
 *  - Soal & opsi dirender dengan createElement + textContent (bukan innerHTML)
 *  - Event delegation pada container opsi jawaban
 *  - Skor otomatis di akhir quiz
 *  - High score tersimpan di localStorage (dengan fallback aman bila tidak tersedia)
 *  - Navigasi antar tampilan tanpa reload halaman (SPA pattern, toggle class)
 *  - Feedback visual: benar = hijau, salah = merah
 *  - Tombol restart untuk mengulang quiz
 * Bonus:
 *  - Timer per soal (15 detik), progress bar visual, kategori soal (random),
 *    animasi transisi antar soal, dark mode toggle
 */

// ---------- Storage helper (localStorage dengan fallback in-memory) ----------
// Beberapa lingkungan (mis. preview sandbox) memblokir localStorage.
// Helper ini mencoba localStorage dulu, lalu jatuh ke variabel biasa jika gagal.
const Storage = (() => {
  let memoryFallback = {};
  let available = true;
  try {
    const testKey = '__quiz_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
  } catch {
    available = false;
  }

  return {
    get(key) {
      if (available) return window.localStorage.getItem(key);
      return memoryFallback[key] ?? null;
    },
    set(key, value) {
      if (available) {
        window.localStorage.setItem(key, value);
      } else {
        memoryFallback[key] = value;
      }
    },
  };
})();

// ---------- Pool soal (dikelompokkan per kategori) ----------
// Pool berisi 18 soal dari 3 kategori (6 tiap kategori). Tiap sesi quiz akan
// mengambil QUESTION_COUNT soal secara acak dari pool ini (lihat pickRandomQuestions),
// sehingga user berbeda kemungkinan besar mendapat set soal yang berbeda pula.
const QUESTIONS = [
  {
    category: 'HTML',
    question: 'Tag HTML manakah yang digunakan untuk membuat tautan (link)?',
    options: ['<link>', '<a>', '<href>', '<nav>'],
    correctIndex: 1,
  },
  {
    category: 'HTML',
    question: 'Atribut apa yang wajib diisi pada tag <img> untuk aksesibilitas?',
    options: ['src', 'alt', 'title', 'width'],
    correctIndex: 1,
  },
  {
    category: 'HTML',
    question: 'Elemen HTML5 mana yang tepat untuk membungkus navigasi utama situs?',
    options: ['<section>', '<div>', '<nav>', '<header>'],
    correctIndex: 2,
  },
  {
    category: 'HTML',
    question: 'Elemen HTML mana yang digunakan untuk membuat daftar bernomor?',
    options: ['<ul>', '<ol>', '<li>', '<dl>'],
    correctIndex: 1,
  },
  {
    category: 'HTML',
    question: 'Apa kegunaan atribut "placeholder" pada elemen <input>?',
    options: ['Mengatur nilai default yang ikut terkirim', 'Menampilkan teks petunjuk yang hilang saat mulai mengetik', 'Memvalidasi format input', 'Menyembunyikan input dari layar'],
    correctIndex: 1,
  },
  {
    category: 'HTML',
    question: 'Tag mana yang digunakan untuk menyisipkan video di halaman web?',
    options: ['<media>', '<video>', '<movie>', '<embed>'],
    correctIndex: 1,
  },
  {
    category: 'CSS',
    question: 'Properti CSS apa yang digunakan untuk mengubah warna teks?',
    options: ['background-color', 'text-style', 'color', 'font-color'],
    correctIndex: 2,
  },
  {
    category: 'CSS',
    question: 'Apa fungsi utama Flexbox dalam CSS?',
    options: ['Mengatur warna elemen', 'Mengatur tata letak elemen dalam satu baris/kolom', 'Menambahkan animasi', 'Mengubah ukuran font otomatis'],
    correctIndex: 1,
  },
  {
    category: 'CSS',
    question: 'Satuan CSS mana yang ukurannya relatif terhadap ukuran font elemen induk (root)?',
    options: ['px', 'rem', 'cm', 'pt'],
    correctIndex: 1,
  },
  {
    category: 'CSS',
    question: 'Properti CSS apa yang mengatur jarak antar elemen di luar border-nya?',
    options: ['padding', 'margin', 'gap', 'border-spacing'],
    correctIndex: 1,
  },
  {
    category: 'CSS',
    question: 'Apa perbedaan utama "position: absolute" dibanding "position: static"?',
    options: ['Absolute selalu berada di tengah layar', 'Absolute posisinya dihitung relatif terhadap elemen induk yang punya position selain static', 'Keduanya sama saja', 'Absolute hanya berlaku untuk gambar'],
    correctIndex: 1,
  },
  {
    category: 'CSS',
    question: 'Selector CSS mana yang memilih elemen berdasarkan id?',
    options: ['.class', '#id', '*element', '[attr]'],
    correctIndex: 1,
  },
  {
    category: 'JavaScript',
    question: 'Kata kunci JavaScript mana yang membuat variabel tidak bisa diubah ulang nilainya (immutable reference)?',
    options: ['var', 'let', 'const', 'static'],
    correctIndex: 2,
  },
  {
    category: 'JavaScript',
    question: 'Method DOM apa yang digunakan untuk membuat elemen HTML baru lewat JavaScript?',
    options: ['document.createElement()', 'document.newElement()', 'document.addElement()', 'document.makeNode()'],
    correctIndex: 0,
  },
  {
    category: 'JavaScript',
    question: 'Apa yang dilakukan async/await dalam JavaScript?',
    options: ['Mempercepat eksekusi kode', 'Menulis kode asynchronous dengan gaya penulisan yang terlihat synchronous', 'Mengganti fungsi menjadi loop', 'Menghapus kebutuhan fetch API'],
    correctIndex: 1,
  },
  {
    category: 'JavaScript',
    question: 'Method array mana yang memproses tiap elemen dan mengembalikan array baru hasil transformasi?',
    options: ['forEach', 'map', 'filter', 'reduce'],
    correctIndex: 1,
  },
  {
    category: 'JavaScript',
    question: 'Apa hasil dari typeof null di JavaScript?',
    options: ["'null'", "'undefined'", "'object'", "'number'"],
    correctIndex: 2,
  },
  {
    category: 'JavaScript',
    question: 'Operator mana yang membandingkan nilai sekaligus tipe data (strict equality)?',
    options: ['==', '===', '=', '!='],
    correctIndex: 1,
  },
];

const QUESTION_COUNT = 6; // jumlah soal yang dimainkan tiap sesi (diacak dari pool)
const TIME_PER_QUESTION = 15;
const HIGH_SCORE_KEY = 'quizHighScore';

// ---------- Utilitas acak ----------

// Mengacak urutan array secara acak (Fisher-Yates), tanpa mengubah array asli
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Mengacak urutan opsi jawaban pada satu soal, sekaligus menyesuaikan correctIndex
// agar tetap menunjuk ke jawaban yang benar setelah diacak.
function shuffleQuestionOptions(question) {
  const indices = shuffleArray(question.options.map((_, i) => i));
  const options = indices.map((i) => question.options[i]);
  const correctIndex = indices.indexOf(question.correctIndex);
  return { ...question, options, correctIndex };
}

// Mengambil sejumlah soal secara acak dari pool, mencakup kategori secara acak,
// dan turut mengacak urutan opsi jawaban tiap soal.
function pickRandomQuestions(pool, count) {
  const shuffledPool = shuffleArray(pool);
  const selected = shuffledPool.slice(0, count);
  return selected.map(shuffleQuestionOptions);
}

// ---------- State ----------
const state = {
  quizQuestions: [],
  currentIndex: 0,
  score: 0,
  answered: false,
  timeLeft: TIME_PER_QUESTION,
  timerId: null,
};

// ---------- Elemen ----------
const el = {
  views: {
    start: document.getElementById('view-start'),
    quiz: document.getElementById('view-quiz'),
    result: document.getElementById('view-result'),
  },
  card: document.getElementById('quizCard'),
  highScoreValue: document.getElementById('highScoreValue'),
  startBtn: document.getElementById('startBtn'),
  progressFill: document.getElementById('progressFill'),
  questionCounter: document.getElementById('questionCounter'),
  categoryBadge: document.getElementById('categoryBadge'),
  timer: document.getElementById('timer'),
  questionText: document.getElementById('questionText'),
  optionsContainer: document.getElementById('optionsContainer'),
  feedback: document.getElementById('feedback'),
  nextBtn: document.getElementById('nextBtn'),
  resultEmoji: document.getElementById('resultEmoji'),
  ringFill: document.getElementById('ringFill'),
  resultScore: document.getElementById('resultScore'),
  resultTotal: document.getElementById('resultTotal'),
  resultMessage: document.getElementById('resultMessage'),
  resultHighscoreNote: document.getElementById('resultHighscoreNote'),
  restartBtn: document.getElementById('restartBtn'),
  themeToggle: document.getElementById('themeToggle'),
  confettiLayer: document.getElementById('confettiLayer'),
};

// Warna aksen khas tiap kategori (dibaca dari CSS custom properties)
const CATEGORY_COLOR_VAR = {
  HTML: '--cat-html',
  CSS: '--cat-css',
  JavaScript: '--cat-js',
};

function setCurrentCategoryColor(varName) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  el.card.style.setProperty('--cat-current', value || 'var(--accent)');
}

// ---------- Navigasi SPA (tanpa reload) ----------
function showView(name) {
  Object.entries(el.views).forEach(([key, section]) => {
    section.classList.toggle('active', key === name);
  });
}

// ---------- Render soal via createElement + textContent (event delegation) ----------
function renderQuestion() {
  const q = state.quizQuestions[state.currentIndex];
  state.answered = false;

  el.questionCounter.textContent = `Soal ${state.currentIndex + 1} dari ${state.quizQuestions.length}`;
  el.categoryBadge.textContent = q.category;
  el.progressFill.style.width = `${(state.currentIndex / state.quizQuestions.length) * 100}%`;
  setCurrentCategoryColor(CATEGORY_COLOR_VAR[q.category]);

  el.questionText.textContent = q.question;

  // Bersihkan opsi lama, lalu bangun elemen baru murni lewat DOM API
  el.optionsContainer.textContent = '';
  const letters = ['A', 'B', 'C', 'D'];

  q.options.forEach((optionText, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.dataset.index = String(index);

    const letterSpan = document.createElement('span');
    letterSpan.className = 'letter';
    letterSpan.textContent = letters[index];

    const labelSpan = document.createElement('span');
    labelSpan.textContent = optionText;

    button.appendChild(letterSpan);
    button.appendChild(labelSpan);
    el.optionsContainer.appendChild(button);
  });

  el.feedback.textContent = '';
  el.feedback.className = 'feedback';
  el.nextBtn.style.display = 'none';

  startTimer();
}

// Satu event listener untuk seluruh opsi (event delegation), bukan per tombol
el.optionsContainer.addEventListener('click', (event) => {
  const target = event.target.closest('.option');
  if (!target || state.answered) return;
  handleAnswer(Number(target.dataset.index));
});

function startTimer() {
  clearInterval(state.timerId);
  state.timeLeft = TIME_PER_QUESTION;
  updateTimerDisplay();

  state.timerId = setInterval(() => {
    state.timeLeft -= 1;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      clearInterval(state.timerId);
      if (!state.answered) handleAnswer(null); // waktu habis = tidak menjawab
    }
  }, 1000);
}

function updateTimerDisplay() {
  el.timer.textContent = String(state.timeLeft);
  el.timer.classList.toggle('low', state.timeLeft <= 5);
}

function handleAnswer(selectedIndex) {
  state.answered = true;
  clearInterval(state.timerId);

  const q = state.quizQuestions[state.currentIndex];
  const buttons = [...el.optionsContainer.children];
  const isCorrect = selectedIndex === q.correctIndex;

  buttons.forEach((btn, index) => {
    btn.disabled = true;
    if (index === q.correctIndex) {
      btn.classList.add('correct');
    } else if (index === selectedIndex) {
      btn.classList.add('wrong');
    }
  });

  if (isCorrect) {
    state.score += 1;
    el.feedback.textContent = '✓ Benar!';
    el.feedback.className = 'feedback good';
  } else if (selectedIndex === null) {
    el.feedback.textContent = `⏱ Waktu habis — jawaban benar: ${letterFor(q.correctIndex)}`;
    el.feedback.className = 'feedback bad';
  } else {
    el.feedback.textContent = `✗ Kurang tepat — jawaban benar: ${letterFor(q.correctIndex)}`;
    el.feedback.className = 'feedback bad';
  }

  el.nextBtn.textContent = state.currentIndex === state.quizQuestions.length - 1 ? 'Lihat Hasil' : 'Lanjut';
  el.nextBtn.style.display = 'block';
}

function letterFor(index) {
  return ['A', 'B', 'C', 'D'][index];
}

el.nextBtn.addEventListener('click', () => {
  state.currentIndex += 1;
  if (state.currentIndex < state.quizQuestions.length) {
    renderQuestion();
  } else {
    finishQuiz();
  }
});

function finishQuiz() {
  clearInterval(state.timerId);
  el.progressFill.style.width = '100%';

  const total = state.quizQuestions.length;
  const ratio = state.score / total;
  const previousHigh = Number(Storage.get(HIGH_SCORE_KEY) ?? 0);
  const isNewHigh = state.score > previousHigh;

  if (isNewHigh) {
    Storage.set(HIGH_SCORE_KEY, String(state.score));
  }

  el.resultScore.textContent = String(state.score);
  el.resultTotal.textContent = String(total);
  el.resultEmoji.textContent = scoreEmoji(ratio);
  el.resultMessage.textContent = scoreMessage(ratio);
  el.resultHighscoreNote.textContent = isNewHigh
    ? '🎉 Rekor baru! Skor tertinggimu sekarang diperbarui.'
    : `Skor tertinggi saat ini: ${Math.max(previousHigh, state.score)} / ${total}`;

  fillScoreRing(ratio);
  showView('result');

  if (isNewHigh) launchConfetti();
}

function scoreEmoji(ratio) {
  if (ratio === 1) return '🏆';
  if (ratio >= 0.7) return '🎉';
  if (ratio >= 0.4) return '🙂';
  return '💪';
}

function scoreMessage(ratio) {
  if (ratio === 1) return 'Sempurna! Pemahamanmu sangat baik.';
  if (ratio >= 0.7) return 'Bagus! Sedikit lagi menuju sempurna.';
  if (ratio >= 0.4) return 'Lumayan, terus berlatih ya.';
  return 'Jangan menyerah, coba lagi!';
}

// Mengisi lingkaran skor (SVG) sesuai persentase jawaban benar
function fillScoreRing(ratio) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  el.ringFill.style.strokeDasharray = `${circumference}`;
  // Set dulu ke "kosong" lalu animasikan ke nilai sebenarnya (efek mengisi)
  el.ringFill.style.strokeDashoffset = `${circumference}`;
  requestAnimationFrame(() => {
    el.ringFill.style.strokeDashoffset = `${circumference * (1 - ratio)}`;
  });
  el.ringFill.style.stroke = ratio >= 0.7 ? 'var(--good)' : ratio >= 0.4 ? 'var(--accent)' : 'var(--bad)';
}

// Efek confetti singkat saat rekor skor tertinggi baru tercapai
function launchConfetti() {
  const colors = ['var(--cat-html)', 'var(--cat-css)', 'var(--cat-js)', 'var(--good)', 'var(--accent)'];
  const pieceCount = 24;

  for (let i = 0; i < pieceCount; i += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = `${1.4 + Math.random() * 1}s`;
    piece.style.animationDelay = `${Math.random() * 0.3}s`;
    el.confettiLayer.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove());
  }
}

function startQuiz() {
  state.quizQuestions = pickRandomQuestions(QUESTIONS, QUESTION_COUNT);
  state.currentIndex = 0;
  state.score = 0;
  showView('quiz');
  renderQuestion();
}

function updateHighScoreDisplay() {
  const highScore = Storage.get(HIGH_SCORE_KEY);
  el.highScoreValue.textContent = highScore ? `${highScore} / ${QUESTION_COUNT}` : 'Belum ada';
}

// ---------- Event listeners ----------
el.startBtn.addEventListener('click', startQuiz);
el.restartBtn.addEventListener('click', () => {
  updateHighScoreDisplay();
  showView('start');
});

el.themeToggle.addEventListener('click', () => {
  const isLight = document.body.getAttribute('data-theme') === 'light';
  document.body.setAttribute('data-theme', isLight ? 'dark' : 'light');
  el.themeToggle.textContent = isLight ? '☀️ Terang' : '🌙 Gelap';
});

// ---------- Inisialisasi ----------
updateHighScoreDisplay();