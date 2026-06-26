class DashboardManager {
    constructor() {
        this.charts = {};
    }

    getKPIs() {
        const loans = LoanManager.getLoans();
        const txns = TransactionManager.getTransactions();
        
        const todayStr = new Date().toISOString().slice(0, 10);
        const thisMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

        let totalMoneyLent = 0;
        let totalOutstandingPrincipal = 0;
        let totalInterestEarned = 0;
        let totalInterestReceivable = 0;
        let activeLoansCount = 0;
        let closedLoansCount = 0;
        let overdueLoansCount = 0;
        let todayCollections = 0;
        let monthlyCollections = 0;

        // Process loans
        loans.forEach(loan => {
            totalMoneyLent += loan.principal;
            
            const details = LoanManager.calculateLoanDetails(loan);
            
            if (loan.status === "Active") {
                activeLoansCount++;
                totalOutstandingPrincipal += details.remainingPrincipal;
                totalInterestReceivable += details.remainingInterest;
            } else if (loan.status === "Overdue") {
                overdueLoansCount++;
                totalOutstandingPrincipal += details.remainingPrincipal;
                totalInterestReceivable += details.remainingInterest;
            } else if (loan.status === "Closed") {
                closedLoansCount++;
            }
        });

        // Process transactions
        txns.forEach(txn => {
            totalInterestEarned += Number(txn.interestPortion) || 0;
            
            if (txn.date === todayStr) {
                todayCollections += Number(txn.amount) || 0;
            }
            if (txn.date.startsWith(thisMonthStr)) {
                monthlyCollections += Number(txn.amount) || 0;
            }
        });

        return {
            totalMoneyLent,
            totalOutstandingPrincipal,
            totalInterestEarned,
            totalInterestReceivable,
            activeLoans: activeLoansCount,
            closedLoans: closedLoansCount,
            overdueLoans: overdueLoansCount,
            todayCollections,
            monthlyCollections,
            netProfit: totalInterestEarned // Interest represents profit in pure money lending
        };
    }

    renderDashboardCharts(currencySymbol = "₹") {
        this.destroyCharts();

        // 1. Loan Status Distribution
        this.renderStatusChart();

        // 2. Monthly Collections & Interest Earnings Trend (Combined 6 Months)
        this.renderMonthlyTrendsChart(currencySymbol);

        // 3. Top Borrowers by Outstanding Balance
        this.renderTopBorrowersChart(currencySymbol);
    }

    destroyCharts() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
            }
        });
        this.charts = {};
    }

    renderStatusChart() {
        const canvas = document.getElementById('chartStatus');
        if (!canvas) return;

        const loans = LoanManager.getLoans();
        let active = 0, closed = 0, overdue = 0;
        
        loans.forEach(l => {
            if (l.status === "Active") active++;
            else if (l.status === "Closed") closed++;
            else if (l.status === "Overdue") overdue++;
        });

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textMainColor = isDark ? '#f8fafc' : '#0f172a';

        this.charts.status = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Closed', 'Overdue'],
                datasets: [{
                    data: [active, closed, overdue],
                    backgroundColor: ['#6366f1', '#10b981', '#ef4444'],
                    borderWidth: 2,
                    borderColor: isDark ? '#151c2c' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textMainColor,
                            font: { family: 'Outfit' }
                        }
                    }
                }
            }
        });
    }

    renderMonthlyTrendsChart(currencySymbol) {
        const canvas = document.getElementById('chartMonthlyTrend');
        if (!canvas) return;

        // Calculate trends for last 6 months
        const months = [];
        const collectionsData = [];
        const interestData = [];
        
        const today = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            months.push({ label, prefix });
            collectionsData.push(0);
            interestData.push(0);
        }

        const txns = TransactionManager.getTransactions();
        txns.forEach(t => {
            const tPrefix = t.date.slice(0, 7); // YYYY-MM
            const index = months.findIndex(m => m.prefix === tPrefix);
            if (index !== -1) {
                collectionsData[index] += Number(t.amount) || 0;
                interestData[index] += Number(t.interestPortion) || 0;
            }
        });

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textMainColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#1e293b' : '#e2e8f0';

        this.charts.monthlyTrend = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: months.map(m => m.label),
                datasets: [
                    {
                        label: 'Total Collections',
                        data: collectionsData,
                        backgroundColor: 'rgba(99, 102, 241, 0.75)',
                        borderColor: '#6366f1',
                        borderWidth: 1,
                        borderRadius: 4
                    },
                    {
                        label: 'Interest Earned',
                        type: 'line',
                        data: interestData,
                        borderColor: '#10b981',
                        backgroundColor: '#10b981',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: isDark ? '#f8fafc' : '#0f172a',
                            font: { family: 'Outfit' }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += currencySymbol + context.parsed.y.toLocaleString();
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textMainColor, font: { family: 'Outfit' } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textMainColor, font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }

    renderTopBorrowersChart(currencySymbol) {
        const canvas = document.getElementById('chartTopBorrowers');
        if (!canvas) return;

        const borrowers = BorrowerManager.getBorrowers();
        const loans = LoanManager.getLoans();

        // Calculate outstanding balance for each borrower
        const borrowerBalances = borrowers.map(b => {
            const bLoans = loans.filter(l => l.borrowerId === b.id);
            let outstanding = 0;
            bLoans.forEach(l => {
                const details = LoanManager.calculateLoanDetails(l);
                outstanding += details.totalOutstanding;
            });
            return {
                name: b.name,
                outstanding: Math.round(outstanding)
            };
        });

        // Sort and take top 5
        const top5 = borrowerBalances
            .filter(b => b.outstanding > 0)
            .sort((a, b) => b.outstanding - a.outstanding)
            .slice(0, 5);

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textMainColor = isDark ? '#94a3b8' : '#64748b';
        const gridColor = isDark ? '#1e293b' : '#e2e8f0';

        this.charts.topBorrowers = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: top5.map(b => b.name),
                datasets: [{
                    label: 'Outstanding Balance',
                    data: top5.map(b => b.outstanding),
                    backgroundColor: '#06b6d4',
                    borderRadius: 4,
                    barThickness: 15
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Outstanding: ${currencySymbol}${context.parsed.x.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textMainColor, font: { family: 'Outfit' } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textMainColor, font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }
}
