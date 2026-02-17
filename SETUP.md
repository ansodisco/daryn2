# Kazakh Learning Platform — Setup Guide

## Prerequisites

- **XAMPP**, **WAMP**, or **MAMP** (includes Apache, PHP, MySQL)
  - PHP 7.4+ required
  - MySQL 5.7+ / MariaDB 10.3+
- A web browser (Chrome, Firefox, Edge, etc.)

---

## Step 1 — Download & Place the Project

Copy (or clone) this entire project folder into your web server's document root:

| Stack | Document Root |
|-------|---------------|
| XAMPP | `C:\xampp\htdocs\my-ap` |
| WAMP  | `C:\wamp64\www\my-ap` |
| MAMP  | `/Applications/MAMP/htdocs/my-ap` |

> **Tip:** You can rename the folder to anything you like (e.g. `kazakh-learning`). Just use that name in the URLs below.

---

## Step 2 — Start Apache & MySQL

1. Open the **XAMPP Control Panel** (or WAMP/MAMP equivalent).
2. Click **Start** next to **Apache**.
3. Click **Start** next to **MySQL**.
4. Both should show green / running status.

---

## Step 3 — Create the Database

### Option A — phpMyAdmin (recommended)

1. Open **http://localhost/phpmyadmin** in your browser.
2. Click the **SQL** tab.
3. Open the file `setup.sql` in a text editor, copy its entire contents.
4. Paste into phpMyAdmin's SQL text box and click **Go**.

### Option B — Command line

```bash
mysql -u root -p < setup.sql
```

This creates:
- A database called `kazakh_learning`
- All required tables (users, courses, lessons, words, tests, trophies, etc.)
- Seed data with sample courses, words, grammar rules, and trophies

---

## Step 4 — Configure Database Credentials

Open `includes/config.php` and verify these match your MySQL setup:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'kazakh_learning');
define('DB_USER', 'root');
define('DB_PASS', '');           // empty is the XAMPP default
```

> Most XAMPP/WAMP installs use `root` with an empty password by default. If you set a MySQL password, update `DB_PASS`.

---

## Step 5 — Access the App

| Page | URL |
|------|-----|
| **Student Frontend** | `http://localhost/my-ap/index.html` |
| **Admin Panel** | `http://localhost/my-ap/admin/index.html` |

---

## Default Login Credentials

| Username | Password | Notes |
|----------|----------|-------|
| `Student123` | `password123` | Pre-seeded demo account |

You can also register a new account from the student login page.

---

## Project Structure

```
my-ap/
├── index.html          ← Student frontend
├── app.js              ← Student frontend JS (uses PHP API)
├── styles.css          ← Student frontend styles
├── admin/
│   └── index.html      ← Admin panel (add courses, words, tests)
├── api/
│   ├── auth.php        ← Login, register, logout, session check
│   ├── courses.php     ← Courses, lessons, lesson completion
│   ├── tests.php       ← Test questions, submit, grammar, trophies
│   ├── user.php        ← User profile, stats, streak
│   └── words.php       ← Word management, learn, learned
├── includes/
│   └── config.php      ← DB connection, helpers, streak logic
├── setup.sql           ← Database schema + seed data
├── app.py              ← (Legacy Flask backend — not used)
├── database.py         ← (Legacy Python DB — not used)
└── SETUP.md            ← This file
```

---

## Features

- **Student Registration & Login** — with session-based auth
- **Courses, Lessons & Vocabulary** — browse, learn, complete
- **Multiple-Choice Tests** — with auto-grading & trophy awards
- **Grammar Rules** — difficulty-filtered grammar reference
- **Day Streak Tracking** — auto-increments on login/activity
- **Trophy System** — earn trophies for milestones
- **Admin Panel** — manage courses, lessons, words, test questions
- **Multi-language** — EN / KK / RU support throughout

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Database connection failed" | Check that MySQL is running and `config.php` credentials are correct |
| Blank page / 404 | Ensure the project is inside `htdocs` and Apache is running |
| "Not authenticated" errors | PHP sessions require cookies; don't use `file://` URLs — always use `http://localhost/...` |
| Can't register new user | Check that `setup.sql` was imported correctly (the `users` table must exist) |
