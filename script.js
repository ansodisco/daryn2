// ---------------- DATA ----------------
const DICT = [
    { kz: 'сәлеметсіз бе', en: 'hello', ru: 'привет' }, { kz: 'рақмет', en: 'thank you', ru: 'спасибо' }, { kz: 'иә', en: 'yes', ru: 'да' }, { kz: 'жоқ', en: 'no', ru: 'нет' },
    { kz: 'ана', en: 'mother', ru: 'мама' }, { kz: 'әке', en: 'father', ru: 'папа' }, { kz: 'дос', en: 'friend', ru: 'друг' }, { kz: 'үй', en: 'house', ru: 'дом' },
    { kz: 'мысық', en: 'cat', ru: 'кошка' }, { kz: 'ит', en: 'dog', ru: 'собака' }, { kz: 'білім', en: 'knowledge', ru: 'знания' }, { kz: 'кітап', en: 'book', ru: 'книга' },
    { kz: 'мектеп', en: 'school', ru: 'школа' }, { kz: 'алма', en: 'apple', ru: 'яблоко' }, { kz: 'нан', en: 'bread', ru: 'хлеб' }, { kz: 'су', en: 'water', ru: 'вода' },
    { kz: 'қызыл', en: 'red', ru: 'красный' }, { kz: 'жасыл', en: 'green', ru: 'зеленый' }, { kz: 'көк', en: 'blue', ru: 'синий' }, { kz: 'ақ', en: 'white', ru: 'белый' },
    { kz: 'күн', en: 'sun', ru: 'солнце' }, { kz: 'ай', en: 'moon', ru: 'луна' }, { kz: 'тау', en: 'mountain', ru: 'гора' }, { kz: 'өзен', en: 'river', ru: 'река' },
    { kz: 'уақыт', en: 'time', ru: 'время' }, { kz: 'ақша', en: 'money', ru: 'деньги' }, { kz: 'жұмыс', en: 'work', ru: 'работа' }, { kz: 'сөз', en: 'word', ru: 'слово' }
];

// ---------------- UI UTILS ----------------
const UI = {
    get: id => document.getElementById(id),
    show: id => { document.querySelectorAll('.game-screen').forEach(s => s.style.display = 'none'); const el = UI.get(id); if (el) el.style.display = 'block'; },
    showLobby: () => UI.show('screen-lobby'),
    showJoin: () => UI.show('screen-join'),
    log: msg => { const d = UI.get('debug-log'); d.innerHTML += `<div>${msg}</div>`; console.log(msg); },
    status: (id, msg, type = 'neutral') => { const el = UI.get(id); if (el) { el.textContent = msg; el.className = `status ${type}`; } },
    toast: (type) => {
        const t = UI.get(type === 'good' ? 'toast-correct' : 'toast-wrong');
        t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 600);
        if (type === 'good') Sound.play('correct'); else Sound.play('wrong');
    }
};

// ---------------- AUDIO ENGINE (Premium Procedural) ----------------
const Sound = {
    ctx: null,
    init: () => { if (!Sound.ctx) Sound.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    play: (type) => {
        Sound.init();
        const ctx = Sound.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'correct') {
            osc.className = 'triangle';
            osc.frequency.setValueAtTime(523.25, now); // C5
            osc.frequency.exponentialRampToValueAtTime(1046.50, now + 0.1); // C6
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now); osc.stop(now + 0.3);
        } else if (type === 'wrong') {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now); // A2
            osc.frequency.linearRampToValueAtTime(55, now + 0.2); // A1
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
            osc.start(now); osc.stop(now + 0.4);
        } else if (type === 'start') {
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.5);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
            osc.start(now); osc.stop(now + 0.6);
        }
    },
    speak: (text, langCode = 'en', force = false) => {
        if (!force && !document.body.classList.contains('a11y-mode')) return;
        const msg = new SpeechSynthesisUtterance(text);
        if (langCode === 'kz' || langCode === 'kk') msg.lang = 'kk-KZ';
        else if (langCode === 'ru') msg.lang = 'ru-RU';
        else msg.lang = 'en-US';
        window.speechSynthesis.speak(msg);
    }
};

// ---------------- GAME LOGIC ----------------
const Game = {
    mode: 'single', // 'single' or 'multi'
    peer: null,
    conn: null,
    myName: 'Player',
    oppName: 'Bot',
    scoreMe: 0,
    scoreOpp: 0,
    timer: 90,
    interval: null,
    botInterval: null,
    currentQ: null,
    isHost: false,

    init: () => {
        UI.get('inp-ans').addEventListener('keydown', e => { if (e.key === 'Enter') Game.checkAnswer(); });

        // Keyboard Shortcuts for Accessibility
        // Keyboard Shortcuts for Accessibility
        window.addEventListener('keydown', e => {
            // Fix: Allow Space in Textarea for Essay Mode
            const tag = document.activeElement.tagName;
            if (e.code === 'Space' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
                e.preventDefault();
                Game.initVoice();
            }
        });
    },

    createRoom: () => {
        Game.myName = UI.get('inp-name').value.trim() || 'Host';
        Game.isHost = true;
        Game.mode = 'multi';
        const code = Math.random().toString(36).substring(2, 6).toUpperCase();

        UI.status('status-host', 'Creating Room: ' + code + '...');
        UI.get('host-code').textContent = code;

        try {
            Game.peer = new Peer('kztb-' + code);
            Game.peer.on('open', id => {
                UI.show('screen-host');
            });
            Game.peer.on('connection', conn => {
                Game.conn = conn;
                Game.setupConn();
            });
            Game.peer.on('error', err => {
                if (err.type === 'unavailable-id') {
                    setTimeout(Game.createRoom, 500); // Retry
                } else {
                    UI.status('status-host', 'Error: ' + err.type, 'error');
                }
            });
        } catch (e) { UI.status('status-host', 'PeerJS missing?', 'error'); }
    },

    joinRoom: () => {
        Game.myName = UI.get('inp-name').value.trim() || 'Guest';
        Game.isHost = false;
        Game.mode = 'multi';
        const code = UI.get('inp-code').value.trim().toUpperCase();

        UI.status('status-join', 'Connecting...');

        try {
            Game.peer = new Peer();
            Game.peer.on('open', id => {
                Game.conn = Game.peer.connect('kztb-' + code);
                Game.setupConn();
                setTimeout(() => {
                    if (!Game.conn.open) UI.status('status-join', 'Room not found or busy.', 'error');
                }, 5000);
            });
        } catch (e) { UI.status('status-join', 'Connection error', 'error'); }
    },

    setupConn: () => {
        Game.conn.on('open', () => {
            Game.conn.send({ t: 'hello', name: Game.myName });
        });
        Game.conn.on('data', d => {
            if (d.t === 'hello') {
                Game.oppName = d.name;
                if (Game.isHost) {
                    Game.conn.send({ t: 'start', name: Game.myName });
                    Game.start();
                }
            } else if (d.t === 'start') {
                Game.oppName = d.name;
                Game.mode = 'multi';
                Game.start();
            } else if (d.t === 'score') {
                Game.scoreOpp = d.val;
                Game.updateHUD();
                UI.toast('opp'); // maybe different color
            } else if (d.t === 'end') {
                Game.end();
            }
        });
    },

    startSinglePlayer: () => {
        Game.mode = 'single';
        Game.myName = UI.get('inp-name').value.trim() || 'Player';
        Game.oppName = 'Bot (Hard)';
        Game.start();
    },

    toggleA11y: () => {
        document.body.classList.toggle('a11y-mode');
        const isA11y = document.body.classList.contains('a11y-mode');
        const btn = UI.get('btn-a11y');
        if (btn) btn.textContent = isA11y ? "👁️ Disable Accessibility" : "👁️ Accessibility Mode";

        const bg = document.getElementById('shader-lines-bg');
        if (bg) bg.style.display = isA11y ? 'none' : 'block';
        if (isA11y) Sound.init();
    },


    startCamera: () => {
        UI.show('screen-camera');
        setTimeout(() => Game.requestCameraPermission(), 300);
    },

    toggleCamera: () => {
        const video = UI.get('camera-video');
        const canvas = UI.get('camera-canvas');
        const btn = UI.get('camera-btn');
        const status = UI.get('camera-status');

        if (video.srcObject) {
            // Stop camera
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            btn.textContent = '🎥 Start Camera';
            status.textContent = 'Camera stopped';
            return;
        }

        // Start camera
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            video.srcObject = stream;
            btn.textContent = '🎥 Stop Camera';
            status.textContent = 'Camera active';

            // Draw to canvas
            const canvasCtx = canvas.getContext('2d');
            const drawFrame = () => {
                if (!video.srcObject) return;
                canvasCtx.drawImage(video, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(drawFrame);
            };
            drawFrame();
        }).catch(err => {
            status.textContent = '❌ Camera access denied';
            console.error(err);
        });
    },

    requestCameraPermission: () => {
        // Try to get camera permission
        navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
            const video = UI.get('camera-video');
            video.srcObject = stream;
            video.play();
        }).catch(err => {
            UI.get('camera-status').textContent = '❌ Camera access required';
        });
    },

    submitCameraAnswer: () => {
        const answer = UI.get('camera-answer').value.trim();
        if (!answer) {
            alert('Please type your answer');
            return;
        }
        UI.get('camera-answer').value = '';
        UI.get('camera-status').textContent = `Submitted: "${answer}"`;
    },

    startVoice: () => {
        UI.show('screen-voice');
        Game.voiceAnswer = '';
    },

    toggleVoice: () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Voice input not supported in this browser.");
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        const btn = UI.get('voice-btn');
        const status = UI.get('voice-status');

        recognition.lang = 'en-US';
        recognition.continuous = false;
        recognition.interimResults = false;

        btn.textContent = '⏹️ Stop Recording';
        status.textContent = 'Listening...';

        recognition.onresult = (event) => {
            let transcript = event.results[0][0].transcript;
            transcript = transcript.replace(/[.,!?;:]+$/, '').trim();
            Game.voiceAnswer = transcript;
            UI.get('voice-answer').value = transcript;
            status.textContent = '✓ Recognized: ' + transcript;
            btn.textContent = '🎤 Record Again';
        };

        recognition.onerror = (event) => {
            status.textContent = '❌ Error: ' + event.error;
            btn.textContent = '🎤 Try Again';
        };

        recognition.start();
    },

    submitVoiceAnswer: () => {
        const answer = Game.voiceAnswer || UI.get('voice-answer').value;
        if (!answer) {
            alert('Please speak or type your answer');
            return;
        }
        UI.get('voice-status').textContent = `Submitted: "${answer}"`;
        Game.voiceAnswer = '';
    },

    startEssay: () => {
        UI.show('screen-essay-write');
        UI.get('essay-input').focus();

        // Update word count
        const textarea = UI.get('essay-input');
        textarea.addEventListener('input', () => {
            const words = textarea.value.trim().split(/\s+/).filter(w => w.length > 0).length;
            UI.get('word-count').textContent = words;
        });
    },

    submitEssay: () => {
        const essay = UI.get('essay-input').value.trim();
        if (!essay) {
            alert('Please write something');
            return;
        }

        // Simple feedback logic
        const length = essay.split(/\s+/).length;
        let feedback = 'Great effort! Keep practicing!';

        if (length < 10) {
            feedback = '📝 Too short! Try to write more (at least 10 words).';
        } else if (length < 50) {
            feedback = '✓ Good start! You wrote ' + length + ' words. Try to expand your ideas.';
        } else if (length < 100) {
            feedback = '✓ Excellent! ' + length + ' words. Strong essay with good flow.';
        } else {
            feedback = '🏆 Outstanding! ' + length + ' words. Well-developed and thoughtful essay!';
        }

        UI.get('essay-display').textContent = essay;
        UI.get('essay-feedback').textContent = feedback;
        UI.show('screen-essay-results');
    },


    toggleZen: () => {
        document.body.classList.toggle('zen-active');
        const isZen = document.body.classList.contains('zen-active');
        const btn = UI.get('btn-zen');
        if (btn) btn.textContent = isZen ? "🧘 Disable Zen Mode" : "🧘 Zen Mode (No Timer)";
    },

    initVoice: () => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert("Voice input not supported in this browser.");
            return;
        }
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        // Native Language Support via Game.currentAnswerLang
        // Derived from nextQ(). If undefined/null, default to 'en-US'
        let target = Game.currentAnswerLang || 'en';

        if (target === 'kk' || target === 'kz') recognition.lang = 'kk-KZ';
        else if (target === 'ru') recognition.lang = 'ru-RU';
        else recognition.lang = 'en-US';

        console.log("Voice Init: Language set to", recognition.lang);

        recognition.continuous = false;
        recognition.interimResults = false;

        const micBtn = document.getElementById('mic-btn');
        if (micBtn) micBtn.classList.add('listening');

        recognition.onresult = (event) => {
            let transcript = event.results[0][0].transcript;
            // Remove trailing punctuation (dots, commas, etc.) which annoy users
            transcript = transcript.replace(/[.,!?;:]+$/, '').trim();

            const inputEl = UI.get('inp-ans');
            if (inputEl) {
                inputEl.value = transcript;
                // If in a11y mode, maybe we don't auto-submit? 
                // "user speaks, word is written" -> implies they want to see it. 
                // But efficient play needs auto-submit. 
                // Let's keep auto-submit for flow, but ensure it's visible.
                Game.checkAnswer();
            }
            const micBtn = document.getElementById('mic-btn');
            if (micBtn) micBtn.classList.remove('listening');
        };

        recognition.onerror = (event) => {
            console.error(event.error);
            if (micBtn) micBtn.classList.remove('listening');
        };

        recognition.onend = () => {
            if (micBtn) micBtn.classList.remove('listening');
        };

        recognition.start();
    },

    startReviewMode: () => {
        Game.mode = 'review'; // New mode
        Game.start();
        Game.timer = 120; // 2 minutes
        UI.get('timer').textContent = Game.timer;
        UI.get('label-opp').textContent = "Time Attack";
        // In review mode, Opponent Score could track "Mistakes" or just be hidden?
        // Let's make Opponent Score = Best Streak? Or just hide it?
        // For simplicity, let's keep Opponent Score as 0 (no bot).
        if (Game.botInterval) clearInterval(Game.botInterval);
    },

    start: () => {
        UI.show('screen-game');
        Game.scoreMe = 0;
        Game.scoreOpp = 0;
        Game.timer = (Game.mode === 'review') ? 120 : 60;

        const isZen = document.body.classList.contains('zen-active');

        if (Game.mode !== 'review') {
            UI.get('label-opp').textContent = Game.oppName;
        }

        Game.updateHUD();
        Game.nextQ();
        UI.get('inp-ans').focus();
        Sound.play('start');

        if (!isZen) {
            Game.interval = setInterval(() => {
                Game.timer--;
                UI.get('timer').textContent = Game.timer;
                if (Game.timer <= 0) Game.end();
            }, 1000);
        }

        if (Game.mode === 'single') {
            // Bot logic: randomly score 1 point every 3-7 seconds
            Game.botInterval = setInterval(() => {
                // Smarter bot: difficult increases probability?
                if (Math.random() > 0.4) {
                    Game.scoreOpp++;
                    Game.updateHUD();
                }
            }, 4000);
        }
    },

    nextQ: () => {
        const lang = localStorage.getItem('language') || 'en';
        const targetLang = (lang === 'ru') ? 'ru' : 'en'; // Default to English if not Russian

        const item = DICT[Math.floor(Math.random() * DICT.length)];
        const isKz = Math.random() > 0.5;

        // If isKz=true: Question is KZ, Answer is Target (EN/RU)
        // If isKz=false: Question is Target (EN/RU), Answer is KZ

        // Determine expected answer language for Voice Input
        Game.currentAnswerLang = isKz ? targetLang : 'kk';

        Game.currentQ = {
            q: isKz ? item.kz : item[targetLang],
            a: isKz ? item[targetLang] : item.kz,
            task: isKz ? (translations[lang]['game.ctx_' + targetLang] || 'Kazakh → ' + targetLang.toUpperCase())
                : (targetLang.toUpperCase() + ' → Kazakh')
        };

        // Fix context label logic
        if (translations && translations[lang]) {
            const t = translations[lang];
            // If translating TO Kazakh, show "English -> Kazakh"
            if (!isKz) {
                Game.currentQ.task = (t['game.ctx_' + targetLang + '_rev'] || targetLang.toUpperCase() + ' → Kazakh');
            } else {
                Game.currentQ.task = (t['game.ctx_' + targetLang] || 'Kazakh → ' + targetLang.toUpperCase());
            }
        }

        UI.get('q-ctx').textContent = Game.currentQ.task;
        UI.get('q-text').textContent = Game.currentQ.q;
        UI.get('inp-ans').value = '';
        UI.get('inp-ans').focus();

        Sound.speak(Game.currentQ.q, isKz ? 'kk' : targetLang); // Use 'kk' for Speak
    },

    checkAnswer: () => {
        const val = UI.get('inp-ans').value.trim().toLowerCase();
        if (!val) return;

        const target = Game.currentQ.a.toLowerCase();

        // Simple check
        if (val === target) {
            Game.scoreMe++;
            UI.toast('good');
            if (Game.mode === 'multi') Game.conn.send({ t: 'score', val: Game.scoreMe });
            Game.nextQ();
        } else {
            UI.toast('bad');
            // Don't clear immediately, so user can see what they got wrong (especially for voice)
            // UI.get('inp-ans').value = ''; 
            UI.get('inp-ans').select(); // Highlight for easy overwrite
            UI.get('inp-ans').style.borderColor = 'var(--error-color, red)';
            setTimeout(() => UI.get('inp-ans').style.borderColor = 'var(--border-color, #ccc)', 300);
        }
        Game.updateHUD();
    },

    updateHUD: () => {
        UI.get('score-me').textContent = Game.scoreMe;
        UI.get('score-opp').textContent = Game.scoreOpp;
    },

    end: () => {
        clearInterval(Game.interval);
        if (Game.botInterval) clearInterval(Game.botInterval);
        if (Game.mode === 'multi' && Game.conn) Game.conn.send({ t: 'end' });

        UI.show('screen-results');
        UI.show('screen-results');
        // Fix for typos in IDs: In i.html might be 'final-me'/'final-opp' or 'res-me'/'res-opp'
        // Let's check i.html... 
        // Based on previous view_file of i.html lines 441-442: <strong id="final-me">0</strong>

        const elMe = document.getElementById('final-me') || document.getElementById('res-me');
        const elOpp = document.getElementById('final-opp') || document.getElementById('res-opp');

        if (elMe) elMe.textContent = Game.scoreMe;
        if (elOpp) elOpp.textContent = Game.scoreOpp;

        const won = Game.scoreMe > Game.scoreOpp;
        const tie = Game.scoreMe === Game.scoreOpp;

        const lang = localStorage.getItem('language') || 'en';
        const t = (translations && translations[lang]) ? translations[lang] : translations['en'];

        const msgKey = tie ? 'game.draw' : (won ? 'game.won' : 'game.lost');
        const defaultMsg = tie ? "It's a Draw!" : (won ? 'You Won!' : 'You Lost!');

        let msg = (t && t[msgKey]) ? t[msgKey] : defaultMsg;

        const titleEl = document.getElementById('result-title');
        if (titleEl) {
            titleEl.textContent = msg;
            titleEl.style.color = tie ? '#fbc02d' : (won ? '#4caf50' : '#e53935');
            // Add some fanfare if won?
        }
    }
};

Game.init();
console.log("%c>>> TIL-TALK MAIN ENGINE (GPT-4O-MINI) ACTIVE <<<", "color: #9b6b9e; font-size: 14px; font-weight: bold;");
// ---------------- LANGUAGE UTILS ----------------
let currentLanguage = 'en';

function switchLanguage(lang) {
    // Normalize 'kz' to 'kk'
    if (lang === 'kz') lang = 'kk';

    currentLanguage = lang;
    localStorage.setItem('language', lang);
    updateStaticText();

    // Update active state of buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        let btnLang = btn.dataset.lang;
        if (btnLang === 'kz') btnLang = 'kk'; // Normalize check

        if (btnLang) {
            btn.classList.toggle('active', btnLang === lang);
        }
    });

    // Update placeholders specifically if needed
    const nameInput = document.getElementById('inp-name');
    if (nameInput && translations[lang] && translations[lang]['game.name_placeholder']) {
        nameInput.placeholder = translations[lang]['game.name_placeholder'];
    }
    const roomInput = document.getElementById('inp-code');
    if (roomInput && translations[lang] && translations[lang]['game.room_code_placeholder']) {
        roomInput.placeholder = translations[lang]['game.room_code_placeholder'];
    }
}

function updateStaticText() {
    if (!translations[currentLanguage]) return;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[currentLanguage][key]) {
            el.textContent = translations[currentLanguage][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.dataset.i18nPlaceholder;
        if (translations[currentLanguage][key]) {
            el.placeholder = translations[currentLanguage][key];
        }
    });
}

// ═══════════════════════════════════════════════════════════
// ESSAY BATTLE — AI Judge Mode
// ═══════════════════════════════════════════════════════════

const ESSAY_TOPICS_FALLBACK = [
    "Describe your favorite place in Kazakhstan and explain why it is special to you.",
    "Write about the importance of learning the Kazakh language in today's world.",
    "Imagine you are hosting a foreign guest. Describe a typical Kazakh dinner."
];

const EssayBattle = {
    timer: 300, // 5 minutes
    interval: null,
    topic: '',

    pickTopic() {
        const lang = localStorage.getItem('language') || 'en';
        let topics = [];
        if (translations[lang] && translations[lang]['essay.topics']) {
            topics = translations[lang]['essay.topics'];
        } else {
            topics = ESSAY_TOPICS_FALLBACK;
        }
        return topics[Math.floor(Math.random() * topics.length)];
    },

    start() {
        // Offline practice only
        this.topic = this.pickTopic();
        this.startCommon();
    },

    startCommon() {
        this.timer = 180; // Reduced to 3 minutes for faster testing? Or keep 5? Let's use 300.
        // Actually user said "essay mode overhaul", let's stick to 300 (5 mins)
        this.timer = 300;

        // Show write screen
        UI.show('screen-essay-write');
        document.getElementById('essay-topic-text').textContent = this.topic;
        document.getElementById('essay-input').value = '';
        document.getElementById('essay-word-count').textContent = '0 words';
        document.getElementById('essay-timer').textContent = this.timer;

        // Word count tracker
        document.getElementById('essay-input').addEventListener('input', () => {
            const words = document.getElementById('essay-input').value.trim().split(/\s+/).filter(w => w.length > 0);
            document.getElementById('essay-word-count').textContent = `${words.length} words`;
        });

        // Start timer
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            this.timer--;
            document.getElementById('essay-timer').textContent = this.timer;
            if (this.timer <= 0) {
                clearInterval(this.interval);
                this.submit();
            }
        }, 1000);

        document.getElementById('essay-input').focus();
    },

    async submit() {
        clearInterval(this.interval);
        const essay = document.getElementById('essay-input').value.trim();

        if (!essay || essay.split(/\s+/).length < 5) {
            alert('Please write at least 5 words before submitting.');
            return;
        }

        // Show results screen with loading
        UI.show('screen-essay-results');
        document.getElementById('essay-results-content').innerHTML = `
            <div style="text-align:center; padding:40px;">
                <div style="font-size:2rem; margin-bottom:16px;">🤖</div>
                <p style="color:rgba(255,255,255,0.7);">AI is analyzing your essay...</p>
                <p style="font-size:0.85rem; color:rgba(255,255,255,0.4);">This may take a few seconds.</p>
            </div>
        `;

        try {
            UI.show('screen-loading'); // Make sure this exists or just show status
            const result = await this.evaluate(essay);
            this.showResults(result, essay);
        } catch (e) {
            console.error(e);
            alert('Error evaluating essay. Please try again.');
            UI.show('screen-essay-write');
        }
    },

    async evaluate(essay) {
        const lang = localStorage.getItem('language') || 'en';
        const prompt = `Act as an strict IELTS/TOEFL examiner. Evaluate the following essay (written by a student learning ${lang === 'kz' ? 'Kazakh' : (lang === 'ru' ? 'Russian' : 'English')}).
        
        Essay Topic: "${this.topic}"
        Student Essay: "${essay}"

        Provide output in JSON format ONLY:
        {
          "overall_score": <number 0-100>,
          "grammar_score": <number 0-100>,
          "vocabulary_score": <number 0-100>,
          "coherence_score": <number 0-100>,
          "creativity_score": <number 0-100>,
          "grammar_feedback": "<1-2 sentence feedback on grammar>",
          "vocabulary_feedback": "<1-2 sentence feedback on vocabulary usage>",
          "coherence_feedback": "<1-2 sentence feedback on essay structure and flow>",
          "creativity_feedback": "<1-2 sentence feedback on originality>",
          "overall_feedback": "<2-3 sentence overall assessment>",
          "improved_sentence": "<One example sentence from the essay rewritten better>"
        }`;

        try {
            const result = await this.callChatGPT(prompt);

            // Multiplayer Sync
            if (Game.mode === 'multi' && Game.conn) {
                Game.scoreMe = result.overall_score; // Use overall score as game score
                Game.conn.send({ t: 'score', val: Game.scoreMe });
                // We might need a specific "essay_finish" state to wait for opponent
            }

            return result; // RETURN the result to submit()
        } catch (e) {
            console.error(e);
            throw e; // Rethrow to handle in submit()
        }
    },

    async callChatGPT(prompt) {
        // Now using server-side proxy for security
        console.log('Requesting AI evaluation via proxy...');

        const response = await fetch(
            "api/ai_proxy.php",
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.3,
                    response_format: { type: "json_object" }
                })
            }
        );

        if (!response.ok) {
            console.error('OpenAI API HTTP Error:', response.status, response.statusText);
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`AI Service Error: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
        }

        const data = await response.json();
        let text = data.choices?.[0]?.message?.content || '';

        console.log('ChatGPT Raw Response:', text); // Debugging

        // More robust JSON extraction: find first '{' and last '}'
        const firstBrace = text.indexOf('{');
        const lastBrace = text.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
            text = text.substring(firstBrace, lastBrace + 1);
        }

        try {
            const parsed = JSON.parse(text);
            // Ensure all scores are numbers (ChatGPT sometimes returns strings)
            ['overall_score', 'grammar_score', 'vocabulary_score', 'coherence_score', 'creativity_score'].forEach(key => {
                if (parsed[key] !== undefined) parsed[key] = Number(parsed[key]);
            });
            return parsed;
        } catch (e) {
            console.error('JSON Parse Error:', e);
            console.error('Failed Text:', text);
            throw new Error('Invalid JSON response from AI');
        }
    },

    showResults(result, essay) {
        const wordCount = essay.trim().split(/\s+/).filter(w => w.length > 0).length;
        const timeUsed = 300 - this.timer;
        const minutes = Math.floor(timeUsed / 60);
        const seconds = timeUsed % 60;

        const scoreColor = result.overall_score >= 80 ? 'var(--accent-green)' :
            result.overall_score >= 60 ? 'var(--accent-yellow)' :
                result.overall_score >= 40 ? 'var(--accent-warm)' : 'var(--accent-red)';

        document.getElementById('essay-results-content').innerHTML = `
            <div style="text-align:center; margin-bottom:30px;">
                <div style="font-size:4rem; font-weight:900; color:${scoreColor}; line-height:1;">${result.overall_score}</div>
                <div style="font-size:0.85rem; color:rgba(255,255,255,0.5); text-transform:uppercase; letter-spacing:0.1em; margin-top:4px;">Overall Score</div>
                <div style="font-size:0.8rem; color:rgba(255,255,255,0.4); margin-top:8px;">
                    ${wordCount} words · ${minutes}m ${seconds}s
                </div>
            </div>

            <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:12px; margin-bottom:24px;">
                ${['grammar', 'vocabulary', 'coherence', 'creativity'].map(cat => `
                    <div style="background:rgba(255,255,255,0.05); border-radius:12px; padding:16px; text-align:center;">
                        <div style="font-size:1.8rem; font-weight:900; color:${scoreColor};">${result[cat + '_score']}</div>
                        <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:rgba(255,255,255,0.5); margin:4px 0 8px;">${cat}</div>
                        <div style="font-size:0.8rem; color:rgba(255,255,255,0.7); line-height:1.4;">${result[cat + '_feedback']}</div>
                    </div>
                `).join('')}
            </div>

            <div style="background:rgba(155,107,158,0.1); border-left:3px solid var(--accent-purple); padding:16px 20px; border-radius:0 12px 12px 0; margin-bottom:16px;">
                <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent-purple); font-weight:700; margin-bottom:8px;">Overall Feedback</div>
                <div style="font-size:0.95rem; color:#fff; line-height:1.6;">${result.overall_feedback}</div>
            </div>

            ${result.improved_sentence ? `
                <div style="background:rgba(90,158,142,0.1); border-left:3px solid var(--accent-teal); padding:16px 20px; border-radius:0 12px 12px 0;">
                    <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent-teal); font-weight:700; margin-bottom:8px;">💡 Suggested Improvement</div>
                    <div style="font-size:0.95rem; color:#fff; line-height:1.6; font-style:italic;">${result.improved_sentence}</div>
                </div>
            ` : ''}
        `;

        // SWITCH TO RESULTS SCREEN
        UI.show('screen-essay-results');
    }
};

// ═══════════════════════════════════════════════════════════
// CAMERA LEARN — Object Recognition + Translation
// ═══════════════════════════════════════════════════════════
const OBJECT_TRANSLATIONS = {
    'person': { en: 'person', kz: 'адам', ru: 'человек' },
    'bicycle': { en: 'bicycle', kz: 'велосипед', ru: 'велосипед' },
    'car': { en: 'car', kz: 'автокөлік', ru: 'машина' },
    'motorcycle': { en: 'motorcycle', kz: 'мотоцикл', ru: 'мотоцикл' },
    'airplane': { en: 'airplane', kz: 'ұшақ', ru: 'самолёт' },
    'bus': { en: 'bus', kz: 'автобус', ru: 'автобус' },
    'train': { en: 'train', kz: 'пойыз', ru: 'поезд' },
    'truck': { en: 'truck', kz: 'жүк көлігі', ru: 'грузовик' },
    'boat': { en: 'boat', kz: 'қайық', ru: 'лодка' },
    'traffic light': { en: 'traffic light', kz: 'бағдаршам', ru: 'светофор' },
    'fire hydrant': { en: 'fire hydrant', kz: 'өрт гидранты', ru: 'пожарный гидрант' },
    'stop sign': { en: 'stop sign', kz: 'тоқта белгісі', ru: 'знак стоп' },
    'bench': { en: 'bench', kz: 'орындық', ru: 'скамейка' },
    'bird': { en: 'bird', kz: 'құс', ru: 'птица' },
    'cat': { en: 'cat', kz: 'мысық', ru: 'кошка' },
    'dog': { en: 'dog', kz: 'ит', ru: 'собака' },
    'horse': { en: 'horse', kz: 'ат', ru: 'лошадь' },
    'sheep': { en: 'sheep', kz: 'қой', ru: 'овца' },
    'cow': { en: 'cow', kz: 'сиыр', ru: 'корова' },
    'elephant': { en: 'elephant', kz: 'піл', ru: 'слон' },
    'bear': { en: 'bear', kz: 'аю', ru: 'медведь' },
    'zebra': { en: 'zebra', kz: 'зебра', ru: 'зебра' },
    'giraffe': { en: 'giraffe', kz: 'керік', ru: 'жираф' },
    'backpack': { en: 'backpack', kz: 'рюкзак', ru: 'рюкзак' },
    'umbrella': { en: 'umbrella', kz: 'қолшатыр', ru: 'зонт' },
    'handbag': { en: 'handbag', kz: 'сөмке', ru: 'сумка' },
    'tie': { en: 'tie', kz: 'галстук', ru: 'галстук' },
    'suitcase': { en: 'suitcase', kz: 'чемодан', ru: 'чемодан' },
    'frisbee': { en: 'frisbee', kz: 'фрисби', ru: 'фрисби' },
    'skis': { en: 'skis', kz: 'шаңғы', ru: 'лыжи' },
    'snowboard': { en: 'snowboard', kz: 'сноуборд', ru: 'сноуборд' },
    'sports ball': { en: 'ball', kz: 'доп', ru: 'мяч' },
    'kite': { en: 'kite', kz: 'ұшыртқы', ru: 'воздушный змей' },
    'baseball bat': { en: 'bat', kz: 'бита', ru: 'бита' },
    'skateboard': { en: 'skateboard', kz: 'скейтборд', ru: 'скейтборд' },
    'surfboard': { en: 'surfboard', kz: 'сёрфборд', ru: 'доска для сёрфинга' },
    'tennis racket': { en: 'tennis racket', kz: 'теннис ракеткасы', ru: 'теннисная ракетка' },
    'bottle': { en: 'bottle', kz: 'бөтелке', ru: 'бутылка' },
    'wine glass': { en: 'glass', kz: 'стақан', ru: 'бокал' },
    'cup': { en: 'cup', kz: 'кесе', ru: 'чашка' },
    'fork': { en: 'fork', kz: 'шанышқы', ru: 'вилка' },
    'knife': { en: 'knife', kz: 'пышақ', ru: 'нож' },
    'spoon': { en: 'spoon', kz: 'қасық', ru: 'ложка' },
    'bowl': { en: 'bowl', kz: 'тостаған', ru: 'миска' },
    'banana': { en: 'banana', kz: 'банан', ru: 'банан' },
    'apple': { en: 'apple', kz: 'алма', ru: 'яблоко' },
    'sandwich': { en: 'sandwich', kz: 'сэндвич', ru: 'бутерброд' },
    'orange': { en: 'orange', kz: 'апельсин', ru: 'апельсин' },
    'broccoli': { en: 'broccoli', kz: 'брокколи', ru: 'брокколи' },
    'carrot': { en: 'carrot', kz: 'сәбіз', ru: 'морковь' },
    'hot dog': { en: 'hot dog', kz: 'хот-дог', ru: 'хот-дог' },
    'pizza': { en: 'pizza', kz: 'пицца', ru: 'пицца' },
    'donut': { en: 'donut', kz: 'донат', ru: 'пончик' },
    'cake': { en: 'cake', kz: 'торт', ru: 'торт' },
    'chair': { en: 'chair', kz: 'орындық', ru: 'стул' },
    'couch': { en: 'couch', kz: 'диван', ru: 'диван' },
    'potted plant': { en: 'plant', kz: 'гүл', ru: 'растение' },
    'bed': { en: 'bed', kz: 'кереует', ru: 'кровать' },
    'dining table': { en: 'table', kz: 'үстел', ru: 'стол' },
    'toilet': { en: 'toilet', kz: 'дәретхана', ru: 'туалет' },
    'tv': { en: 'TV', kz: 'теледидар', ru: 'телевизор' },
    'laptop': { en: 'laptop', kz: 'ноутбук', ru: 'ноутбук' },
    'mouse': { en: 'mouse', kz: 'тышқан', ru: 'мышь' },
    'remote': { en: 'remote', kz: 'пульт', ru: 'пульт' },
    'keyboard': { en: 'keyboard', kz: 'пернетақта', ru: 'клавиатура' },
    'cell phone': { en: 'phone', kz: 'телефон', ru: 'телефон' },
    'microwave': { en: 'microwave', kz: 'микротолқынды пеш', ru: 'микроволновка' },
    'oven': { en: 'oven', kz: 'пеш', ru: 'духовка' },
    'toaster': { en: 'toaster', kz: 'тостер', ru: 'тостер' },
    'sink': { en: 'sink', kz: 'раковина', ru: 'раковина' },
    'refrigerator': { en: 'fridge', kz: 'тоңазытқыш', ru: 'холодильник' },
    'book': { en: 'book', kz: 'кітап', ru: 'книга' },
    'clock': { en: 'clock', kz: 'сағат', ru: 'часы' },
    'vase': { en: 'vase', kz: 'ваза', ru: 'ваза' },
    'scissors': { en: 'scissors', kz: 'қайшы', ru: 'ножницы' },
    'teddy bear': { en: 'teddy bear', kz: 'аюлы ойыншық', ru: 'плюшевый мишка' },
    'hair drier': { en: 'hair dryer', kz: 'шаш кептіргіш', ru: 'фен' },
    'toothbrush': { en: 'toothbrush', kz: 'тіс щёткасы', ru: 'зубная щётка' }
};

const CameraLearn = {
    model: null,
    stream: null,
    running: false,
    lastSpokenLabel: '',
    lastSpeakTime: 0,
    speakCooldown: 12000, // 12 seconds

    async start() {
        UI.show('screen-camera');
        const video = document.getElementById('camera-video');
        const status = document.getElementById('camera-status');

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            video.srcObject = this.stream;
            await video.play();

            status.textContent = 'Loading AI model...';
            if (!this.model) {
                this.model = await cocoSsd.load();
            }
            status.textContent = 'Model ready! Detecting objects...';
            this.running = true;
            this.detect(video);
        } catch (err) {
            console.error('Camera error:', err);
            status.textContent = 'Camera error: ' + err.message;
        }
    },

    async detect(video) {
        if (!this.running) return;

        const canvas = document.getElementById('camera-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const predictions = await this.model.detect(video);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const lang = localStorage.getItem('language') || 'en';
        const objectsEl = document.getElementById('camera-objects');
        const seenLabels = new Set();

        predictions.forEach(pred => {
            const [x, y, w, h] = pred.bbox;
            const label = pred.class;
            const trans = OBJECT_TRANSLATIONS[label];

            // Draw bounding box
            ctx.strokeStyle = '#9b6b9e';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // Draw label
            const displayText = trans ? `${trans.kz} / ${trans[lang === 'ru' ? 'ru' : 'en']}` : label;
            ctx.fillStyle = 'rgba(155, 107, 158, 0.85)';
            ctx.fillRect(x, y - 28, ctx.measureText(displayText).width + 16, 28);
            ctx.fillStyle = '#fff';
            ctx.font = '14px Outfit, sans-serif';
            ctx.fillText(displayText, x + 8, y - 8);

            if (!seenLabels.has(label)) {
                seenLabels.add(label);
            }
        });

        // Update detected objects panel
        if (predictions.length > 0) {
            objectsEl.innerHTML = [...seenLabels].map(label => {
                const t = OBJECT_TRANSLATIONS[label] || { en: label, kz: label, ru: label };
                return `<div style="background:rgba(155,107,158,0.2); padding:8px 14px; border-radius:10px; font-size:0.85rem;">
                    <strong style="color:#9b6b9e;">${t.kz}</strong>
                    <span style="color:rgba(255,255,255,0.5); margin:0 4px;">·</span>
                    <span>${t.en}</span>
                    <span style="color:rgba(255,255,255,0.5); margin:0 4px;">·</span>
                    <span>${t.ru}</span>
                </div>`;
            }).join('');
        }

        requestAnimationFrame(() => this.detect(video));

        // Real-time Voice Announcement Logic
        if (predictions.length > 0) {
            // Find most confident prediction
            const best = predictions.sort((a, b) => b.score - a.score)[0];
            const trans = OBJECT_TRANSLATIONS[best.class];

            if (best.score > 0.65 && trans) {
                const now = Date.now();
                const isSpeaking = window.speechSynthesis.speaking;

                // Only speak if:
                // 1. We aren't currently speaking anything
                // 2. AND (It's a new object OR sufficient time has passed)
                if (!isSpeaking && (best.class !== this.lastSpokenLabel || (now - this.lastSpeakTime > this.speakCooldown))) {
                    const speechText = `Камерада ${trans.kz} көрінеді, оның ағылшынша аудармасы — ${trans.en}`;
                    Sound.speak(speechText, 'kk', true);
                    this.lastSpokenLabel = best.class;
                    this.lastSpeakTime = now;
                }
            }
        }
    },

    stop() {
        this.running = false;
        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }
        UI.show('screen-lobby');
    }
};

// ═══════════════════════════════════════════════════════════
// VOICE TRANSLATE — Speech Recognition + Translation
// ═══════════════════════════════════════════════════════════
const VoiceTranslate = {
    recognition: null,
    active: false,

    start() {
        UI.show('screen-voice');
        document.getElementById('voice-recognized').textContent = '';
        document.getElementById('voice-translations').innerHTML = '';
        document.getElementById('voice-status').textContent = 'Tap mic to start';
        this.active = true;
    },

    listen() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice recognition not supported in this browser.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;

        // Detect input language based on current setting
        const lang = localStorage.getItem('language') || 'en';
        if (lang === 'kk' || lang === 'kz') {
            this.recognition.lang = 'kk-KZ';
        } else if (lang === 'ru') {
            this.recognition.lang = 'ru-RU';
        } else {
            this.recognition.lang = 'en-US';
        }

        const micBtn = document.getElementById('voice-mic-btn');
        micBtn.style.transform = 'scale(1.1)';
        micBtn.style.boxShadow = '0 0 30px rgba(155, 107, 158, 0.5)';
        document.getElementById('voice-status').textContent = 'Listening...';

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            document.getElementById('voice-recognized').textContent = `"${transcript}"`;
            this.translate(transcript);
        };

        this.recognition.onerror = (event) => {
            console.error('Voice error:', event.error);
            document.getElementById('voice-status').textContent = 'Error: ' + event.error;
            micBtn.style.transform = '';
            micBtn.style.boxShadow = '';
        };

        this.recognition.onend = () => {
            micBtn.style.transform = '';
            micBtn.style.boxShadow = '';
            document.getElementById('voice-status').textContent = 'Tap mic to speak again';
        };

        this.recognition.start();
    },

    translate(text) {
        const lower = text.toLowerCase().replace(/[.,!?;:]+$/, '').trim();

        // Search in DICT (from game)
        let found = null;
        for (const item of DICT) {
            if (item.kz.toLowerCase() === lower || item.en.toLowerCase() === lower || item.ru.toLowerCase() === lower) {
                found = item;
                break;
            }
        }

        // Also check OBJECT_TRANSLATIONS
        if (!found) {
            for (const [key, val] of Object.entries(OBJECT_TRANSLATIONS)) {
                if (val.en.toLowerCase() === lower || val.kz.toLowerCase() === lower || val.ru.toLowerCase() === lower) {
                    found = { kz: val.kz, en: val.en, ru: val.ru };
                    break;
                }
            }
        }

        const transEl = document.getElementById('voice-translations');

        if (found) {
            transEl.innerHTML = `
                <div style="background:rgba(90,158,142,0.15); padding:16px; border-radius:12px; text-align:center;">
                    <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent-teal); margin-bottom:6px;">Kazakh</div>
                    <div style="font-size:1.2rem; font-weight:700;">${found.kz}</div>
                </div>
                <div style="background:rgba(155,107,158,0.15); padding:16px; border-radius:12px; text-align:center;">
                    <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent-purple); margin-bottom:6px;">English</div>
                    <div style="font-size:1.2rem; font-weight:700;">${found.en}</div>
                </div>
                <div style="background:rgba(204,87,104,0.15); padding:16px; border-radius:12px; text-align:center;">
                    <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:0.1em; color:var(--accent-pink); margin-bottom:6px;">Russian</div>
                    <div style="font-size:1.2rem; font-weight:700;">${found.ru}</div>
                </div>
            `;
        } else {
            transEl.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; color:rgba(255,255,255,0.5); padding:16px;">
                    <p>Word "<strong>${text}</strong>" not found in dictionary.</p>
                    <p style="font-size:0.8rem; margin-top:8px;">Try saying a common word like: <em>cat, dog, book, water, hello</em></p>
                </div>
            `;
        }
    },

    stop() {
        this.active = false;
        if (this.recognition) {
            this.recognition.abort();
            this.recognition = null;
        }
        UI.show('screen-lobby');
    }
};

// Initialize Language on Load
document.addEventListener('DOMContentLoaded', () => {
    let savedLang = localStorage.getItem('language') || 'en';
    if (savedLang === 'kz') savedLang = 'kk'; // Fix legacy 'kz' code

    // Delay slightly to ensure translations.js is loaded
    setTimeout(() => switchLanguage(savedLang), 10);
});