# MediAdmit

**Patient Registration, Assessment, and Admission Management System**
### Patient Registration and Admission Management System
Subsystem 1 of the Integrated Web-Based Hospital Management System

Proponents: Jericho Restor · Uriel Gamba · Jhenny Rose Almoete · Jhon Adams Manuel

Built with **Node.js + Express + MongoDB**, written in **Visual Studio Code**, and used in any **web browser**.

---

## 1. Install these first (one time only)

| Program | Where to get it | Notes |
|---|---|---|
| **Node.js (LTS)** | https://nodejs.org | Choose the **LTS** version. Keep all default options. |
| **MongoDB Community Server** | https://www.mongodb.com/try/download/community | Choose **"Install MongoDB as a Service"** and tick **"Install MongoDB Compass"**. |
| **Visual Studio Code** | https://code.visualstudio.com | |
| **Git** (optional) | https://git-scm.com | For sharing the code with your group. |

After installing, **restart your computer** so that VS Code can find Node.js.

---

## 2. Open the project in VS Code

1. Unzip `mediadmit.zip` (for example to `Documents\mediadmit`).
2. Open **Visual Studio Code**, then go to **File → Open Folder…** and choose the `mediadmit` folder.
3. If VS Code asks *"Do you trust the authors?"*, click **Yes**.
4. If VS Code asks to install the **recommended extensions**, click **Install** (MongoDB, EJS, Prettier).

---

## 3. Run it (first time)

Open the terminal in VS Code: **Terminal → New Terminal**. Then click the small **˅** next to the **+** in the terminal panel and choose **Command Prompt**. Type these commands one at a time:

```bash
npm install
```
Downloads the libraries the project needs. Only needed once.
**Skip this** if your folder already has a `node_modules` folder (the "ready" zip includes it).

```bash
copy .env.example .env
```
Creates your settings file. On Mac/Linux, use `cp .env.example .env` instead.

```bash
npm start
```
Starts the web server. You should see:
```
Connected to MongoDB
MediAdmit is running at http://localhost:3000
```

Now open your browser at **http://localhost:3000** 🎉

> **Tip:** You can also press **F5** in VS Code (or **Run → Start Debugging**) instead of typing `npm start`.
> To stop the server, click inside the terminal and press **Ctrl + C**.

### First-time setup (the database starts empty)

The first time you open the website, there are **no users and no patients**. The website shows a **First-time setup** page:

1. Type your name, an Employee ID (e.g. `ADMIN-001`), your email and a password, then click **Create Administrator & Start**. This is the only account that is created automatically, and it is the main account of the system.
2. The Dashboard shows a **Getting started** checklist. Follow it in order:
   2. **Registration**: register your first patient. The Patient ID (e.g. `PT-2026-00001`) is created automatically.
   3. **Assessments → + New Assessment**: record the chief complaint, vital signs, physical findings, triage level (Emergency / Urgent / Non-Urgent), impression and recommendation. The Assessment No. (e.g. `ASM-26-0001`) is created automatically.
   4. **Admissions → + New Admission**: admit patients recommended for admission. The latest assessment is linked to the admission automatically.
   4. **Users → + Add User**: add your staff. Each new user gets a temporary password to sign in with. Staff can also click **Create an account** on the login page and wait for you to approve them.

You can sign in with either your **email** or your **Employee ID**. To change your email or password later, click **your name at the top right → My Account**.

---

## 4. What each screen does

| Screen | Address | What it does |
|---|---|---|
| First-time setup | `/setup` | Only appears while the database has no users. Creates the Administrator account. |
| Log In / Sign Up | `/login`, `/signup` | Staff sign in. New staff can request an account, and an Administrator approves it on the Users page. **Forgot password?** sends a reset request to the Administrator. |
| Dashboard | `/` | Today's numbers, a 7-day chart of registrations, assessments and admissions, today's triage levels, and assessed patients awaiting admission. |
| Registration | `/patients/register` | 4-step form. A unique **Patient ID** (e.g. `PT-2026-00001`) is created automatically. |
| Patients | `/patients` | Search, filter, view a patient's profile, edit records, see admission history, and delete a record entered by mistake (only while it has no admissions). |
| Admissions | `/admissions` | List and filter admissions, create a new admission, and discharge patients. |
| Assessments | `/assessments` | Assess patients: chief complaint, history, vital signs (abnormal values shown in red), level of consciousness, physical exam, triage level, impression, recommendation and plan. Printable assessment record. |
| Reports | `/reports` | Patient Registration, Patient Records, Patient Assessment and Admissions reports, with **Print / Save as PDF**. |
| Users | `/users` | Approve sign-ups, add users, change roles and privileges, deactivate accounts, answer password reset requests, and reset passwords. |
| My Account | `/account` | Click your name (top right) to change your own name, email and password. Administrators can also change their Employee ID. |
| Audit Trail | `/audit` | Every action by every user (logins, creates, updates, exports), with filters and **Export CSV**. |

Each user only sees the pages their **privileges** allow. For example, an Admitting Clerk cannot open Users or Audit Trail.

---

## 5. Project folders

```
mediadmit/
├── server.js            ← starts the web server
├── reset.js             ← deletes ALL data (npm run reset)
├── reset-password.js    ← new password for one account (npm run reset-password)
├── .env                 ← your settings (database address, port)
├── models/              ← database tables (MongoDB collections)
│   ├── User.js          ← staff accounts, roles, privileges
│   ├── Patient.js       ← patient info, medical history, insurance
│   ├── Admission.js     ← admissions (physician, reason, date/time, status)
│   ├── Assessment.js    ← patient assessments (complaint, vital signs, triage, recommendation)
│   ├── AuditLog.js      ← audit trail
│   └── Counter.js       ← makes Patient IDs, Assessment Nos. and Admission Nos.
├── routes/              ← what happens when a page is opened or a form is saved
├── views/               ← the screens (HTML + EJS)
├── middleware/auth.js   ← login check and privileges
├── utils/               ← audit helper, date formatting
└── public/              ← CSS design and browser JavaScript
```

**To change the look**, edit `public/css/style.css`.
**To change a screen**, edit the matching file in `views/`.
**To change what a role can do by default**, edit `ROLE_DEFAULTS` in `models/User.js`.

---

## 6. Open it from other computers (web-based)

The system is a website, so other computers on the **same network** (hospital LAN or Wi-Fi) can use it:

1. On the computer running the system, open Command Prompt and type `ipconfig`. Note the **IPv4 Address** (e.g. `192.168.1.10`).
2. On another computer, open a browser and go to `http://192.168.1.10:3000`.
3. If it does not open, allow **Node.js** through **Windows Defender Firewall** (Private networks).

To put it **online** later: create a free database on **MongoDB Atlas**, paste its connection string into `MONGODB_URI` in `.env`, and deploy to a hosting service such as Render or Railway.

---

## 7. Viewing the database

Open **MongoDB Compass** and connect to `mongodb://127.0.0.1:27017`, then open the **mediadmit** database. You will see the collections `users`, `patients`, `assessments`, `admissions`, `auditlogs`, `counters` and `sessions` (who is signed in).

---

## 8. Common problems

| Problem | Fix |
|---|---|
| `Could not connect to MongoDB` / `ECONNREFUSED 127.0.0.1:27017` | MongoDB is not running. Press **Win + R**, type `services.msc`, find **MongoDB Server**, and click **Start**. |
| `'npm' is not recognized` | Node.js is not installed, or VS Code was open during the install. Install Node.js LTS, then close and reopen VS Code. |
| `npm start` or another npm command gives a red "running scripts is disabled" error | In the VS Code terminal, click the **+ ▾** dropdown and choose **Command Prompt** instead of PowerShell. |
| `EADDRINUSE :::3000` | The server is already running in another terminal. Close it, or change `PORT=3001` in `.env`. |
| Can't log in after Sign Up | The account is **Pending**. Log in as the Administrator, go to **Users**, and click **Approve**. |
| Forgot the Administrator password | In the terminal (stop the server first with Ctrl + C), type `npm run reset-password -- your@email.com`. It prints a temporary password. No data is deleted. |
| I want to delete everything and start again | `npm run reset`, then type `DELETE`. ⚠️ This deletes all users, patients, assessments, admissions and the audit trail. The next time you open the site it shows First-time setup. |
| A staff member forgot their password | Administrator: open **Users**, select the person, click **Reset Password**, and give them the temporary password shown. They can then set their own on **My Account**. |

---

## 9. Working as a group with Git

```bash
git init
git add .
git commit -m "MediAdmit starter project"
```
Then create a repository on GitHub and follow its instructions to push. Each member can **clone** it, run `npm install`, create their own `.env`, and start coding.
`.env` and `node_modules` are excluded on purpose (see `.gitignore`), so each member runs `npm install` after cloning.
