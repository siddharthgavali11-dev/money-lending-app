class Borrower {
    constructor(data) {
        this.id = data.id || null;
        this.name = data.name || "";
        this.mobile = data.mobile || "";
        this.phoneAlt = data.phoneAlt || "";
        this.address = data.address || "";
        this.city = data.city || "";
        this.state = data.state || "";
        this.aadhaar = data.aadhaar || "";
        this.pan = data.pan || "";
        this.occupation = data.occupation || "";
        this.guarantorName = data.guarantorName || "";
        this.guarantorPhone = data.guarantorPhone || "";
        this.notes = data.notes || "";
        this.createdDate = data.createdDate || new Date().toISOString().slice(0, 10);
    }
}

class BorrowerManager {
    static getBorrowers() {
        return StorageManager.get(StorageManager.KEYS.BORROWERS) || [];
    }

    static getBorrower(id) {
        const borrowers = this.getBorrowers();
        return borrowers.find(b => b.id === id) || null;
    }

    static generateId() {
        const borrowers = this.getBorrowers();
        if (borrowers.length === 0) return "BRW-10001";
        
        const ids = borrowers.map(b => {
            const num = parseInt(b.id.split('-')[1]);
            return isNaN(num) ? 10000 : num;
        });
        const maxId = Math.max(...ids);
        return `BRW-${maxId + 1}`;
    }

    static validateMobile(mobile, excludeId = null) {
        const borrowers = this.getBorrowers();
        const duplicate = borrowers.find(b => b.mobile === mobile && b.id !== excludeId);
        return !duplicate;
    }

    static addBorrower(borrowerData) {
        // Validate required fields
        if (!borrowerData.name || !borrowerData.mobile) {
            throw new Error("Full Name and Mobile Number are required.");
        }

        // Validate duplicates
        if (!this.validateMobile(borrowerData.mobile)) {
            throw new Error(`Mobile number ${borrowerData.mobile} is already registered to another borrower.`);
        }

        const borrowers = this.getBorrowers();
        borrowerData.id = this.generateId();
        const newBorrower = new Borrower(borrowerData);
        
        borrowers.push(newBorrower);
        const success = StorageManager.set(StorageManager.KEYS.BORROWERS, borrowers);
        if (success) {
            StorageManager.logActivity("CREATE", `Added borrower ${newBorrower.name} (${newBorrower.id})`);
        }
        return newBorrower;
    }

    static updateBorrower(id, borrowerData) {
        if (!borrowerData.name || !borrowerData.mobile) {
            throw new Error("Full Name and Mobile Number are required.");
        }

        if (!this.validateMobile(borrowerData.mobile, id)) {
            throw new Error(`Mobile number ${borrowerData.mobile} is already registered to another borrower.`);
        }

        const borrowers = this.getBorrowers();
        const index = borrowers.findIndex(b => b.id === id);
        
        if (index === -1) throw new Error("Borrower not found.");

        // Preserve original createdDate and ID
        borrowerData.id = id;
        borrowerData.createdDate = borrowers[index].createdDate;
        
        borrowers[index] = new Borrower(borrowerData);
        
        const success = StorageManager.set(StorageManager.KEYS.BORROWERS, borrowers);
        if (success) {
            StorageManager.logActivity("UPDATE", `Updated borrower details for ${borrowerData.name} (${id})`);
        }
        return success;
    }

    static deleteBorrower(id) {
        // Check if there are any loans associated with this borrower
        const loans = StorageManager.get(StorageManager.KEYS.LOANS) || [];
        const hasActiveLoans = loans.some(l => l.borrowerId === id && l.status !== "Closed");
        
        if (hasActiveLoans) {
            throw new Error("Cannot delete borrower. There are active or overdue loans associated with this borrower.");
        }

        const borrowers = this.getBorrowers();
        const borrower = borrowers.find(b => b.id === id);
        if (!borrower) throw new Error("Borrower not found.");

        // Cascade delete closed loans & transactions? In a professional system, we usually delete closed loans as well, or preserve them.
        // Let's delete the borrower and their closed loans & transactions for complete cleanliness, but warn/alert in activity log.
        const updatedBorrowers = borrowers.filter(b => b.id !== id);
        
        const updatedLoans = loans.filter(l => l.borrowerId !== id);
        
        const transactions = StorageManager.get(StorageManager.KEYS.TRANSACTIONS) || [];
        const updatedTransactions = transactions.filter(t => t.borrowerId !== id);

        StorageManager.set(StorageManager.KEYS.BORROWERS, updatedBorrowers);
        StorageManager.set(StorageManager.KEYS.LOANS, updatedLoans);
        StorageManager.set(StorageManager.KEYS.TRANSACTIONS, updatedTransactions);
        
        StorageManager.logActivity("DELETE", `Deleted borrower ${borrower.name} (${id}) and related closed accounts.`);
        return true;
    }

    static getLedger(borrowerId) {
        // Gathers all events for a borrower in chronological order
        const loans = StorageManager.get(StorageManager.KEYS.LOANS) || [];
        const transactions = StorageManager.get(StorageManager.KEYS.TRANSACTIONS) || [];
        
        const borrowerLoans = loans.filter(l => l.borrowerId === borrowerId);
        const borrowerTxns = transactions.filter(t => t.borrowerId === borrowerId);
        
        const ledger = [];

        // Add Loan Disbursement events
        borrowerLoans.forEach(loan => {
            ledger.push({
                date: loan.loanDate,
                type: "DISBURSEMENT",
                refId: loan.id,
                description: `Loan ${loan.id} Disbursed (Principal: ${loan.principal}, Rate: ${loan.interestRate}% ${loan.interestType})`,
                amount: loan.principal, // Debit (+ to outstanding balance)
                isDebit: true
            });

            // If loan is closed, add close marker
            if (loan.status === "Closed") {
                // Find closing transaction date
                const closingTx = borrowerTxns
                    .filter(t => t.loanId === loan.id)
                    .sort((a,b) => new Date(b.date) - new Date(a.date))[0];
                
                ledger.push({
                    date: closingTx ? closingTx.date : loan.dueDate,
                    type: "STATUS_CHANGE",
                    refId: loan.id,
                    description: `Loan ${loan.id} status changed to CLOSED`,
                    amount: 0,
                    isDebit: false,
                    isStatus: true
                });
            }
        });

        // Add Payments
        borrowerTxns.forEach(txn => {
            let desc = `Collection Receipt ${txn.receiptNumber} for Loan ${txn.loanId}`;
            if (txn.type === "Interest") {
                desc += ` (Interest Paid: ${txn.interestPortion})`;
            } else if (txn.type === "Principal") {
                desc += ` (Principal Paid: ${txn.principalPortion})`;
            } else {
                desc += ` (Principal Paid: ${txn.principalPortion}, Interest Paid: ${txn.interestPortion})`;
            }

            ledger.push({
                date: txn.date,
                type: "PAYMENT",
                refId: txn.id,
                description: desc,
                amount: txn.amount, // Credit (- from outstanding balance)
                isDebit: false,
                principalPortion: txn.principalPortion,
                interestPortion: txn.interestPortion
            });
        });

        // Sort chronologically
        ledger.sort((a, b) => new Date(a.date) - new Date(b.date));

        // Calculate running outstanding balance
        // Note: Running principal outstanding is simple to calculate:
        // disbursement increases it, principal payment decreases it.
        let runningPrincipal = 0;
        ledger.forEach(item => {
            if (item.type === "DISBURSEMENT") {
                runningPrincipal += item.amount;
            } else if (item.type === "PAYMENT") {
                runningPrincipal -= item.principalPortion || 0;
            }
            item.runningPrincipal = runningPrincipal;
        });

        return ledger;
    }
}
