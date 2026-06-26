class ReportManager {
    static dateFilters = {
        TODAY: 'today',
        THIS_WEEK: 'week',
        THIS_MONTH: 'month',
        THIS_YEAR: 'year',
        CUSTOM: 'custom'
    };

    static isInDateRange(dateStr, filterType, customStart = null, customEnd = null) {
        const date = new Date(dateStr);
        date.setHours(0,0,0,0);
        
        const today = new Date();
        today.setHours(0,0,0,0);

        switch (filterType) {
            case this.dateFilters.TODAY:
                return date.getTime() === today.getTime();
                
            case this.dateFilters.THIS_WEEK: {
                const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)); // start on Monday
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return date >= startOfWeek && date <= endOfWeek;
            }
            case this.dateFilters.THIS_MONTH:
                return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
                
            case this.dateFilters.THIS_YEAR:
                return date.getFullYear() === today.getFullYear();
                
            case this.dateFilters.CUSTOM: {
                if (!customStart) return true;
                const start = new Date(customStart);
                start.setHours(0,0,0,0);
                const end = customEnd ? new Date(customEnd) : new Date();
                end.setHours(23,59,59,999);
                return date >= start && date <= end;
            }
            default:
                return true;
        }
    }

    static getActiveLoans() {
        const loans = LoanManager.getLoans();
        const borrowers = BorrowerManager.getBorrowers();
        return loans
            .filter(l => l.status === "Active" || l.status === "Overdue")
            .map(l => {
                const details = LoanManager.calculateLoanDetails(l);
                const borrower = borrowers.find(b => b.id === l.borrowerId);
                return {
                    ...details,
                    borrowerName: borrower ? borrower.name : "Unknown",
                    borrowerMobile: borrower ? borrower.mobile : ""
                };
            });
    }

    static getClosedLoans() {
        const loans = LoanManager.getLoans();
        const borrowers = BorrowerManager.getBorrowers();
        return loans
            .filter(l => l.status === "Closed")
            .map(l => {
                const details = LoanManager.calculateLoanDetails(l);
                const borrower = borrowers.find(b => b.id === l.borrowerId);
                return {
                    ...details,
                    borrowerName: borrower ? borrower.name : "Unknown",
                    borrowerMobile: borrower ? borrower.mobile : ""
                };
            });
    }

    static getDefaulters() {
        const loans = LoanManager.getLoans();
        const borrowers = BorrowerManager.getBorrowers();
        const todayStr = new Date().toISOString().slice(0, 10);
        
        return loans
            .filter(l => l.status === "Overdue" || (l.status === "Active" && l.dueDate < todayStr))
            .map(l => {
                const details = LoanManager.calculateLoanDetails(l);
                const borrower = borrowers.find(b => b.id === l.borrowerId);
                
                const dueDays = Math.round((new Date() - new Date(l.dueDate)) / (1000 * 60 * 60 * 24));

                return {
                    ...details,
                    borrowerName: borrower ? borrower.name : "Unknown",
                    borrowerMobile: borrower ? borrower.mobile : "",
                    daysOverdue: Math.max(0, dueDays)
                };
            });
    }

    static getCollectionsReport(filterType, customStart, customEnd) {
        const txns = TransactionManager.getTransactions();
        const loans = LoanManager.getLoans();
        const borrowers = BorrowerManager.getBorrowers();

        return txns
            .filter(t => this.isInDateRange(t.date, filterType, customStart, customEnd))
            .map(t => {
                const borrower = borrowers.find(b => b.id === t.borrowerId);
                const loan = loans.find(l => l.id === t.loanId);
                return {
                    id: t.id,
                    receiptNumber: t.receiptNumber,
                    borrowerId: t.borrowerId,
                    borrowerName: borrower ? borrower.name : "Unknown",
                    loanId: t.loanId,
                    date: t.date,
                    amount: t.amount,
                    type: t.type,
                    principalPortion: t.principalPortion,
                    interestPortion: t.interestPortion,
                    notes: t.notes
                };
            })
            .sort((a,b) => new Date(b.date) - new Date(a.date));
    }

    static getInterestEarningsReport(filterType, customStart, customEnd) {
        const collections = this.getCollectionsReport(filterType, customStart, customEnd);
        return collections.filter(c => c.interestPortion > 0);
    }

    static getMonthlyProfitReport() {
        const txns = TransactionManager.getTransactions();
        const profitMap = {};

        txns.forEach(t => {
            if (t.interestPortion <= 0) return;
            const date = new Date(t.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
            
            if (!profitMap[monthKey]) {
                profitMap[monthKey] = {
                    month: monthKey,
                    interestEarnings: 0,
                    principalCollected: 0,
                    totalCollected: 0,
                    transactionCount: 0
                };
            }

            profitMap[monthKey].interestEarnings += t.interestPortion;
            profitMap[monthKey].principalCollected += t.principalPortion;
            profitMap[monthKey].totalCollected += t.amount;
            profitMap[monthKey].transactionCount += 1;
        });

        return Object.values(profitMap).sort((a,b) => b.month.localeCompare(a.month));
    }

    static exportToCSV(filename, headers, rows) {
        let csvContent = "data:text/csv;charset=utf-8,";
        
        // Add headers
        csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",") + "\n";
        
        // Add rows
        rows.forEach(row => {
            const rowContent = row.map(val => {
                const cleanVal = (val === null || val === undefined) ? "" : String(val);
                return `"${cleanVal.replace(/"/g, '""')}"`;
            }).join(",");
            csvContent += rowContent + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    }
}
