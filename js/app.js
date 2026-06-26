document.addEventListener("DOMContentLoaded", () => {
    // Check and initialize Storage
    StorageManager.initialize();
    
    // Boot managers
    window.settingsManager = new SettingsManager();
    window.dashboardManager = new DashboardManager();
    
    // Check overdue loans immediately on launch
    LoanManager.checkAndUpdateOverdueLoans();

    // App Global State
    window.App = {
        activeTab: 'dashboard',
        currentReportData: null,
        
        // Modals
        modals: {
            borrower: new bootstrap.Modal(document.getElementById('modalBorrower')),
            loan: new bootstrap.Modal(document.getElementById('modalLoan')),
            collection: new bootstrap.Modal(document.getElementById('modalCollection')),
            ledger: new bootstrap.Modal(document.getElementById('modalLedger')),
            loanDetails: new bootstrap.Modal(document.getElementById('modalLoanDetails'))
        },

        init() {
            this.bindEvents();
            this.updateGlobalSettingsUI();
            this.switchTab(this.activeTab);
            this.showToast("LendFlow Money Manager initialized offline.", "System Status", "info");
        },

        // Toast Helper
        showToast(message, title = "LendFlow", type = "info") {
            const toastEl = document.getElementById('appToast');
            const toastMessage = document.getElementById('toastMessage');
            const toastTitle = document.getElementById('toastTitle');
            const toastIcon = document.getElementById('toastIcon');

            toastMessage.textContent = message;
            toastTitle.textContent = title;

            // Reset classes
            toastIcon.className = "bi me-2 ";
            if (type === "success") {
                toastIcon.classList.add("bi-check-circle-fill", "text-success");
            } else if (type === "warning") {
                toastIcon.classList.add("bi-exclamation-triangle-fill", "text-warning");
            } else if (type === "danger") {
                toastIcon.classList.add("bi-x-circle-fill", "text-danger");
            } else {
                toastIcon.classList.add("bi-info-circle-fill", "text-primary");
            }

            const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
            toast.show();
        },

        // Update settings in layouts
        updateGlobalSettingsUI() {
            const settings = window.settingsManager.getSettings();
            
            // Sidebar Profile
            document.getElementById('navLenderName').textContent = settings.lenderName;
            document.getElementById('navBusinessName').textContent = settings.businessName;
            document.getElementById('avatarLetter').textContent = settings.lenderName.charAt(0).toUpperCase();

            // Form Currencies
            document.getElementById('loanCurrencyPrefix').textContent = settings.currencySymbol;
            document.getElementById('collCurrencyPrefix').textContent = settings.currencySymbol;

            // Theme Icon
            const themeIcon = document.getElementById('themeIcon');
            if (settings.themePreference === 'dark') {
                themeIcon.className = 'bi bi-sun-fill';
            } else {
                themeIcon.className = 'bi bi-moon-fill';
            }
        },

        // Tab Router
        switchTab(tabName) {
            this.activeTab = tabName;
            
            // Update Active Class in Sidebar
            document.querySelectorAll('.sidebar-item').forEach(item => {
                if (item.getAttribute('data-tab') === tabName) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            // Update visible content views
            document.querySelectorAll('.app-view').forEach(view => {
                if (view.id === `view-${tabName}`) {
                    view.classList.add('active');
                } else {
                    view.classList.remove('active');
                }
            });

            // Set Title Header
            const titleMap = {
                'dashboard': 'Dashboard Metrics',
                'borrowers': 'Borrowers Registry',
                'loans': 'Loan Ledgers',
                'collections': 'Collections Records',
                'dues': 'Outstanding Dues Tracker',
                'reports': 'Financial Statement Reports',
                'settings': 'System Settings',
                'activity-log': 'System Activity Log'
            };
            document.getElementById('viewTitle').textContent = titleMap[tabName] || 'LendFlow';

            // Refresh specific tab data
            this.refreshTabData(tabName);
            
            // Close mobile drawer if open
            document.getElementById('sidebar').classList.remove('show');
            document.getElementById('sidebarOverlay').classList.remove('show');
        },

        refreshTabData(tabName) {
            const settings = window.settingsManager.getSettings();
            const symbol = settings.currencySymbol;

            switch (tabName) {
                case 'dashboard':
                    this.renderDashboard(symbol);
                    break;
                case 'borrowers':
                    this.renderBorrowersList();
                    break;
                case 'loans':
                    this.renderLoansList(symbol);
                    break;
                case 'collections':
                    this.renderCollectionsList(symbol);
                    break;
                case 'dues':
                    this.renderDuesTracker(symbol);
                    break;
                case 'reports':
                    // Just reset report layout on tab entry
                    this.resetReportView();
                    break;
                case 'settings':
                    this.loadSettingsForm();
                    break;
                case 'activity-log':
                    this.renderFullActivityLog();
                    break;
            }

            // Always update top bar counters
            this.updateNavbarQuickStats(symbol);
        },

        updateNavbarQuickStats(symbol) {
            const kpis = window.dashboardManager.getKPIs();
            document.getElementById('quickReceived').textContent = symbol + kpis.totalInterestEarned.toLocaleString();
            document.getElementById('quickLent').textContent = symbol + kpis.totalMoneyLent.toLocaleString();
        },

        // ==================== DASHBOARD VIEW ====================
        renderDashboard(symbol) {
            const kpis = window.dashboardManager.getKPIs();

            // Populate KPIs
            document.getElementById('kpiTotalLent').textContent = symbol + kpis.totalMoneyLent.toLocaleString();
            document.getElementById('kpiOutstandingPrincipal').textContent = symbol + kpis.totalOutstandingPrincipal.toLocaleString();
            document.getElementById('kpiInterestEarned').textContent = symbol + kpis.totalInterestEarned.toLocaleString();
            document.getElementById('kpiReceivableInterest').textContent = symbol + kpis.totalInterestReceivable.toLocaleString();
            
            document.getElementById('kpiActiveLoans').textContent = kpis.activeLoans;
            document.getElementById('kpiClosedLoans').textContent = kpis.closedLoans;
            document.getElementById('kpiOverdueLoans').textContent = kpis.overdueLoans;
            
            document.getElementById('kpiTodayCollections').textContent = symbol + kpis.todayCollections.toLocaleString();
            document.getElementById('kpiMonthlyCollections').textContent = symbol + kpis.monthlyCollections.toLocaleString();

            // Render Charts
            window.dashboardManager.renderDashboardCharts(symbol);

            // Populate dashboard mini activity logs (last 5)
            const logs = StorageManager.get(StorageManager.KEYS.ACTIVITY_LOG) || [];
            const container = document.getElementById('dashboardActivityLog');
            container.innerHTML = "";

            if (logs.length === 0) {
                container.innerHTML = `<div class="text-muted small py-2">No activity logged yet.</div>`;
                return;
            }

            logs.slice(0, 5).forEach(log => {
                const date = new Date(log.timestamp).toLocaleString();
                const typeClass = log.actionType.toLowerCase();
                container.innerHTML += `
                    <div class="timeline-item ${typeClass}">
                        <div class="timeline-time">${date}</div>
                        <div class="timeline-desc">${log.details}</div>
                    </div>
                `;
            });
        },

        // ==================== BORROWERS VIEW ====================
        renderBorrowersList() {
            const borrowers = BorrowerManager.getBorrowers();
            const searchVal = document.getElementById('searchBorrowerInput').value.toLowerCase().trim();
            const tbody = document.getElementById('borrowersTableBody');
            tbody.innerHTML = "";

            const filtered = borrowers.filter(b => 
                b.name.toLowerCase().includes(searchVal) || 
                b.mobile.includes(searchVal) || 
                b.id.toLowerCase().includes(searchVal)
            );

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No borrowers found matching criteria.</td></tr>`;
                return;
            }

            filtered.forEach(b => {
                tbody.innerHTML += `
                    <tr>
                        <td><span class="fw-bold">${b.id}</span></td>
                        <td>
                            <div class="fw-bold text-main">${b.name}</div>
                            <small class="text-muted">${b.occupation || 'No Occupation'}</small>
                        </td>
                        <td>
                            <div><i class="bi bi-telephone-fill me-1 small text-muted"></i>${b.mobile}</div>
                            ${b.phoneAlt ? `<small class="text-muted">Alt: ${b.phoneAlt}</small>` : ''}
                        </td>
                        <td>
                            <div>${b.guarantorName || '-'}</div>
                            <small class="text-muted">${b.guarantorPhone || ''}</small>
                        </td>
                        <td>${b.createdDate}</td>
                        <td class="text-end">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-info" onclick="App.viewLedger('${b.id}')" title="View Transaction Ledger">
                                    <i class="bi bi-receipt"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary" onclick="App.editBorrower('${b.id}')" title="Edit Profile">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="App.deleteBorrower('${b.id}')" title="Delete Profile">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        },

        viewLedger(borrowerId) {
            const borrower = BorrowerManager.getBorrower(borrowerId);
            if (!borrower) return;

            const settings = window.settingsManager.getSettings();
            const symbol = settings.currencySymbol;

            document.getElementById('ledgerTitleName').textContent = `${borrower.name}'s Financial Statement`;
            document.getElementById('ledBorrowerId').textContent = borrower.id;
            document.getElementById('ledBorrowerMobile').textContent = borrower.mobile + (borrower.phoneAlt ? ` / ${borrower.phoneAlt}` : '');
            document.getElementById('ledBorrowerAadhaar').textContent = borrower.aadhaar || 'Not Provided';
            document.getElementById('ledBorrowerPAN').textContent = borrower.pan || 'Not Provided';
            document.getElementById('ledBorrowerOccupation').textContent = borrower.occupation || 'Not Provided';
            document.getElementById('ledBorrowerGuarantor').textContent = borrower.guarantorName ? `${borrower.guarantorName} (${borrower.guarantorPhone || '-'})` : 'Not Provided';

            // Calculate summaries
            const loans = LoanManager.getLoans().filter(l => l.borrowerId === borrowerId);
            const txns = TransactionManager.getTransactions().filter(t => t.borrowerId === borrowerId);

            const totalBorrowed = loans.reduce((sum, l) => sum + l.principal, 0);
            const totalPaid = txns.reduce((sum, t) => sum + t.amount, 0);
            
            let outstandingPrincipal = 0;
            loans.forEach(l => {
                const details = LoanManager.calculateLoanDetails(l);
                outstandingPrincipal += details.remainingPrincipal;
            });

            document.getElementById('ledTotalLoans').textContent = loans.length;
            document.getElementById('ledTotalBorrowed').textContent = symbol + totalBorrowed.toLocaleString();
            document.getElementById('ledTotalPaid').textContent = symbol + totalPaid.toLocaleString();
            document.getElementById('ledOutstandingPrincipal').textContent = symbol + outstandingPrincipal.toLocaleString();

            // Populate Ledger Table
            const ledger = BorrowerManager.getLedger(borrowerId);
            const tbody = document.getElementById('ledgerTableBody');
            tbody.innerHTML = "";

            if (ledger.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No loan or payment records registered.</td></tr>`;
            } else {
                ledger.forEach(item => {
                    let descClass = "";
                    let debitStr = "-";
                    let creditStr = "-";

                    if (item.type === "DISBURSEMENT") {
                        descClass = "text-primary fw-bold";
                        debitStr = symbol + item.amount.toLocaleString();
                    } else if (item.type === "PAYMENT") {
                        descClass = "text-success";
                        creditStr = symbol + item.amount.toLocaleString();
                    } else if (item.isStatus) {
                        descClass = "text-muted font-monospace small";
                    }

                    tbody.innerHTML += `
                        <tr>
                            <td>${item.date}</td>
                            <td class="${descClass}">${item.description}</td>
                            <td><span class="badge bg-secondary">${item.refId}</span></td>
                            <td class="text-end text-danger">${debitStr}</td>
                            <td class="text-end text-success">${creditStr}</td>
                            <td class="text-end fw-bold">${item.runningPrincipal !== undefined ? symbol + item.runningPrincipal.toLocaleString() : '-'}</td>
                        </tr>
                    `;
                });
            }

            // Print Ledger Event Handler
            document.getElementById('btnPrintLedger').onclick = () => {
                window.print();
            };

            this.modals.ledger.show();
        },

        editBorrower(id) {
            const b = BorrowerManager.getBorrower(id);
            if (!b) return;

            document.getElementById('modalBorrowerTitle').textContent = "Modify Borrower details";
            document.getElementById('borrowerFormId').value = b.id;
            document.getElementById('borrowerName').value = b.name;
            document.getElementById('borrowerMobile').value = b.mobile;
            document.getElementById('borrowerPhoneAlt').value = b.phoneAlt;
            document.getElementById('borrowerOccupation').value = b.occupation;
            document.getElementById('borrowerAadhaar').value = b.aadhaar;
            document.getElementById('borrowerPAN').value = b.pan;
            document.getElementById('borrowerGuarantorName').value = b.guarantorName;
            document.getElementById('borrowerGuarantorPhone').value = b.guarantorPhone;
            document.getElementById('borrowerAddress').value = b.address;
            document.getElementById('borrowerCity').value = b.city;
            document.getElementById('borrowerState').value = b.state;
            document.getElementById('borrowerNotes').value = b.notes;

            this.modals.borrower.show();
        },

        deleteBorrower(id) {
            const b = BorrowerManager.getBorrower(id);
            if (!b) return;

            if (confirm(`Are you absolutely sure you want to delete ${b.name}? This will clear all closed transactions and loan records permanently. This action is irreversible.`)) {
                try {
                    BorrowerManager.deleteBorrower(id);
                    this.showToast(`Borrower ${b.name} has been deleted.`, "Profile Deleted", "success");
                    this.refreshTabData('borrowers');
                } catch (e) {
                    this.showToast(e.message, "Deletion Rejected", "danger");
                }
            }
        },

        // ==================== LOANS VIEW ====================
        renderLoansList(symbol) {
            const loans = LoanManager.getLoans();
            const searchVal = document.getElementById('searchLoanInput').value.toLowerCase().trim();
            const statusFilter = document.getElementById('filterLoanStatus').value;
            const tbody = document.getElementById('loansTableBody');
            tbody.innerHTML = "";

            const borrowers = BorrowerManager.getBorrowers();

            const filtered = loans.filter(l => {
                const borrower = borrowers.find(b => b.id === l.borrowerId);
                const bName = borrower ? borrower.name.toLowerCase() : "";
                
                const matchesSearch = l.id.toLowerCase().includes(searchVal) || bName.includes(searchVal);
                const matchesStatus = statusFilter === "All" || l.status === statusFilter;
                
                return matchesSearch && matchesStatus;
            });

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">No loans registered matching filters.</td></tr>`;
                return;
            }

            filtered.forEach(l => {
                const borrower = borrowers.find(b => b.id === l.borrowerId);
                const details = LoanManager.calculateLoanDetails(l);
                
                let badgeClass = "bg-primary";
                if (l.status === "Closed") badgeClass = "bg-success";
                else if (l.status === "Overdue") badgeClass = "bg-danger";

                tbody.innerHTML += `
                    <tr>
                        <td><span class="fw-bold">${l.id}</span></td>
                        <td>
                            <div class="fw-bold text-main">${borrower ? borrower.name : "Unknown"}</div>
                            <small class="text-muted">${l.borrowerId}</small>
                        </td>
                        <td><span class="fw-bold">${symbol}${l.principal.toLocaleString()}</span></td>
                        <td>${l.interestRate}% <small class="text-muted">${l.interestType.charAt(0)}</small></td>
                        <td class="text-primary">${symbol}${details.totalInterestAccrued.toLocaleString()}</td>
                        <td class="text-success">${symbol}${details.totalReceived.toLocaleString()}</td>
                        <td class="text-danger fw-bold">${symbol}${details.totalOutstanding.toLocaleString()}</td>
                        <td>${l.dueDate}</td>
                        <td><span class="badge ${badgeClass} badge-premium">${l.status}</span></td>
                        <td class="text-end">
                            <div class="btn-group">
                                <button class="btn btn-sm btn-outline-info" onclick="App.viewLoanDetails('${l.id}')" title="View Balance Sheet">
                                    <i class="bi bi-journal-text"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="App.deleteLoan('${l.id}')" title="Delete Loan Record">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
        },

        viewLoanDetails(loanId) {
            const loan = LoanManager.getLoan(loanId);
            if (!loan) return;

            const settings = window.settingsManager.getSettings();
            const symbol = settings.currencySymbol;
            const borrower = BorrowerManager.getBorrower(loan.borrowerId);
            
            const details = LoanManager.calculateLoanDetails(loan);

            document.getElementById('loanDetailsTitle').textContent = `Balance Sheet - ${loanId}`;
            document.getElementById('detLoanId').textContent = loanId;
            document.getElementById('detBorrower').textContent = borrower ? `${borrower.name} (${loan.borrowerId})` : 'Unknown';
            document.getElementById('detDisbursedDate').textContent = loan.loanDate;
            document.getElementById('detDueDate').textContent = loan.dueDate;
            document.getElementById('detPrincipal').textContent = symbol + loan.principal.toLocaleString();
            document.getElementById('detRate').textContent = `${loan.interestRate}% per ${loan.interestType}`;

            document.getElementById('detInterestAccrued').textContent = symbol + details.totalInterestAccrued.toLocaleString();
            document.getElementById('detTotalPaid').textContent = symbol + details.totalReceived.toLocaleString();
            document.getElementById('detPrincipalPaid').textContent = symbol + details.principalPaid.toLocaleString();
            document.getElementById('detInterestPaid').textContent = symbol + details.interestPaid.toLocaleString();
            document.getElementById('detRemainingPrincipal').textContent = symbol + details.remainingPrincipal.toLocaleString();
            document.getElementById('detTotalOutstanding').textContent = symbol + details.totalOutstanding.toLocaleString();

            document.getElementById('detProfitability').textContent = `${details.profitability}% Return on Disbursed Principal`;

            // Populate History
            const txns = TransactionManager.getTransactions().filter(t => t.loanId === loanId);
            const tbody = document.getElementById('loanTxTableBody');
            tbody.innerHTML = "";

            if (txns.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-3">No payments recorded.</td></tr>`;
            } else {
                txns.forEach(t => {
                    tbody.innerHTML += `
                        <tr>
                            <td><span class="badge bg-secondary">${t.receiptNumber}</span></td>
                            <td>${t.date}</td>
                            <td class="text-end fw-bold text-success">${symbol}${t.amount.toLocaleString()}</td>
                            <td class="text-end text-primary">${symbol}${t.interestPortion.toLocaleString()}</td>
                            <td class="text-end text-warning">${symbol}${t.principalPortion.toLocaleString()}</td>
                            <td><small>${t.notes || '-'}</small></td>
                        </tr>
                    `;
                });
            }

            this.modals.loanDetails.show();
        },

        deleteLoan(id) {
            if (confirm(`Are you sure you want to delete loan record ${id}? This cannot be undone.`)) {
                try {
                    LoanManager.deleteLoan(id);
                    this.showToast(`Loan ${id} was deleted successfully.`, "Loan Deleted", "success");
                    this.refreshTabData('loans');
                } catch (e) {
                    this.showToast(e.message, "Deletion Error", "danger");
                }
            }
        },

        // ==================== COLLECTIONS VIEW ====================
        renderCollectionsList(symbol) {
            const txns = TransactionManager.getTransactions();
            const searchVal = document.getElementById('searchCollectionInput').value.toLowerCase().trim();
            const tbody = document.getElementById('collectionsTableBody');
            tbody.innerHTML = "";

            const borrowers = BorrowerManager.getBorrowers();
            const loans = LoanManager.getLoans();

            // Filter transactions
            const filtered = txns.filter(t => {
                const borrower = borrowers.find(b => b.id === t.borrowerId);
                const bName = borrower ? borrower.name.toLowerCase() : "";
                
                return t.receiptNumber.toLowerCase().includes(searchVal) || 
                       t.loanId.toLowerCase().includes(searchVal) || 
                       bName.includes(searchVal);
            });

            // Sort chronologically reverse
            filtered.sort((a,b) => new Date(b.date) - new Date(a.date));

            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No payment collections found matching criteria.</td></tr>`;
                return;
            }

            filtered.forEach(t => {
                const borrower = borrowers.find(b => b.id === t.borrowerId);
                
                let allocationDetails = "";
                if (t.type === "Interest") {
                    allocationDetails = `<span class="badge bg-primary-light text-primary">Interest: ${symbol}${t.interestPortion}</span>`;
                } else if (t.type === "Principal") {
                    allocationDetails = `<span class="badge bg-warning-light text-warning">Principal: ${symbol}${t.principalPortion}</span>`;
                } else {
                    allocationDetails = `
                        <span class="badge bg-primary-light text-primary mb-1">Int: ${symbol}${t.interestPortion}</span>
                        <span class="badge bg-warning-light text-warning">Prin: ${symbol}${t.principalPortion}</span>
                    `;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><span class="fw-bold">${t.receiptNumber}</span></td>
                        <td><span class="badge bg-secondary">${t.loanId}</span></td>
                        <td>
                            <div class="fw-bold text-main">${borrower ? borrower.name : "Unknown"}</div>
                            <small class="text-muted">${t.borrowerId}</small>
                        </td>
                        <td>${t.date}</td>
                        <td><span class="fw-bold text-success">${symbol}${t.amount.toLocaleString()}</span></td>
                        <td>${allocationDetails}</td>
                        <td><small class="text-muted">${t.notes || '-'}</small></td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-danger" onclick="App.deleteCollection('${t.id}')" title="Delete Payment record">
                                <i class="bi bi-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        },

        deleteCollection(id) {
            if (confirm("Are you sure you want to delete this payment receipt? All loan interest calculations, principal balances, and ledger logs will roll back immediately.")) {
                try {
                    TransactionManager.deleteTransaction(id);
                    this.showToast("Payment receipt deleted and ledger rolled back.", "Payment Rolled Back", "success");
                    this.refreshTabData('collections');
                } catch (e) {
                    this.showToast(e.message, "Rollback Error", "danger");
                }
            }
        },

        // ==================== DUES VIEW ====================
        renderDuesTracker(symbol) {
            const loans = LoanManager.getLoans().filter(l => l.status !== "Closed");
            const borrowers = BorrowerManager.getBorrowers();
            const today = new Date();
            today.setHours(0,0,0,0);

            let countOverdue = 0;
            let countToday = 0;
            let countWeek = 0;
            let countMonth = 0;

            const duesList = [];

            loans.forEach(l => {
                const borrower = borrowers.find(b => b.id === l.borrowerId);
                const details = LoanManager.calculateLoanDetails(l);
                
                const dueDate = new Date(l.dueDate);
                dueDate.setHours(0,0,0,0);
                
                const diffTime = dueDate - today;
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

                let statusText = "";
                let classColor = "text-success"; // Green = Current

                if (diffDays < 0) {
                    countOverdue++;
                    statusText = `${Math.abs(diffDays)} Days Overdue`;
                    classColor = "text-danger fw-bold";
                } else if (diffDays === 0) {
                    countToday++;
                    statusText = "DUE TODAY";
                    classColor = "text-warning fw-bold";
                } else {
                    // Check if due in week (<= 7 days)
                    if (diffDays <= 7) {
                        countWeek++;
                        statusText = `Due in ${diffDays} days`;
                        classColor = "text-warning";
                    }
                    // Check if due in month (<= 30 days)
                    if (diffDays <= 30) {
                        countMonth++;
                    }
                    
                    if (statusText === "") {
                        statusText = `Due in ${diffDays} days`;
                    }
                }

                duesList.push({
                    loanId: l.id,
                    borrowerName: borrower ? borrower.name : "Unknown",
                    borrowerMobile: borrower ? borrower.mobile : "",
                    principal: l.principal,
                    outstanding: details.totalOutstanding,
                    dueDate: l.dueDate,
                    diffDays,
                    statusText,
                    classColor
                });
            });

            // Update Counts
            document.getElementById('dueCountOverdue').textContent = countOverdue;
            document.getElementById('dueCountToday').textContent = countToday;
            document.getElementById('dueCountWeek').textContent = countWeek;
            document.getElementById('dueCountMonth').textContent = countMonth;

            // Render Table Dues list
            const tbody = document.getElementById('duesTableBody');
            tbody.innerHTML = "";

            if (duesList.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No outstanding dues left. All loans fully paid!</td></tr>`;
                return;
            }

            // Default sorting: Overdue first
            duesList.sort((a,b) => a.diffDays - b.diffDays);

            duesList.forEach(item => {
                let indicator = `<span class="status-indicator bg-success"></span>`;
                if (item.diffDays < 0) {
                    indicator = `<span class="status-indicator bg-danger"></span>`;
                } else if (item.diffDays <= 7) {
                    indicator = `<span class="status-indicator bg-warning"></span>`;
                }

                tbody.innerHTML += `
                    <tr>
                        <td><span class="fw-bold">${item.loanId}</span></td>
                        <td>${item.borrowerName}</td>
                        <td>
                            <a href="tel:${item.borrowerMobile}" class="text-decoration-none text-main"><i class="bi bi-telephone-fill me-1 text-muted"></i>${item.borrowerMobile}</a>
                            <a href="https://wa.me/91${item.borrowerMobile}" target="_blank" class="ms-2 text-success" title="Message on WhatsApp"><i class="bi bi-whatsapp"></i></a>
                        </td>
                        <td>${symbol}${item.principal.toLocaleString()}</td>
                        <td class="fw-bold">${symbol}${item.outstanding.toLocaleString()}</td>
                        <td>${item.dueDate}</td>
                        <td class="${item.classColor}">${indicator}${item.statusText}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-success" onclick="App.openRecordCollectionForLoan('${item.loanId}')">
                                <i class="bi bi-cash-coin"></i> Record Payment
                            </button>
                        </td>
                    </tr>
                `;
            });
        },

        openRecordCollectionForLoan(loanId) {
            this.switchTab('collections');
            
            // Trigger record collection modal with this loan selected
            this.populateLoansDropdown();
            document.getElementById('collLoanId').value = loanId;
            this.updateLoanCollectionPreview();
            this.modals.collection.show();
        },

        // ==================== REPORTS VIEW ====================
        resetReportView() {
            document.getElementById('compiledReportCard').classList.add('d-none');
            document.getElementById('btnExportCSV').disabled = true;
            document.getElementById('btnPrintReport').disabled = true;
            this.currentReportData = null;
        },

        generateReport() {
            const reportType = document.getElementById('selectReportType').value;
            const filterType = document.getElementById('selectReportDateFilter').value;
            const customStart = document.getElementById('reportStartDate').value;
            const customEnd = document.getElementById('reportEndDate').value;

            const settings = window.settingsManager.getSettings();
            const symbol = settings.currencySymbol;

            let reportTitle = "";
            let reportSubtitle = `Compiled on ${new Date().toLocaleDateString()}`;
            let headers = [];
            let rows = [];
            let rawData = [];

            if (reportType === "active-loans") {
                reportTitle = "Active Loans Statement";
                headers = ["Loan ID", "Borrower", "Principal", "Rate", "Outstanding Balance", "Due Date", "Status"];
                rawData = ReportManager.getActiveLoans();
                
                rows = rawData.map(l => [
                    l.id,
                    `${l.borrowerName} (${l.borrowerId})`,
                    symbol + l.principal.toLocaleString(),
                    `${l.interestRate}% ${l.interestType}`,
                    symbol + l.totalOutstanding.toLocaleString(),
                    l.dueDate,
                    l.status
                ]);
            } else if (reportType === "closed-loans") {
                reportTitle = "Closed Loans Statement";
                headers = ["Loan ID", "Borrower", "Principal", "Rate", "Total Interest Paid", "Settled Date", "Status"];
                rawData = ReportManager.getClosedLoans();
                
                rows = rawData.map(l => [
                    l.id,
                    `${l.borrowerName} (${l.borrowerId})`,
                    symbol + l.principal.toLocaleString(),
                    `${l.interestRate}% ${l.interestType}`,
                    symbol + l.interestPaid.toLocaleString(),
                    l.dueDate, // Closed loans show due date as closed reference or actual close
                    l.status
                ]);
            } else if (reportType === "defaulters") {
                reportTitle = "Defaulters list (Overdue Loans)";
                headers = ["Loan ID", "Borrower", "Mobile", "Principal", "Outstanding Balance", "Due Date", "Days Overdue"];
                rawData = ReportManager.getDefaulters();
                
                rows = rawData.map(l => [
                    l.id,
                    l.borrowerName,
                    l.borrowerMobile,
                    symbol + l.principal.toLocaleString(),
                    symbol + l.totalOutstanding.toLocaleString(),
                    l.dueDate,
                    `${l.daysOverdue} Days`
                ]);
            } else if (reportType === "collections") {
                reportTitle = "Payments Collection Ledger";
                headers = ["Receipt #", "Loan ID", "Borrower", "Date", "Collected Amount", "Principal Part", "Interest Part", "Type"];
                rawData = ReportManager.getCollectionsReport(filterType, customStart, customEnd);
                
                rows = rawData.map(c => [
                    c.receiptNumber,
                    c.loanId,
                    c.borrowerName,
                    c.date,
                    symbol + c.amount.toLocaleString(),
                    symbol + c.principalPortion.toLocaleString(),
                    symbol + c.interestPortion.toLocaleString(),
                    c.type
                ]);
            } else if (reportType === "interest-earnings") {
                reportTitle = "Interest Net Earnings Ledger";
                headers = ["Receipt #", "Loan ID", "Borrower", "Collection Date", "Interest Component", "Allocated Notes"];
                rawData = ReportManager.getInterestEarningsReport(filterType, customStart, customEnd);
                
                rows = rawData.map(c => [
                    c.receiptNumber,
                    c.loanId,
                    c.borrowerName,
                    c.date,
                    symbol + c.interestPortion.toLocaleString(),
                    c.notes || 'None'
                ]);
            } else if (reportType === "monthly-profit") {
                reportTitle = "Monthly Net Interest Profits";
                headers = ["Month Year", "Transactions Count", "Interest Earned (Profits)", "Principal Recovered", "Gross Collected"];
                rawData = ReportManager.getMonthlyProfitReport();
                
                rows = rawData.map(m => [
                    m.month,
                    m.transactionCount,
                    symbol + m.interestEarnings.toLocaleString(),
                    symbol + m.principalCollected.toLocaleString(),
                    symbol + m.totalCollected.toLocaleString()
                ]);
            }

            // Render Output Table
            document.getElementById('compiledReportTitle').textContent = reportTitle;
            document.getElementById('compiledReportSubtitle').textContent = reportSubtitle;
            document.getElementById('reportResultBadge').textContent = `${rows.length} Records`;

            const headRow = document.getElementById('reportOutputTableHeader');
            headRow.innerHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join("") + "</tr>";

            const tbody = document.getElementById('reportOutputTableBody');
            tbody.innerHTML = "";

            if (rows.length === 0) {
                tbody.innerHTML = `<tr><td colspan="${headers.length}" class="text-center text-muted py-4">No records found matching date ranges.</td></tr>`;
            } else {
                rows.forEach(r => {
                    tbody.innerHTML += "<tr>" + r.map(cell => `<td>${cell}</td>`).join("") + "</tr>";
                });
            }

            // Reveal
            document.getElementById('compiledReportCard').classList.remove('d-none');
            
            // Enable Actions
            document.getElementById('btnExportCSV').disabled = rows.length === 0;
            document.getElementById('btnPrintReport').disabled = rows.length === 0;

            // Cache data for exports
            this.currentReportData = {
                title: reportTitle.replace(/\s+/g, "_"),
                headers: headers,
                rows: rows
            };

            this.showToast(`Report compiled with ${rows.length} logs.`, "Report Compiled", "success");
        },

        // ==================== SETTINGS VIEW ====================
        loadSettingsForm() {
            const settings = window.settingsManager.getSettings();
            document.getElementById('settingsBusinessName').value = settings.businessName;
            document.getElementById('settingsLenderName').value = settings.lenderName;
            document.getElementById('settingsDefaultRate').value = settings.defaultInterestRate;
            document.getElementById('settingsCurrency').value = settings.currencySymbol;
            document.getElementById('settingsBackupFreq').value = settings.backupPreferences || "weekly";
        },

        // ==================== ACTIVITY LOG VIEW ====================
        renderFullActivityLog() {
            const logs = StorageManager.get(StorageManager.KEYS.ACTIVITY_LOG) || [];
            const container = document.getElementById('fullActivityLogTimeline');
            container.innerHTML = "";

            if (logs.length === 0) {
                container.innerHTML = `<div class="text-muted small py-4 text-center">No system events logged.</div>`;
                return;
            }

            logs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleString();
                const typeClass = log.actionType.toLowerCase();
                container.innerHTML += `
                    <div class="timeline-item ${typeClass}">
                        <div class="timeline-time">${date}</div>
                        <div class="timeline-desc">
                            <span class="badge bg-secondary me-2">${log.actionType}</span>
                            ${log.details}
                        </div>
                    </div>
                `;
            });
        },

        // ==================== MODALS INITS ====================
        populateBorrowerDropdown() {
            const dropdown = document.getElementById('loanBorrowerId');
            dropdown.innerHTML = '<option value="" disabled selected>-- Select Borrower --</option>';
            
            const borrowers = BorrowerManager.getBorrowers();
            borrowers.forEach(b => {
                dropdown.innerHTML += `<option value="${b.id}">${b.name} (${b.mobile})</option>`;
            });
        },

        populateLoansDropdown() {
            const dropdown = document.getElementById('collLoanId');
            dropdown.innerHTML = '<option value="" disabled selected>-- Select Active Loan Reference --</option>';
            
            const loans = LoanManager.getLoans().filter(l => l.status !== "Closed");
            const borrowers = BorrowerManager.getBorrowers();

            loans.forEach(l => {
                const b = borrowers.find(x => x.id === l.borrowerId);
                dropdown.innerHTML += `<option value="${l.id}">${l.id} - ${b ? b.name : 'Unknown'} (Balance: ${l.principal})</option>`;
            });
        },

        updateLoanCollectionPreview() {
            const loanId = document.getElementById('collLoanId').value;
            const container = document.getElementById('collLoanPreviewContainer');
            const preview = document.getElementById('collLoanPreview');

            if (!loanId) {
                container.classList.add('d-none');
                return;
            }

            const loan = LoanManager.getLoan(loanId);
            if (!loan) {
                container.classList.add('d-none');
                return;
            }

            const settings = window.settingsManager.getSettings();
            const symbol = settings.currencySymbol;

            const details = LoanManager.calculateLoanDetails(loan);
            
            preview.innerHTML = `
                <div class="row g-2">
                    <div class="col-6"><strong>Principal Disbursed:</strong> ${symbol}${details.principal.toLocaleString()}</div>
                    <div class="col-6"><strong>Outstanding Principal:</strong> ${symbol}${details.remainingPrincipal.toLocaleString()}</div>
                    <div class="col-6"><strong>Total Accrued Interest:</strong> ${symbol}${details.totalInterestAccrued.toLocaleString()}</div>
                    <div class="col-6"><strong>Interest Received:</strong> ${symbol}${details.interestPaid.toLocaleString()}</div>
                    <div class="col-6 text-primary"><strong>Outstanding Interest:</strong> ${symbol}${details.remainingInterest.toLocaleString()}</div>
                    <div class="col-6 text-danger fw-bold"><strong>Total Balance Due:</strong> ${symbol}${details.totalOutstanding.toLocaleString()}</div>
                </div>
            `;
            container.classList.remove('d-none');
        },

        // ==================== BIND DOM EVENTS ====================
        bindEvents() {
            const self = this;

            // Sidebar toggles for mobile view
            document.getElementById('sidebarToggleBtn').onclick = () => {
                document.getElementById('sidebar').classList.add('show');
                document.getElementById('sidebarOverlay').classList.add('show');
            };
            document.getElementById('sidebarCloseBtn').onclick = () => {
                document.getElementById('sidebar').classList.remove('show');
                document.getElementById('sidebarOverlay').classList.remove('show');
            };
            document.getElementById('sidebarOverlay').onclick = () => {
                document.getElementById('sidebar').classList.remove('show');
                document.getElementById('sidebarOverlay').classList.remove('show');
            };

            // Sidebar Links Navigation
            document.querySelectorAll('.sidebar-item').forEach(item => {
                item.onclick = (e) => {
                    e.preventDefault();
                    const tab = item.getAttribute('data-tab');
                    self.switchTab(tab);
                };
            });

            // Theme Toggle click
            document.getElementById('btnThemeToggle').onclick = () => {
                const newTheme = window.settingsManager.toggleTheme();
                self.updateGlobalSettingsUI();
                self.showToast(`Theme switched to ${newTheme.toUpperCase()} mode.`, "Theme Updated", "success");
                // Re-render current tab if it's dashboard to fix chart grid colors
                if (self.activeTab === 'dashboard') {
                    self.renderDashboard(window.settingsManager.getSettings().currencySymbol);
                }
            };

            // Quick backup short-cut
            document.getElementById('btnQuickSettings').onclick = () => {
                BackupManager.exportData();
                self.showToast("Local backup file downloaded.", "Auto Backup", "success");
            };

            // Dashboard View All activity link
            document.getElementById('dashViewAllActivity').onclick = (e) => {
                e.preventDefault();
                self.switchTab('activity-log');
            };

            // Search inputs keyup
            document.getElementById('searchBorrowerInput').onkeyup = () => self.renderBorrowersList();
            document.getElementById('searchLoanInput').onkeyup = () => self.renderLoansList(window.settingsManager.getSettings().currencySymbol);
            document.getElementById('searchCollectionInput').onkeyup = () => self.renderCollectionsList(window.settingsManager.getSettings().currencySymbol);
            
            // Dropdown filters
            document.getElementById('filterLoanStatus').onchange = () => self.renderLoansList(window.settingsManager.getSettings().currencySymbol);

            // Modals add-triggers
            document.getElementById('btnAddBorrower').onclick = () => {
                document.getElementById('formBorrower').reset();
                document.getElementById('borrowerFormId').value = "";
                document.getElementById('modalBorrowerTitle').textContent = "Register Borrower";
                self.modals.borrower.show();
            };

            document.getElementById('btnAddLoan').onclick = () => {
                document.getElementById('formLoan').reset();
                self.populateBorrowerDropdown();
                // Set default date to today
                document.getElementById('loanDate').value = new Date().toISOString().slice(0, 10);
                document.getElementById('loanInterestRate').value = window.settingsManager.getSettings().defaultInterestRate;
                self.modals.loan.show();
            };

            document.getElementById('btnRecordCollection').onclick = () => {
                document.getElementById('formCollection').reset();
                self.populateLoansDropdown();
                document.getElementById('collDate').value = new Date().toISOString().slice(0, 10);
                document.getElementById('collLoanPreviewContainer').classList.add('d-none');
                self.modals.collection.show();
            };

            // Float Action Button Speed dial toggler
            document.getElementById('fabMainBtn').onclick = (e) => {
                e.stopPropagation();
                document.getElementById('quickActionButton').classList.toggle('active');
            };

            // Close FAB click elsewhere
            document.addEventListener("click", () => {
                document.getElementById('quickActionButton').classList.remove('active');
            });

            // FAB Action Button bindings
            document.getElementById('fabAddBorrower').onclick = () => {
                document.getElementById('btnAddBorrower').click();
            };
            document.getElementById('fabAddLoan').onclick = () => {
                document.getElementById('btnAddLoan').click();
            };
            document.getElementById('fabRecordCollection').onclick = () => {
                document.getElementById('btnRecordCollection').click();
            };

            // Dues tracker filter counts clicks
            document.getElementById('btnDueFilterAll').onclick = () => {
                document.getElementById('btnDueFilterAll').classList.add('active');
                document.getElementById('btnDueFilterOverdue').classList.remove('active');
                document.getElementById('duesTableTitle').textContent = "Outstanding Dues";
                self.renderDuesTracker(window.settingsManager.getSettings().currencySymbol);
            };
            document.getElementById('btnDueFilterOverdue').onclick = () => {
                document.getElementById('btnDueFilterOverdue').classList.add('active');
                document.getElementById('btnDueFilterAll').classList.remove('active');
                document.getElementById('duesTableTitle').textContent = "Overdue Accounts Only";
                
                // Render filter overdue only
                const symbol = window.settingsManager.getSettings().currencySymbol;
                self.renderDuesTracker(symbol);
                // Custom filter in body
                const tbody = document.getElementById('duesTableBody');
                const rows = tbody.querySelectorAll('tr');
                rows.forEach(row => {
                    const text = row.querySelector('td:nth-child(7)').textContent;
                    if (!text.includes("Overdue")) {
                        row.remove();
                    }
                });
                if (tbody.querySelectorAll('tr').length === 0) {
                    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">No overdue payments found. All active accounts are current!</td></tr>`;
                }
            };

            // Dynamic Loan Due Date auto-calculation
            const calculateDueDate = () => {
                const startDateStr = document.getElementById('loanDate').value;
                const durationMonths = parseInt(document.getElementById('loanDuration').value);
                
                if (startDateStr && !isNaN(durationMonths) && durationMonths > 0) {
                    const startDate = new Date(startDateStr);
                    startDate.setMonth(startDate.getMonth() + durationMonths);
                    
                    document.getElementById('loanDueDate').value = startDate.toISOString().slice(0, 10);
                }
            };
            document.getElementById('loanDate').onchange = calculateDueDate;
            document.getElementById('loanDuration').oninput = calculateDueDate;

            // Record Collection Loan dropdown preview change
            document.getElementById('collLoanId').onchange = () => {
                self.updateLoanCollectionPreview();
            };

            // ==================== FORMS SUBMIT OPERATIONS ====================

            // Borrower form submit
            document.getElementById('formBorrower').onsubmit = (e) => {
                e.preventDefault();
                const formId = document.getElementById('borrowerFormId').value;
                
                const data = {
                    name: document.getElementById('borrowerName').value,
                    mobile: document.getElementById('borrowerMobile').value,
                    phoneAlt: document.getElementById('borrowerPhoneAlt').value,
                    occupation: document.getElementById('borrowerOccupation').value,
                    aadhaar: document.getElementById('borrowerAadhaar').value,
                    pan: document.getElementById('borrowerPAN').value,
                    guarantorName: document.getElementById('borrowerGuarantorName').value,
                    guarantorPhone: document.getElementById('borrowerGuarantorPhone').value,
                    address: document.getElementById('borrowerAddress').value,
                    city: document.getElementById('borrowerCity').value,
                    state: document.getElementById('borrowerState').value,
                    notes: document.getElementById('borrowerNotes').value
                };

                try {
                    if (formId) {
                        // Update
                        BorrowerManager.updateBorrower(formId, data);
                        self.showToast(`Details updated for ${data.name}.`, "Profile Updated", "success");
                    } else {
                        // Add
                        const newB = BorrowerManager.addBorrower(data);
                        self.showToast(`New borrower ${newB.name} created successfully.`, "Profile Created", "success");
                    }
                    self.modals.borrower.hide();
                    self.refreshTabData(self.activeTab);
                } catch (err) {
                    self.showToast(err.message, "Form Error", "danger");
                }
            };

            // Loan form submit
            document.getElementById('formLoan').onsubmit = (e) => {
                e.preventDefault();
                const data = {
                    borrowerId: document.getElementById('loanBorrowerId').value,
                    principal: Number(document.getElementById('loanPrincipal').value),
                    interestRate: Number(document.getElementById('loanInterestRate').value),
                    interestType: document.getElementById('loanInterestType').value,
                    loanDate: document.getElementById('loanDate').value,
                    dueDate: document.getElementById('loanDueDate').value,
                    duration: Number(document.getElementById('loanDuration').value),
                    notes: document.getElementById('loanNotes').value
                };

                try {
                    const newLoan = LoanManager.addLoan(data);
                    self.showToast(`Disbursed loan ${newLoan.id} of ₹${newLoan.principal.toLocaleString()}`, "Loan Disbursed", "success");
                    self.modals.loan.hide();
                    self.refreshTabData(self.activeTab);
                } catch (err) {
                    self.showToast(err.message, "Disbursement Rejected", "danger");
                }
            };

            // Collection form submit
            document.getElementById('formCollection').onsubmit = (e) => {
                e.preventDefault();
                const data = {
                    loanId: document.getElementById('collLoanId').value,
                    date: document.getElementById('collDate').value,
                    type: document.getElementById('collType').value,
                    amount: Number(document.getElementById('collAmount').value),
                    notes: document.getElementById('collNotes').value
                };

                try {
                    const newTx = TransactionManager.addTransaction(data);
                    
                    // Celebrate if loan got closed!
                    const loan = LoanManager.getLoan(newTx.loanId);
                    if (loan.status === "Closed") {
                        confetti({
                            particleCount: 150,
                            spread: 80,
                            origin: { y: 0.6 }
                        });
                        self.showToast(`Loan ${newTx.loanId} fully closed and settled!`, "Loan Settled", "success");
                    } else {
                        self.showToast(`Collected ₹${newTx.amount.toLocaleString()} for Loan ${newTx.loanId}.`, "Payment Recorded", "success");
                    }

                    self.modals.collection.hide();
                    self.refreshTabData(self.activeTab);
                } catch (err) {
                    self.showToast(err.message, "Payment Refused", "danger");
                }
            };

            // Reports: Toggle Custom Date inputs
            document.getElementById('selectReportDateFilter').onchange = (e) => {
                const inputs = document.getElementById('customDateRangeInputs');
                if (e.target.value === 'custom') {
                    inputs.classList.remove('d-none');
                } else {
                    inputs.classList.add('d-none');
                }
            };

            // Generate report
            document.getElementById('btnGenerateReport').onclick = () => {
                self.generateReport();
            };

            // Export report to CSV
            document.getElementById('btnExportCSV').onclick = () => {
                if (self.currentReportData) {
                    ReportManager.exportToCSV(
                        self.currentReportData.title,
                        self.currentReportData.headers,
                        self.currentReportData.rows
                    );
                }
            };

            // Print report
            document.getElementById('btnPrintReport').onclick = () => {
                window.print();
            };

            // Settings save form submit
            document.getElementById('settingsForm').onsubmit = (e) => {
                e.preventDefault();
                const data = {
                    businessName: document.getElementById('settingsBusinessName').value,
                    lenderName: document.getElementById('settingsLenderName').value,
                    defaultInterestRate: Number(document.getElementById('settingsDefaultRate').value),
                    currencySymbol: document.getElementById('settingsCurrency').value,
                    backupPreferences: document.getElementById('settingsBackupFreq').value
                };

                const success = window.settingsManager.saveSettings(data);
                if (success) {
                    self.updateGlobalSettingsUI();
                    self.showToast("System configurations saved successfully.", "Settings Updated", "success");
                    self.refreshTabData(self.activeTab);
                }
            };

            // Settings: Backup local JSON file
            document.getElementById('btnBackupData').onclick = () => {
                BackupManager.exportData();
            };

            // Settings: Import JSON File
            document.getElementById('importFileInput').onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                BackupManager.importData(file, (success, message) => {
                    if (success) {
                        self.showToast(message, "Backup Restored", "success");
                        // Refresh settings context and reload app
                        window.settingsManager.loadSettings();
                        self.updateGlobalSettingsUI();
                        self.switchTab('dashboard');
                    } else {
                        self.showToast(message, "Import Failed", "danger");
                    }
                });
            };

            // Wipe Storage button
            document.getElementById('btnFactoryReset').onclick = () => {
                if (confirm("WARNING: You are about to clear all LocalStorage logs, borrower records, settings, and loan ledger listings permanently. This will reset the app and seed default demo data. Do you wish to proceed?")) {
                    StorageManager.clearAll();
                    StorageManager.seedDemoData();
                    
                    window.settingsManager.loadSettings();
                    self.updateGlobalSettingsUI();
                    self.showToast("Storage wiped. Default demo records re-seeded.", "Factory Reset Complete", "warning");
                    self.switchTab('dashboard');
                }
            };

            // Clear Activity Log view logs button
            document.getElementById('btnClearActivityLogs').onclick = () => {
                if (confirm("Are you sure you want to clear all system activity history?")) {
                    StorageManager.set(StorageManager.KEYS.ACTIVITY_LOG, []);
                    StorageManager.logActivity("UPDATE", "Cleared system activity logs.");
                    self.renderFullActivityLog();
                }
            };
        }
    };

    // Boot LendFlow
    window.App.init();
});
