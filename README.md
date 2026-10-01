# PennyLedger — React + PHP/MySQL

This project has a React frontend (`src/`) and a PHP API (`public/index.php`).
The API uses MySQL for accounts, transactions, budgets, goals, and report logs.
The app has no built-in demo accounts or mail credentials.

## Database setup: choose one path

**Fresh, disposable database:** Import `config/PersonalBudget_db.sql` **once**.
It creates the original tables, applies the integration schema changes, and
inserts lookup data. Its first statement is `DROP DATABASE IF EXISTS`; importing
it again destroys existing accounts and transactions.

**Existing database created from the old pre-integration schema:** Back it up,
then run `config/migrations/01_schema_migration.sql` and
`config/migrations/02_seed_data.sql` in that order, once each. Do not run the
fresh-install SQL. If the integration migration was already applied, do not run
it again: duplicate columns and tables will fail.

Soft-deleted accounts keep their email reserved because `Users.email` is
unique. Signup now returns a clear conflict instead of a database error.

## Run the PHP API

Put this folder under XAMPP's `htdocs` and start Apache and MySQL. The API
entry point for this ZIP's folder name is:

`http://localhost/PennyLedger-React-PHP-full-review/IM_SYSTEM_MT/public/index.php`

`config/db.php` reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and
`DB_PASSWORD` from Apache/PHP environment variables. Its defaults are
`127.0.0.1`, port `3307`, database `PersonalBudget_db`, user `root`, and an
empty password. Change those values for your MySQL installation.

The first administrator is created from a terminal, after the schema exists:

```powershell
php scripts/create_admin.php FirstName LastName admin@example.com YourOwnPassword
```

This script does not create a fixed admin email or password. Use at least eight
characters for the password.

## Configure verification email

The server sends codes through PHPMailer using SMTP. `config/mail.php` reads
`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM` from
the **Apache/PHP environment**. The ZIP intentionally contains no mail secret.
For XAMPP, set those variables in Apache configuration outside `htdocs`, then
stop and start Apache. The `.env.local` file is read by Vite, not PHP.

If SMTP fails during signup, the account is still created. The verification
screen now explains the failure and offers **Resend code**. The same option is
available from the sign-in and signup pages for an existing unverified account.
The backend limits successful resend requests to one per minute. Codes expire
after ten minutes. A mail error is logged in Apache's error log without sending
SMTP details to the browser.

## Run React

Install Node.js 22.12 or newer, open a terminal in this folder, and run:

```powershell
npm ci
npm run dev
```

Open the URL printed by Vite (normally
`http://127.0.0.1:5173/PennyLedger/`). `.env.local` is prefilled for the XAMPP
path above and contains only `VITE_API_BASE_URL`. If your PHP URL differs, edit
that value and restart `npm run dev`. `src/lib/api.js` deliberately has no
fallback to a different backend folder. The API's `APP_ORIGIN` must match the
React origin (normally `http://127.0.0.1:5173`).

`npm run build` creates the React build in `dist/`. PHP/MySQL must still run on
a PHP-capable server; static hosting such as GitHub Pages only hosts React.

## What is connected

- Registration, verification, resend, login/logout, and role checks
- User transactions, budgets, goals, contributions, and report logs
- Profile changes, password changes, photo upload, and account deactivation
- Admin user management, activity feed, and registration setting

The backend checks account ownership for user records. React's report snapshots
and CSV files are calculated from the transactions loaded for the signed-in
user. Theme, display currency, and date format are browser preferences; changing
the currency symbol does not convert amounts. There is no working two-factor
authentication service.

## Verification and limits

Run `npm test` for the included API contract tests and `npm run build` for the
frontend build. PHP syntax can be checked with `php -l`. These checks do not
replace testing registration, SMTP delivery, login, CRUD, and admin access with
a disposable configured MySQL database. Add verification attempt limits before
exposing the public auth endpoints to the internet.
