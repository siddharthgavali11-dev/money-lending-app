# 💸 LendFlow – Private Money Lending Dashboard

LendFlow is a browser-based dashboard for managing borrowers, loans, collections, interest calculations, reports and backups, built for private lenders and small finance businesses.

**Live demo:** [money-lending-app-blue.vercel.app](https://money-lending-app-blue.vercel.app)

## 📌 Overview

LendFlow keeps everything in one dashboard: borrowers, loans, repayments, collections, interest calculations, overdue tracking, reports and backups.

It runs entirely in the browser, with no server or database. Data is stored in your browser's LocalStorage, so use Backup & Restore to keep a copy. The page loads Bootstrap, Chart.js and a few other libraries from CDNs, so it needs an internet connection to load.

## ✨ Features

### 📊 Dashboard
- Business overview with loan statistics and KPIs
- Collection summaries
- Outstanding balance tracking
- Overdue loan monitoring

### 👥 Borrower Management
- Add and manage borrower profiles
- Store contact and identification details
- Maintain guarantor information
- Borrower-wise loan history

### 💰 Loan Management
- Create and track loans
- Monthly or annual interest rates
- Automatic interest calculations
- Due date tracking
- Loan status management (Active, Closed, Overdue)

### 💵 Collections & Transactions
- Record repayments
- Principal and interest tracking
- Receipt generation
- Transaction history

### 📅 Dues Tracker
- Monitor upcoming dues
- Identify overdue accounts
- Track pending collections

### 📈 Reports
- Daily, weekly, monthly and yearly reports
- Custom date range reports

### ⚙️ Settings
- Business profile management
- Default interest configuration
- Currency customization
- Light / dark theme support

### 🔒 Backup & Restore
- Export complete application data
- Import backups
- JSON-based storage

## 🛠️ Tech Stack

- HTML5
- CSS3
- JavaScript (ES6)
- Bootstrap 5 and Bootstrap Icons
- Chart.js
- canvas-confetti
- LocalStorage API

## 📂 Project Structure

```
money-lending-app/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── storage.js
    ├── borrowerManager.js
    ├── loanManager.js
    ├── transactionManager.js
    ├── dashboardManager.js
    ├── reportManager.js
    ├── settingsManager.js
    └── backupManager.js
```

Each module in `js/` handles one area of the app (borrowers, loans, transactions, dashboard, reports, settings, backups), and `storage.js` wraps LocalStorage access.

## ▶️ Run Locally

```bash
git clone https://github.com/siddharthgavali11-dev/money-lending-app.git
cd money-lending-app
```

Open `index.html` in your browser. No installation or build step is needed.
