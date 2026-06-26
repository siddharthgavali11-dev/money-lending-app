class Loan {
    constructor(data) {
        this.id = data.id || null;
        this.borrowerId = data.borrowerId || "";
        this.principal = Number(data.principal) || 0;
        this.interestRate = Number(data.interestRate) || 0;
        this.interestType = data.interestType || "monthly"; // monthly or annual
        this.loanDate = data.loanDate || new Date().toISOString().slice(0, 10);
        this.dueDate = data.dueDate || "";
        this.duration = Number(data.duration) || 0; // in months
        this.status = data.status || "Active"; // Active, Closed, Overdue
        this.notes = data.notes || "";
        this.createdDate = data.createdDate || new Date().toISOString().slice(0, 10);
    }
}

class InterestCalculator {
    /**
     * Calculates interest accrued based on reducing principal balance over time.
     * Interest is calculated daily: (Principal * Rate * Days) / (30 * 100) for monthly rate.
     */
    static calculateAccrued(loan, transactions, targetDateStr = new Date().toISOString().slice(0, 10)) {
        // If loan is Closed, the total accrued interest is equal to the sum of interest paid.
        // This is because once closed, we lock the interest at the amount settled.
        if (loan.status === "Closed") {
            return transactions
                .filter(t => t.loanId === loan.id)
                .reduce((sum, t) => sum + (Number(t.interestPortion) || 0), 0);
        }

        const loanDate = new Date(loan.loanDate);
        const targetDate = new Date(targetDateStr);
        
        // Return 0 if target date is before loan date
        if (targetDate < loanDate) return 0;

        // Get all transactions that reduce the principal
        const principalPayments = transactions
            .filter(t => t.loanId === loan.id && Number(t.principalPortion) > 0)
            .map(t => ({
                date: new Date(t.date),
                amount: Number(t.principalPortion)
            }))
            .sort((a, b) => a.date - b.date);

        // Divide timeline into intervals where the principal was constant
        let totalInterest = 0;
        let currentPrincipal = loan.principal;
        let lastDate = loanDate;

        const ratePerMonth = loan.interestType === "monthly" ? loan.interestRate : (loan.interestRate / 12);

        for (const payment of principalPayments) {
            if (payment.date > targetDate) break;
            
            // Accrue interest for the period before this payment
            if (payment.date > lastDate) {
                const days = Math.round((payment.date - lastDate) / (1000 * 60 * 60 * 24));
                const months = days / 30.4375;
                const accrued = currentPrincipal * (ratePerMonth / 100) * months;
                totalInterest += accrued;
            }
            
            currentPrincipal -= payment.amount;
            // Cap principal at 0
            if (currentPrincipal < 0) currentPrincipal = 0;
            lastDate = payment.date;
        }

        // Accrue interest for the remaining period up to the target date
        if (targetDate > lastDate && currentPrincipal > 0) {
            const days = Math.round((targetDate - lastDate) / (1000 * 60 * 60 * 24));
            const months = days / 30.4375;
            const accrued = currentPrincipal * (ratePerMonth / 100) * months;
            totalInterest += accrued;
        }

        return Math.round(totalInterest * 100) / 100;
    }
}

class LoanManager {
    static getLoans() {
        return StorageManager.get(StorageManager.KEYS.LOANS) || [];
    }

    static getLoan(id) {
        const loans = this.getLoans();
        return loans.find(l => l.id === id) || null;
    }

    static generateId() {
        const loans = this.getLoans();
        if (loans.length === 0) return "LON-20001";
        
        const ids = loans.map(l => {
            const num = parseInt(l.id.split('-')[1]);
            return isNaN(num) ? 20000 : num;
        });
        const maxId = Math.max(...ids);
        return `LON-${maxId + 1}`;
    }

    static addLoan(loanData) {
        if (!loanData.borrowerId || !loanData.principal || !loanData.interestRate || !loanData.loanDate || !loanData.dueDate) {
            throw new Error("Missing required loan fields (Borrower, Principal, Rate, Dates).");
        }

        if (Number(loanData.principal) <= 0 || Number(loanData.interestRate) <= 0) {
            throw new Error("Principal and Interest Rate must be greater than zero.");
        }

        const loans = this.getLoans();
        loanData.id = this.generateId();
        const newLoan = new Loan(loanData);

        // Check if date is overdue on creation
        const todayStr = new Date().toISOString().slice(0, 10);
        if (newLoan.dueDate < todayStr) {
            newLoan.status = "Overdue";
        }

        loans.push(newLoan);
        const success = StorageManager.set(StorageManager.KEYS.LOANS, loans);
        if (success) {
            StorageManager.logActivity("CREATE", `Disbursed loan ${newLoan.id} of ₹${newLoan.principal} to Borrower ${newLoan.borrowerId}`);
        }
        return newLoan;
    }

    static updateLoan(id, loanData) {
        const loans = this.getLoans();
        const index = loans.findIndex(l => l.id === id);
        if (index === -1) throw new Error("Loan not found.");

        loanData.id = id;
        loanData.createdDate = loans[index].createdDate;
        loans[index] = new Loan(loanData);

        const success = StorageManager.set(StorageManager.KEYS.LOANS, loans);
        if (success) {
            StorageManager.logActivity("UPDATE", `Updated loan specifications for ${id}`);
        }
        return success;
    }

    static changeStatus(id, status) {
        const loans = this.getLoans();
        const index = loans.findIndex(l => l.id === id);
        if (index === -1) throw new Error("Loan not found.");
        
        const oldStatus = loans[index].status;
        loans[index].status = status;
        
        const success = StorageManager.set(StorageManager.KEYS.LOANS, loans);
        if (success && oldStatus !== status) {
            StorageManager.logActivity("UPDATE", `Loan ${id} status updated to ${status}`);
        }
        return success;
    }

    static deleteLoan(id) {
        const transactions = StorageManager.get(StorageManager.KEYS.TRANSACTIONS) || [];
        const hasTxns = transactions.some(t => t.loanId === id);
        if (hasTxns) {
            throw new Error("Cannot delete loan. Transactions are recorded against this loan. Delete transactions first.");
        }

        const loans = this.getLoans();
        const updated = loans.filter(l => l.id !== id);
        const success = StorageManager.set(StorageManager.KEYS.LOANS, updated);
        if (success) {
            StorageManager.logActivity("DELETE", `Deleted loan record ${id}`);
        }
        return success;
    }

    static checkAndUpdateOverdueLoans() {
        const loans = this.getLoans();
        const todayStr = new Date().toISOString().slice(0, 10);
        let updated = false;

        loans.forEach(loan => {
            if (loan.status === "Active" && loan.dueDate < todayStr) {
                loan.status = "Overdue";
                updated = true;
                StorageManager.logActivity("UPDATE", `System flagged loan ${loan.id} as OVERDUE`);
            }
        });

        if (updated) {
            StorageManager.set(StorageManager.KEYS.LOANS, loans);
        }
    }

    /**
     * Aggregates a loan's financial variables dynamically
     */
    static calculateLoanDetails(loan) {
        const transactions = StorageManager.get(StorageManager.KEYS.TRANSACTIONS) || [];
        const loanTxns = transactions.filter(t => t.loanId === loan.id);

        const totalReceived = loanTxns.reduce((sum, t) => sum + Number(t.amount), 0);
        const principalPaid = loanTxns.reduce((sum, t) => sum + Number(t.principalPortion), 0);
        const interestPaid = loanTxns.reduce((sum, t) => sum + Number(t.interestPortion), 0);

        const remainingPrincipal = Math.max(0, loan.principal - principalPaid);
        
        // Calculate dynamic accrued interest as of today
        const totalInterestAccrued = InterestCalculator.calculateAccrued(loan, transactions);
        const remainingInterest = Math.max(0, totalInterestAccrued - interestPaid);
        
        const totalOutstanding = remainingPrincipal + remainingInterest;
        
        // Loan Profitability ratio = (Interest Earned / Initial Principal) * 100
        const profitability = loan.principal > 0 ? Math.round((interestPaid / loan.principal) * 10000) / 100 : 0;

        return {
            id: loan.id,
            borrowerId: loan.borrowerId,
            principal: loan.principal,
            interestRate: loan.interestRate,
            interestType: loan.interestType,
            loanDate: loan.loanDate,
            dueDate: loan.dueDate,
            duration: loan.duration,
            status: loan.status,
            notes: loan.notes,
            totalReceived,
            principalPaid,
            interestPaid,
            remainingPrincipal,
            totalInterestAccrued,
            remainingInterest,
            totalOutstanding,
            profitability
        };
    }
}
