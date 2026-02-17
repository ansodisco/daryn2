// ============================================================
// app.js — Student frontend logic
// Uses PHP API endpoints
// ============================================================

const API_URL = 'api';         // PHP API base path
let currentLanguage = 'en';
let currentCourseId = null;
let currentLessonId = null;
let testAnswers = {};

// ─────────────────────────────────────────────
// Auth — check session on load
// ─────────────────────────────────────────────
async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/auth.php?action=check`, {
            credentials: 'include'
        });
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.warn('Auth check non-JSON response:', text.substring(0, 100));
            return;
        }

        if (data.authenticated) {
            document.getElementById('username-display').textContent = data.username;
            document.getElementById('user-avatar').textContent = data.username.charAt(0).toUpperCase();
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            loadDashboard();
            loadCourses();
            loadGrammar();
            loadMyWords();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
}

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');

    try {
        const response = await fetch(`${API_URL}/auth.php?action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, password })
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            errorEl.textContent = 'Server returned an invalid response. Check console for details.';
            console.error('Login parse error:', parseErr, 'Response text:', text);
            return;
        }

        if (response.ok && !data.error) {
            document.getElementById('username-display').textContent = data.user.username;
            document.getElementById('user-avatar').textContent = data.user.username.charAt(0).toUpperCase();
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('app').style.display = 'block';
            loadDashboard();
            loadCourses();
            loadGrammar();
            loadMyWords();
        } else {
            errorEl.textContent = data.error || 'Login failed';
        }
    } catch (error) {
        const time = new Date().toLocaleTimeString();
        errorEl.textContent = `Network error (${time}) — cannot reach the server. Is Apache/XAMPP running?`;
        console.error('Login network error:', error);
    }
});

// ─────────────────────────────────────────────
// Register
// ─────────────────────────────────────────────
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;
    const errorEl = document.getElementById('register-error');
    const successEl = document.getElementById('register-success');

    errorEl.textContent = '';
    successEl.style.display = 'none';

    if (!username || !email || !password) {
        errorEl.textContent = 'All fields are required.';
        return;
    }
    if (password.length < 6) {
        errorEl.textContent = 'Password must be at least 6 characters.';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth.php?action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ username, email, password })
        });

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (parseErr) {
            errorEl.textContent = 'Server returned an invalid response. Check console for details.';
            console.error('Register parse error:', parseErr, 'Response text:', text);
            return;
        }


        if (response.ok && !data.error) {
            successEl.textContent = '✅ Account created! Logging you in…';
            successEl.style.display = 'block';
            // Auto-login after registration
            setTimeout(() => {
                document.getElementById('username-display').textContent = username;
                document.getElementById('user-avatar').textContent = username.charAt(0).toUpperCase();
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('app').style.display = 'block';
                loadDashboard();
                loadCourses();
                loadGrammar();
                loadMyWords();
            }, 1000);
        } else {
            errorEl.textContent = data.error || 'Registration failed';
        }
    } catch (error) {
        errorEl.textContent = 'Network error — cannot reach the server. Is Apache/XAMPP running?';
        console.error('Register network error:', error);
    }
});

// ─────────────────────────────────────────────
// Toggle between Login ↔ Register forms
// ─────────────────────────────────────────────
function showLoginForm() {
    document.getElementById('login-form').style.display = 'block';
    document.getElementById('register-form').style.display = 'none';
    document.getElementById('toggle-to-register').style.display = 'block';
    document.getElementById('toggle-to-login').style.display = 'none';
    document.getElementById('demo-hint').style.display = 'block';
    document.getElementById('login-error').textContent = '';
}

function showRegisterForm() {
    document.getElementById('login-form').style.display = 'none';
    document.getElementById('register-form').style.display = 'block';
    document.getElementById('toggle-to-register').style.display = 'none';
    document.getElementById('toggle-to-login').style.display = 'block';
    document.getElementById('demo-hint').style.display = 'none';
    document.getElementById('register-error').textContent = '';
    document.getElementById('register-success').style.display = 'none';
}

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────
async function logout() {
    await fetch(`${API_URL}/auth.php?action=logout`, {
        method: 'POST',
        credentials: 'include'
    });
    location.reload();
}

// ─────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────
async function loadDashboard() {
    try {
        const response = await fetch(`${API_URL}/user.php?action=stats`, {
            credentials: 'include'
        });
        const stats = await response.json();

        document.getElementById('stat-courses').textContent = stats.total_courses_completed;
        document.getElementById('stat-words').textContent = stats.total_words_learned;
        document.getElementById('stat-trophies').textContent = stats.total_trophies;
        document.getElementById('stat-streak').textContent = stats.streak_days;
        document.getElementById('overall-progress').textContent = stats.overall_progress + '%';

        // Update progress circle
        const radius = 110;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (stats.overall_progress / 100) * circumference;
        document.getElementById('progress-ring-fill').style.strokeDashoffset = offset;

        // Trigger animations
        animateDashboardElements();

    } catch (error) {
        console.error('Failed to load dashboard:', error);
        // Optional: Show error in dashboard stats
        const statCards = document.querySelectorAll('.stat-value');
        statCards.forEach(el => el.textContent = 'Err');
    }
}

// ─────────────────────────────────────────────
// Courses
// ─────────────────────────────────────────────
async function loadCourses() {
    try {
        console.log('Fetching courses...');
        const response = await fetch(`${API_URL}/courses.php?action=list`, {
            credentials: 'include'
        });
        const courses = await response.json();
        console.log('Courses fetched:', courses);

        const container = document.getElementById('courses-list');
        if (!container) {
            console.error('Container #courses-list not found!');
            return;
        }

        if (!Array.isArray(courses)) {
            console.error('Courses is not an array:', courses);
            container.innerHTML = '<p class="error-message">Failed to load courses. Unexpected format.</p>';
            return;
        }

        if (courses.length === 0) {
            container.innerHTML = '<p>No courses available at the moment.</p>';
            return;
        }

        container.innerHTML = courses.map(course => `
            <div class="course-card group" onclick="viewCourse(${course.id})">
                <!-- Glow Effect -->
                <div class="card-glow"></div>
                
                <!-- Main Container -->
                <div class="card-inner">
                    <!-- Header -->
                    <div class="card-header">
                        <div class="card-header-text">
                            <span class="card-label">LEVEL</span>
                            <span class="card-level-display">${course.level}</span>
                        </div>
                        <div class="card-status-icon status-unlocked">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                        </div>
                    </div>
                    
                    <!-- Body: Title & Description -->
                    <div class="card-body">
                        <h3 class="card-title-text">${course['title_' + currentLanguage]}</h3>
                        <p class="card-description-text">${course['description_' + currentLanguage]}</p>
                    </div>
                    
                    <!-- Footer: Progress & Lessons -->
                    <div class="card-footer">
                        <div class="footer-divider"></div>
                        <div class="footer-row">
                            <div class="footer-info" style="width: 100%;">
                                <div class="footer-meta">
                                    <span>${course.progress || 0}% Complete</span>
                                    <span>${course.completed_lessons || 0} / ${course.total_lessons} Lessons</span>
                                </div>
                                <div class="progress-bar-container">
                                    <div class="progress-fill" style="width: ${course.progress || 0}%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load courses:', error);
        const container = document.getElementById('courses-list');
        if (container) {
            container.innerHTML = `<div class="error-message" style="text-align:center; padding:20px; color:#ef4444;">
                <p>Failed to load courses. Please try again later.</p>
                <code style="font-size:0.8em; opacity:0.8;">${error.message}</code>
            </div>`;
        }
    }
}

// ─────────────────────────────────────────────
// View Course Detail
// ─────────────────────────────────────────────
async function viewCourse(courseId) {
    currentCourseId = courseId;
    try {
        const response = await fetch(`${API_URL}/courses.php?action=get&id=${courseId}`, {
            credentials: 'include'
        });
        const course = await response.json();

        const content = document.getElementById('course-detail-content');
        content.innerHTML = `
            <div class="card">
                <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 10px;">${course['title_' + currentLanguage]}</h1>
                <span class="course-level level-${course.level}">${course.level}</span>
                <p style="color: var(--ink-medium); margin: 20px 0;">${course['description_' + currentLanguage]}</p>
                
                <h2 style="margin: 30px 0 15px; font-weight: 700;">Lessons</h2>
                <ul class="lesson-list">
                    ${course.lessons.map(lesson => `
                        <li class="lesson-item" onclick="viewLesson(${lesson.id})">
                            <div style="font-weight: 700; margin-bottom: 5px;">${lesson['title_' + currentLanguage]}</div>
                            <div style="font-size: 0.85rem; color: var(--ink-light);">Lesson ${lesson.lesson_order}</div>
                        </li>
                    `).join('')}
                </ul>

                <button class="btn btn-primary" style="margin-top: 30px;" onclick="startTest(${courseId})">
                    Take Course Test
                </button>
            </div>
        `;

        showTab('course-detail');
    } catch (error) {
        console.error('Failed to load course:', error);
    }
}

// ─────────────────────────────────────────────
// View Lesson — Flashcard Mode
// ─────────────────────────────────────────────
let flashcardWords = [];
let flashcardIndex = 0;
let flashcardFlipped = false;

async function viewLesson(lessonId) {
    currentLessonId = lessonId;
    try {
        const response = await fetch(`${API_URL}/courses.php?action=lesson&id=${lessonId}`, {
            credentials: 'include'
        });
        const lesson = await response.json();

        flashcardWords = lesson.words || [];
        flashcardIndex = 0;
        flashcardFlipped = false;

        const content = document.getElementById('lesson-content');

        if (flashcardWords.length === 0) {
            content.innerHTML = `
                <div class="card">
                    <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 20px;">${lesson['title_' + currentLanguage]}</h1>
                    <div style="color: var(--ink-dark); line-height: 1.8; margin-bottom: 30px;">
                        ${lesson['content_' + currentLanguage] || ''}
                    </div>
                    <p style="color:#666; text-align:center;">No vocabulary words in this lesson yet.</p>
                    <button class="flashcard-complete-btn" onclick="completeLesson(${lessonId})">
                        Complete Lesson
                    </button>
                </div>
            `;
            showTab('lesson-view');
            return;
        }

        content.innerHTML = `
            <div class="card" style="border:none; background:transparent; box-shadow:none; padding:0;">
                <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 8px;">${lesson['title_' + currentLanguage]}</h1>
                <div style="color: var(--ink-dark); line-height: 1.8; margin-bottom: 24px;">
                    ${lesson['content_' + currentLanguage] || ''}
                </div>

                <div class="flashcard-container">
                    <div class="flashcard-progress">
                        <span class="flashcard-progress-text" id="fc-counter">1 / ${flashcardWords.length}</span>
                        <div class="flashcard-progress-bar">
                            <div class="flashcard-progress-fill" id="fc-bar" style="width: ${(1 / flashcardWords.length) * 100}%"></div>
                        </div>
                        <span class="flashcard-progress-text" id="fc-percent">${Math.round((1 / flashcardWords.length) * 100)}%</span>
                    </div>

                    <div class="flashcard-scene" id="fc-scene" onclick="flipFlashcard()">
                        <div class="flashcard" id="fc-card">
                            <div class="flashcard-face flashcard-front" id="fc-front"></div>
                            <div class="flashcard-face flashcard-back" id="fc-back"></div>
                        </div>
                    </div>

                    <div class="flashcard-nav">
                        <button class="flashcard-nav-btn" id="fc-prev" onclick="prevFlashcard()" disabled>
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="15 18 9 12 15 6"></polyline>
                            </svg>
                        </button>
                        <button class="flashcard-learn-btn" id="fc-learn" onclick="learnCurrentWord()">
                            ✓ Mark as Learned
                        </button>
                        <button class="flashcard-nav-btn" id="fc-next" onclick="nextFlashcard()">
                            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="9 18 15 12 9 6"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>

                <button class="flashcard-complete-btn" onclick="completeLesson(${lessonId})">
                    ✅ Complete Lesson
                </button>
            </div>
        `;

        renderFlashcard();
        showTab('lesson-view');
    } catch (error) {
        console.error('Failed to load lesson:', error);
    }
}

function renderFlashcard() {
    if (!flashcardWords.length) return;
    const word = flashcardWords[flashcardIndex];
    const total = flashcardWords.length;

    // Reset flip
    flashcardFlipped = false;
    const card = document.getElementById('fc-card');
    if (card) card.classList.remove('is-flipped');

    // Front face
    const front = document.getElementById('fc-front');
    if (front) {
        front.innerHTML = `
            <div class="flashcard-word">${word.kazakh}</div>
            <div class="flashcard-pronunciation">[${word.pronunciation || '—'}]</div>
            ${word.word_type ? `<div class="flashcard-type">${word.word_type}</div>` : ''}
            <div class="flashcard-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                Tap to reveal translation
            </div>
        `;
    }

    // Back face
    const back = document.getElementById('fc-back');
    if (back) {
        const translation = currentLanguage === 'en' ? word.english : word.russian;
        const exampleKk = word.example_sentence_kk || '';
        const exampleLang = word['example_sentence_' + currentLanguage] || '';

        back.innerHTML = `
            <div class="flashcard-translation-label">Translation</div>
            <div class="flashcard-translation">${translation}</div>
            ${exampleKk || exampleLang ? `
                <div class="flashcard-example">
                    <div class="flashcard-example-label">Example</div>
                    ${exampleKk ? `<div class="flashcard-example-text" style="margin-bottom:6px; color: var(--accent-purple); font-weight:600;">${exampleKk}</div>` : ''}
                    ${exampleLang ? `<div class="flashcard-example-text">${exampleLang}</div>` : ''}
                </div>
            ` : ''}
        `;
    }

    // Progress
    const counter = document.getElementById('fc-counter');
    const bar = document.getElementById('fc-bar');
    const percent = document.getElementById('fc-percent');
    if (counter) counter.textContent = `${flashcardIndex + 1} / ${total}`;
    if (bar) bar.style.width = `${((flashcardIndex + 1) / total) * 100}%`;
    if (percent) percent.textContent = `${Math.round(((flashcardIndex + 1) / total) * 100)}%`;

    // Nav buttons
    const prev = document.getElementById('fc-prev');
    const next = document.getElementById('fc-next');
    if (prev) prev.disabled = flashcardIndex === 0;
    if (next) next.disabled = flashcardIndex === total - 1;

    // Learn button reset
    const learnBtn = document.getElementById('fc-learn');
    if (learnBtn) {
        learnBtn.className = 'flashcard-learn-btn';
        learnBtn.textContent = '✓ Mark as Learned';
    }
}

function flipFlashcard() {
    flashcardFlipped = !flashcardFlipped;
    const card = document.getElementById('fc-card');
    if (card) card.classList.toggle('is-flipped', flashcardFlipped);
}

function nextFlashcard() {
    if (flashcardIndex < flashcardWords.length - 1) {
        flashcardIndex++;
        renderFlashcard();
    }
}

function prevFlashcard() {
    if (flashcardIndex > 0) {
        flashcardIndex--;
        renderFlashcard();
    }
}

async function learnCurrentWord() {
    if (!flashcardWords.length) return;
    const word = flashcardWords[flashcardIndex];
    const learnBtn = document.getElementById('fc-learn');

    try {
        await fetch(`${API_URL}/words.php?action=learn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ word_id: word.id })
        });

        if (learnBtn) {
            learnBtn.textContent = '✓ Learned!';
            learnBtn.classList.add('learned');
        }
        loadDashboard();

        // Award points for learning a word
        awardPoints(5, 'word_learned');

        // Auto-advance after short delay
        if (flashcardIndex < flashcardWords.length - 1) {
            setTimeout(() => { nextFlashcard(); }, 800);
        }
    } catch (error) {
        console.error('Failed to learn word:', error);
    }
}

// ─────────────────────────────────────────────
// Learn Word
// ─────────────────────────────────────────────
async function learnWord(wordId) {
    try {
        await fetch(`${API_URL}/words.php?action=learn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ word_id: wordId })
        });
        alert('Word added to your learned words!');
        loadDashboard();
    } catch (error) {
        console.error('Failed to learn word:', error);
    }
}

// ─────────────────────────────────────────────
// Complete Lesson
// ─────────────────────────────────────────────
async function completeLesson(lessonId) {
    try {
        await fetch(`${API_URL}/courses.php?action=complete_lesson`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ lesson_id: lessonId })
        });
        alert('Lesson completed! Great job!');
        loadDashboard();
        viewCourse(currentCourseId);
    } catch (error) {
        console.error('Failed to complete lesson:', error);
    }
}

// ─────────────────────────────────────────────
// Grammar Rules
// ─────────────────────────────────────────────
async function loadGrammar() {
    try {
        const response = await fetch(`${API_URL}/tests.php?action=grammar`, {
            credentials: 'include'
        });
        const rules = await response.json();

        const container = document.getElementById('grammar-list');
        container.innerHTML = rules.map(rule => `
            <div class="grammar-card">
                <div class="grammar-title">${rule['title_' + currentLanguage]}</div>
                <div class="grammar-explanation">${rule['explanation_' + currentLanguage]}</div>
                ${rule.examples ? `
                    <div class="grammar-examples">
                        <strong>Examples:</strong>
                        ${Object.values(rule.examples).map(ex => `
                            <div class="grammar-example-item">${ex}</div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load grammar:', error);
    }
}

// ─────────────────────────────────────────────
// My Words
// ─────────────────────────────────────────────
async function loadMyWords() {
    try {
        const response = await fetch(`${API_URL}/words.php?action=learned`, {
            credentials: 'include'
        });
        const words = await response.json();

        const container = document.getElementById('words-list');

        if (words.length === 0) {
            container.innerHTML = '<div class="card"><p>You haven\'t learned any words yet. Start a lesson to learn new words!</p></div>';
            return;
        }

        container.innerHTML = `
            <div class="word-grid">
                ${words.map(word => `
                    <div class="word-card" onclick="this.classList.toggle('revealed')">
                        <div class="word-card-front">
                            <div class="word-kazakh">${word.kazakh}</div>
                            <div class="click-hint">Click to reveal</div>
                        </div>
                        <div class="word-card-back">
                            <div class="word-translation">${currentLanguage === 'en' ? word.english : word.russian}</div>
                            <div class="word-pronunciation">[${word.pronunciation}]</div>
                            ${word['example_sentence_' + currentLanguage] ? `
                                <div class="word-example">
                                    ${word['example_sentence_' + currentLanguage]}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Failed to load words:', error);
    }
}

// ─────────────────────────────────────────────
// Slang
// ─────────────────────────────────────────────
async function loadSlang() {
    try {
        // Use static slang from translations
        const slangTerms = translations[currentLanguage]['slang.terms'] || [];
        const container = document.getElementById('slang-list');

        if (slangTerms.length === 0) {
            container.innerHTML = '<div class="card"><p>No slang available yet.</p></div>';
            return;
        }

        container.innerHTML = slangTerms.map(slang => `
            <div class="slang-card" style="padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div class="card-title-text" style="font-size: 1.4rem; font-weight: 800; color: #9b6b9e; margin-bottom: 6px;">${slang.term}</div>
                        <div style="font-size: 1rem; color: #4b5563; line-height: 1.5;">
                            ${slang.def}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Failed to load slang:', error);
    }
}

async function learnSlang(slangId) {
    try {
        const response = await fetch(`${API_URL}/slang.php?action=learn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ slang_id: slangId })
        });

        const data = await response.json();

        if (response.ok && !data.error) {
            // Reload slang to show the updated button
            loadSlang();
            // Update dashboard stats
            loadDashboard();
        } else {
            alert(data.error || 'Failed to mark slang as learned');
        }
    } catch (error) {
        console.error('Failed to mark slang as learned:', error);
        alert('Error: ' + error.message);
    }
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────
async function startTest(courseId) {
    try {
        const response = await fetch(`${API_URL}/tests.php?action=questions&course_id=${courseId}`, {
            credentials: 'include'
        });
        const questions = await response.json();

        testAnswers = {};

        const content = document.getElementById('test-content');
        content.innerHTML = `
            <div class="card">
                <h1 style="font-size: 2rem; font-weight: 900; margin-bottom: 30px;">Course Test</h1>
                ${questions.map((q, index) => `
                    <div class="test-question">
                        <div class="question-text">${index + 1}. ${q['question_text_' + currentLanguage]}</div>
                        ${q.question_type === 'multiple_choice' ? `
                            <div class="question-options">
                                ${q.options.map(option => `
                                    <button class="option-btn" onclick="selectOption(${q.id}, '${option}', event)">
                                        ${option}
                                    </button>
                                `).join('')}
                            </div>
                        ` : `
                            <input type="text" class="form-input" 
                                   onchange="testAnswers[${q.id}] = this.value"
                                   placeholder="Type your answer here">
                        `}
                    </div>
                `).join('')}
                <button class="btn btn-primary" onclick="submitTest(${courseId})">
                    Submit Test
                </button>
            </div>
        `;

        showTab('test-view');
    } catch (error) {
        console.error('Failed to load test:', error);
    }
}

// Select Option
function selectOption(questionId, answer, event) {
    event.target.parentElement.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.classList.add('selected');
    testAnswers[questionId] = answer;
}

// Submit Test
async function submitTest(courseId) {
    try {
        const response = await fetch(`${API_URL}/tests.php?action=submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ course_id: courseId, answers: testAnswers })
        });
        const result = await response.json();

        const content = document.getElementById('test-content');
        content.innerHTML = `
            <div class="test-result" style="border-color: ${result.passed ? '#6b9e7a' : '#c55a5a'}">
                <div class="result-score">${result.percentage}%</div>
                <div class="result-message">
                    ${result.passed ?
                '🎉 Congratulations! You passed the test!' :
                '📚 Keep studying! You need 70% to pass.'}
                </div>
                <p style="color: var(--ink-medium); margin-bottom: 20px;">
                    Score: ${result.score} / ${result.total_points}
                </p>
                <button class="btn btn-primary" onclick="viewCourse(${courseId})">
                    Back to Course
                </button>
            </div>
        `;

        loadDashboard();
    } catch (error) {
        console.error('Failed to submit test:', error);
    }
}

// ─────────────────────────────────────────────
// Tab switching
// ─────────────────────────────────────────────
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.textContent.toLowerCase() === tabName) {
            item.classList.add('active');
        }
    });

    // Reload content when switching to specific tabs
    if (tabName === 'courses') {
        loadCourses();
    } else if (tabName === 'grammar') {
        loadGrammar();
    } else if (tabName === 'words') {
        loadMyWords();
    } else if (tabName === 'slang') {
        loadSlang();
    }
}

function backToCourseDetail() {
    viewCourse(currentCourseId);
}

// ─────────────────────────────────────────────
// Language Dictionary loaded from translations.js
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// Language switching
// ─────────────────────────────────────────────
function switchLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);

    // Update active button state
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        const btnText = btn.textContent.trim();
        // Simple optimization: check if button corresponds to language
        if ((lang === 'en' && btnText === 'EN') ||
            (lang === 'kk' && btnText === 'ҚАЗ') ||
            (lang === 'ru' && btnText === 'РУС')) {
            btn.classList.add('active');
        }
    });

    updateStaticText();

    // Reload dynamic content
    loadCourses();
    loadGrammar();
    loadMyWords();
    loadSlang();
    loadClans();
}

function updateStaticText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            if (key === 'hero.headline' || key === 'chatbot.greeting') {
                el.innerHTML = translations[currentLanguage][key];
            } else {
                el.textContent = translations[currentLanguage][key];
            }
        }
    });
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Initialize
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();

    // Initialize Language
    const savedLang = localStorage.getItem('language') || 'en';
    switchLanguage(savedLang);

    // Initialize Animations
    initAnimations();
});

// ─────────────────────────────────────────────
// Animations & Scroll Logic
// ─────────────────────────────────────────────
function initAnimations() {
    // 1. Background Fade on Scroll
    const flowFieldContainer = document.getElementById('flow-field-container');
    const heroSection = document.getElementById('hero');

    if (flowFieldContainer && heroSection) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            const heroHeight = heroSection.offsetHeight;

            // Calculate opacity: 1 at top, 0 at bottom of hero
            // Fade out faster (by 70% of hero height)
            let opacity = 1 - (scrollY / (heroHeight * 0.7));

            // Clamp opacity between 0 and 1
            opacity = Math.max(0, Math.min(1, opacity));

            flowFieldContainer.style.opacity = opacity;

            // Optimization: hide it if fully transparent
            flowFieldContainer.style.display = opacity <= 0 ? 'none' : 'block';
        });
    }
}

// Helper to manually animate dashboard elements
function animateDashboardElements() {
    const elements = document.querySelectorAll('.stat-card, .progress-circle-container');
    elements.forEach((el, index) => {
        // Only animate if not already animated
        if (!el.classList.contains('animate-in')) {
            el.classList.add('animate-hidden');
            // Force reflow
            void el.offsetWidth;
            setTimeout(() => {
                el.classList.add('animate-in');
            }, index * 100);
        }
    });
}

// Hook into dynamic content loading to animate new elements
const originalLoadCourses = loadCourses;
loadCourses = async function () {
    await originalLoadCourses();
    setTimeout(() => {
        document.querySelectorAll('.course-card').forEach((el, index) => {
            el.classList.add('animate-hidden');
            el.style.transitionDelay = `${index * 0.1}s`; // Stagger
            // Small delay to allow browser to register initial state
            requestAnimationFrame(() => {
                el.classList.add('animate-in');
            });
        });
    }, 50);
};

// ═══════════════════════════════════════════════════
// CLANS & LEADERBOARD
// ═══════════════════════════════════════════════════

async function loadClans() {
    // 1. Load My Clan (API)
    try {
        const myRes = await fetch(`${API_URL}/clans.php?action=my_clan`, { credentials: 'include' });
        if (myRes.ok) {
            const myClan = await myRes.json();
            const mySection = document.getElementById('my-clan-section');
            const createSection = document.getElementById('clan-create-section');

            if (myClan && myClan.id) {
                mySection.innerHTML = `
                    <div class="my-clan-banner">
                        <div class="my-clan-info">
                            <h3>🛡️ ${myClan.name}</h3>
                            <p>${myClan.description || 'No description'} · ${myClan.member_count} members · ${myClan.total_points || 0} pts · Role: ${myClan.role}</p>
                        </div>
                        <button class="btn btn-secondary" style="max-width:140px; margin:0; padding:10px;" onclick="leaveClan()">Leave Clan</button>
                    </div>
                    ${myClan.members ? `
                        <h3 style="font-weight:700; margin-bottom:12px;">Members</h3>
                        <table class="leaderboard-table" style="margin-bottom:30px;">
                            <thead><tr><th>Player</th><th>Role</th><th>Points</th></tr></thead>
                            <tbody>
                                ${myClan.members.map(m => `
                                    <tr>
                                        <td>${m.username}</td>
                                        <td>${m.role === 'leader' ? '👑 Leader' : 'Member'}</td>
                                        <td>${m.points}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : ''}
                `;
                if (createSection) createSection.style.display = 'none';
            } else {
                mySection.innerHTML = '';
                if (createSection) createSection.style.display = 'block';
            }
        }
    } catch (error) {
        console.warn('Failed to load my clan (ignoring):', error);
    }

    // 2. Load Top Clans (Static Translations)
    try {
        const clans = translations[currentLanguage]['clans.list'] || [];
        const grid = document.getElementById('clans-grid');

        if (grid) {
            if (!clans.length) {
                grid.innerHTML = '<p style="color:#999;">No clans yet. Be the first to create one!</p>';
            } else {
                grid.innerHTML = clans.map((clan, i) => `
                    <div class="clan-card">
                        <div class="clan-rank">#${i + 1}</div>
                        <div class="clan-name">${clan.name}</div>
                        <p style="color:#666; font-size:0.85rem;">${clan.desc}</p>
                        <div class="clan-stats">
                            <div class="clan-stat">👥 ${clan.members} members</div>
                            <div class="clan-stat">⭐ ${clan.points.toLocaleString()} pts</div>
                        </div>
                        <p style="font-size:0.75rem; color:#999; margin-top:8px;">Leader: ${clan.leader}</p>
                        <button class="clan-join-btn" onclick="alert('This is a demo clan available in the full version!')">Join Clan</button>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Failed to load top clans:', error);
    }
}

async function createClan() {
    const name = document.getElementById('clan-name-input').value.trim();
    const desc = document.getElementById('clan-desc-input').value.trim();
    const errEl = document.getElementById('clan-error');

    if (!name) {
        errEl.textContent = 'Please enter a clan name.';
        errEl.style.display = 'block';
        return;
    }
    errEl.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/clans.php?action=create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description: desc })
        });
        const result = await res.json();

        if (result.error) {
            errEl.textContent = result.error;
            errEl.style.display = 'block';
        } else {
            document.getElementById('clan-name-input').value = '';
            document.getElementById('clan-desc-input').value = '';
            loadClans();
        }
    } catch (error) {
        console.error('Failed to create clan:', error);
    }
}

async function joinClan(clanId) {
    try {
        const res = await fetch(`${API_URL}/clans.php?action=join`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ clan_id: clanId })
        });
        const result = await res.json();
        if (result.error) {
            alert(result.error);
        } else {
            loadClans();
        }
    } catch (error) {
        console.error('Failed to join clan:', error);
    }
}

async function leaveClan() {
    if (!confirm('Are you sure you want to leave your clan?')) return;
    try {
        await fetch(`${API_URL}/clans.php?action=leave`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        loadClans();
    } catch (error) {
        console.error('Failed to leave clan:', error);
    }
}

async function loadLeaderboard() {
    try {
        // Players
        const pRes = await fetch(`${API_URL}/clans.php?action=top_players`, { credentials: 'include' });
        const players = await pRes.json();
        const pBody = document.getElementById('lb-players-body');
        if (players.length) {
            pBody.innerHTML = players.map((p, i) => `
                <tr>
                    <td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                    <td>${p.username}</td>
                    <td>${p.clan_name || '—'}</td>
                    <td><span class="points-badge">⭐ ${p.points}</span></td>
                </tr>
            `).join('');
        } else {
            pBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">No players yet</td></tr>';
        }

        // Clans
        const cRes = await fetch(`${API_URL}/clans.php?action=top5`, { credentials: 'include' });
        const clans = await cRes.json();
        const cBody = document.getElementById('lb-clans-body');
        if (clans.length) {
            cBody.innerHTML = clans.map((c, i) => `
                <tr>
                    <td>${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                    <td>${c.name}</td>
                    <td>${c.member_count}</td>
                    <td><span class="points-badge">⭐ ${c.total_points || 0}</span></td>
                </tr>
            `).join('');
        } else {
            cBody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#999;">No clans yet</td></tr>';
        }
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

function showLeaderboardTab(tabId, btn) {
    document.querySelectorAll('#leaderboard .section-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('lb-players').style.display = tabId === 'players' ? 'block' : 'none';
    document.getElementById('lb-clans-lb').style.display = tabId === 'clans-lb' ? 'block' : 'none';
}

async function awardPoints(points, source) {
    try {
        await fetch(`${API_URL}/clans.php?action=award_points`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ points, source })
        });
    } catch (error) {
        console.error('Failed to award points:', error);
    }
}

// Hook showTab to auto-load clans/leaderboard data
const _origShowTab = window.showTab;
window.showTab = function (tabName) {
    if (typeof _origShowTab === 'function') _origShowTab(tabName);
    if (tabName === 'clans') loadClans();
    if (tabName === 'leaderboard') loadLeaderboard();
};

