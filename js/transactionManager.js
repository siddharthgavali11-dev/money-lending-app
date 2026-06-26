class Transaction {
    constructor(data) {
        this.id = data.id || null;
        this.loanId = data.loanId || "";
        this.borrowerId = data.borrowerId || "";
        this.date = data.date || new Date().toISOString().slice(0, 10);
        this.amount = Number(data.amount) || 0;
        this.type = data.type || "Interest"; // Interest, Principal, Mixed
        this.interestPortion = Number(data.interestPortion) || 0;
        this.principalPortion = Number(data.principalPortion) || 0;
        this.notes = data.notes || "";
        this.receiptNumber = data.receiptNumber || "";
    }
}

class TransactionManager {
    static getTransactions() {
        return StorageManager.get(StorageManager.KEYS.TRANSACTIONS) || [];
    }

    static getTransaction(id) {
        const txns = this.getTransactions();
        return txns.find(t => t.id === id) || null;
    }

    static generateReceiptId() {
        const txns = this.getTransactions();
        if (txns.length === 0) return "REC-40001";
        
        const ids = txns.map(t => {
            const num = parseInt(t.receiptNumber.split('-')[1]);
            return isNaN(num) ? 40000 : num;
        });
        const maxId = Math.max(...ids);
        return `REC-${maxId + 1}`;
    }

    static generateTxnId() {
        const txns = this.getTransactions();
        if (txns.length === 0) return "TXN-30001";
        
        const ids = txns.map(t => {
            const num = parseInt(t.id.split('-')[1]);
            return isNaN(num) ? 30000 : num;
        });
        const maxId = Math.max(...ids);
        return `TXN-${maxId + 1}`;
    }

    static addTransaction(txnData) {
        if (!txnData.loanId || !txnData.amount || !txnData.date) {
            throw new Error("Missing required transaction details.");
        }

        const amount = Number(txnData.amount);
        if (amount <= 0) {
            throw new Error("Payment amount must be greater than zero.");
        }

        const loan = LoanManager.getLoan(txnData.loanId);
        if (!loan) throw new Error("Loan not found.");
        if (loan.status === "Closed") {
            throw new Error("This loan is already closed. No further payments can be collected.");
        }

        // Get details up to now
        const loanDetails = LoanManager.calculateLoanDetails(loan);

        let interestPortion = 0;
        let principalPortion = 0;

        if (txnData.type === "Interest") {
            interestPortion = amount;
            // Warn if interest paid exceeds outstanding? 
            // In private lending, they can overpay interest or pay in advance.
        } else if (txnData.type === "Principal") {
            principalPortion = amount;
            if (principalPortion > loanDetails.remainingPrincipal) {
                throw new Error(`Principal payment of ₹${principalPortion} exceeds remaining principal of ₹${loanDetails.remainingPrincipal}.`);
            }
        } else if (txnData.type === "Mixed") {
            // Mixed payment logic: pays off outstanding interest first, then principal
            const interestDue = loanDetails.remainingInterest;
            if (amount <= interestDue) {
                interestPortion = amount;
                principalPortion = 0;
            } else {
                interestPortion = interestDue;
                principalPortion = amount - interestDue;

                if (principalPortion > loanDetails.remainingPrincipal) {
                    throw new Error(`Mixed payment principal component of ₹${principalPortion.toFixed(2)} exceeds outstanding principal of ₹${loanDetails.remainingPrincipal.toFixed(2)}.`);
                }
            }
        }

        const txns = this.getTransactions();
        txnData.id = this.generateTxnId();
        txnData.receiptNumber = this.generateReceiptId();
        txnData.borrowerId = loan.borrowerId;
        txnData.interestPortion = Math.round(interestPortion * 100) / 100;
        txnData.principalPortion = Math.round(principalPortion * 100) / 100;

        const newTxn = new Transaction(txnData);
        txns.push(newTxn);
        
        const success = StorageManager.set(StorageManager.KEYS.TRANSACTIONS, txns);
        if (success) {
            StorageManager.logActivity("PAYMENT", `Recorded payment of ₹${newTxn.amount} (Type: ${newTxn.type}) for Loan ${newTxn.loanId}. Receipt: ${newTxn.receiptNumber}`);
            
            // Check if loan is now fully settled
            const updatedDetails = LoanManager.calculateLoanDetails(loan);
            if (updatedDetails.totalOutstanding <= 0.05) { // Tolerance of 5 paise due to float rounding
                LoanManager.changeStatus(loan.id, "Closed");
                StorageManager.logActivity("UPDATE", `Loan ${loan.id} fully settled and closed.`);
            }
        }

        return newTxn;
    }

    static deleteTransaction(id) {
        const txns = this.getTransactions();
        const txn = txns.find(t => t.id === id);
        if (!txn) throw new Error("Transaction not found.");

        const loan = LoanManager.getLoan(txn.loanId);
        
        const updatedTxns = txns.filter(t => t.id !== id);
        const success = StorageManager.set(StorageManager.KEYS.TRANSACTIONS, updatedTxns);
        
        if (success) {
            StorageManager.logActivity("DELETE", `Deleted payment receipt ${txn.receiptNumber} of ₹${txn.amount}`);
            
            // Recalculate loan status
            if (loan) {
                const todayStr = new Date().toISOString().slice(0, 10);
                const updatedDetails = LoanManager.calculateLoanDetails(loan);
                if (updatedDetails.totalOutstanding > 0.05) {
                    const status = loan.dueDate < todayStr ? "Overdue" : "Active";
                    LoanManager.changeStatus(loan.id, status);
                }
            }
        }
        return success;
    }
}
