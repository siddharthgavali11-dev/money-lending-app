class StorageManager {
    static KEYS = {
        BORROWERS: 'mla_borrowers',
        LOANS: 'mla_loans',
        TRANSACTIONS: 'mla_transactions',
        SETTINGS: 'mla_settings',
        ACTIVITY_LOG: 'mla_activity_log'
    };

    static get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`Error reading key ${key} from LocalStorage`, e);
            return null;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            // Trigger storage event manually for same-window updates
            window.dispatchEvent(new Event('storage_change'));
            return true;
        } catch (e) {
            console.error(`Error writing key ${key} to LocalStorage`, e);
            return false;
        }
    }

    static initialize() {
        // Check if settings exist, if not, perform first time seed
        if (!this.get(this.KEYS.SETTINGS)) {
            this.seedDemoData();
        }
    }

    static seedDemoData() {
        console.log("Seeding demo data...");
        
        const defaultSettings = {
            businessName: "Apex Finance Solutions",
            lenderName: "Siddharth Sharma",
            defaultInterestRate: 2, // 2% monthly
            currencySymbol: "₹",
            themePreference: "dark",
            backupPreferences: "weekly"
        };

        const demoBorrowers = [
            {
                id: "BRW-10001",
                name: "Rajesh Kumar",
                mobile: "9876543210",
                phoneAlt: "9876543211",
                address: "Flat 405, Green Glen Layout",
                city: "Bengaluru",
                state: "Karnataka",
                aadhaar: "123456789012",
                pan: "ABCDE1234F",
                occupation: "Software Engineer",
                guarantorName: "Sanjay Kumar",
                guarantorPhone: "9812345678",
                notes: "Good credit score, tech employee.",
                createdDate: "2026-01-05"
            },
            {
                id: "BRW-10002",
                name: "Priya Sharma",
                mobile: "9988776655",
                phoneAlt: "",
                address: "Sector 15, Huda Colony",
                city: "Gurugram",
                state: "Haryana",
                aadhaar: "987654321098",
                pan: "WXYZP5678G",
                occupation: "Boutique Owner",
                guarantorName: "Vikram Sharma",
                guarantorPhone: "9911223344",
                notes: "Self-employed, regular payments expected.",
                createdDate: "2026-02-15"
            },
            {
                id: "BRW-10003",
                name: "Amit Patel",
                mobile: "9123456789",
                phoneAlt: "9223456789",
                address: "32, Alkapuri Society",
                city: "Vadodara",
                state: "Gujarat",
                aadhaar: "456789012345",
                pan: "LMNOP9012H",
                occupation: "Contractor",
                guarantorName: "Jayesh Patel",
                guarantorPhone: "9009900990",
                notes: "Loan fully settled.",
                createdDate: "2025-06-10"
            },
            {
                id: "BRW-10004",
                name: "Sunita Verma",
                mobile: "9560123456",
                phoneAlt: "",
                address: "C-2, Pocket 4, Janakpuri",
                city: "New Delhi",
                state: "Delhi",
                aadhaar: "890123456789",
                pan: "QRSTU3456J",
                occupation: "Teacher",
                guarantorName: "Ramesh Verma",
                guarantorPhone: "9560987654",
                notes: "Frequent delays in payment. Needs follow-up.",
                createdDate: "2026-04-01"
            }
        ];

        const demoLoans = [
            {
                id: "LON-20001",
                borrowerId: "BRW-10001",
                principal: 50000,
                interestRate: 2, // 2% per month
                interestType: "monthly",
                loanDate: "2026-01-05",
                dueDate: "2026-07-05",
                duration: 6,
                status: "Active",
                notes: "Short-term personal loan.",
                createdDate: "2026-01-05"
            },
            {
                id: "LON-20002",
                borrowerId: "BRW-10002",
                principal: 100000,
                interestRate: 1.5, // 1.5% per month
                interestType: "monthly",
                loanDate: "2026-02-15",
                dueDate: "2026-08-15",
                duration: 6,
                status: "Active",
                notes: "Boutique inventory stock purchase.",
                createdDate: "2026-02-15"
            },
            {
                id: "LON-20003",
                borrowerId: "BRW-10003",
                principal: 30000,
                interestRate: 12, // 12% per year
                interestType: "annual",
                loanDate: "2025-06-10",
                dueDate: "2026-06-10",
                duration: 12,
                status: "Closed",
                notes: "Equipment purchase loan.",
                createdDate: "2025-06-10"
            },
            {
                id: "LON-20004",
                borrowerId: "BRW-10004",
                principal: 20000,
                interestRate: 2.5, // 2.5% per month
                interestType: "monthly",
                loanDate: "2026-04-01",
                dueDate: "2026-06-01",
                duration: 2,
                status: "Overdue",
                notes: "Medical emergency loan. Past due date.",
                createdDate: "2026-04-01"
            }
        ];

        const demoTransactions = [
            // Loan 1 (Rajesh Kumar) - 4 Interest Payments (2% of 50000 = 1000)
            {
                id: "TXN-30001",
                loanId: "LON-20001",
                borrowerId: "BRW-10001",
                date: "2026-02-05",
                amount: 1000,
                type: "Interest",
                interestPortion: 1000,
                principalPortion: 0,
                notes: "First month interest payment",
                receiptNumber: "REC-40001"
            },
            {
                id: "TXN-30002",
                loanId: "LON-20001",
                borrowerId: "BRW-10001",
                date: "2026-03-05",
                amount: 1000,
                type: "Interest",
                interestPortion: 1000,
                principalPortion: 0,
                notes: "Second month interest payment",
                receiptNumber: "REC-40002"
            },
            {
                id: "TXN-30003",
                loanId: "LON-20001",
                borrowerId: "BRW-10001",
                date: "2026-04-05",
                amount: 1000,
                type: "Interest",
                interestPortion: 1000,
                principalPortion: 0,
                notes: "Third month interest payment",
                receiptNumber: "REC-40003"
            },
            {
                id: "TXN-30004",
                loanId: "LON-20001",
                borrowerId: "BRW-10001",
                date: "2026-05-05",
                amount: 1000,
                type: "Interest",
                interestPortion: 1000,
                principalPortion: 0,
                notes: "Fourth month interest payment",
                receiptNumber: "REC-40004"
            },
            // Loan 2 (Priya Sharma) - 2 Interest Payments (1.5% of 100000 = 1500)
            {
                id: "TXN-30005",
                loanId: "LON-20002",
                borrowerId: "BRW-10002",
                date: "2026-03-15",
                amount: 1500,
                type: "Interest",
                interestPortion: 1500,
                principalPortion: 0,
                notes: "First month interest",
                receiptNumber: "REC-40005"
            },
            {
                id: "TXN-30006",
                loanId: "LON-20002",
                borrowerId: "BRW-10002",
                date: "2026-04-15",
                amount: 1500,
                type: "Interest",
                interestPortion: 1500,
                principalPortion: 0,
                notes: "Second month interest",
                receiptNumber: "REC-40006"
            },
            // Loan 3 (Amit Patel) - Closed with full settlement (Principal 30000 + Interest 12% of 30000 = 3600)
            {
                id: "TXN-30007",
                loanId: "LON-20003",
                borrowerId: "BRW-10003",
                date: "2026-06-05",
                amount: 33600,
                type: "Mixed",
                interestPortion: 3600,
                principalPortion: 30000,
                notes: "Full loan settlement closure.",
                receiptNumber: "REC-40007"
            },
            // Loan 4 (Sunita Verma) - 1 Interest Payment (2.5% of 20000 = 500)
            {
                id: "TXN-30008",
                loanId: "LON-20004",
                borrowerId: "BRW-10004",
                date: "2026-05-01",
                amount: 500,
                type: "Interest",
                interestPortion: 500,
                principalPortion: 0,
                notes: "Delayed April interest",
                receiptNumber: "REC-40008"
            }
        ];

        const demoActivityLogs = [
            { timestamp: new Date("2026-01-05T10:00:00").toISOString(), actionType: "CREATE", details: "Created borrower Rajesh Kumar (BRW-10001)" },
            { timestamp: new Date("2026-01-05T10:15:00").toISOString(), actionType: "CREATE", details: "Disbursed loan LON-20001 of ₹50,000 to Rajesh Kumar" },
            { timestamp: new Date("2026-02-05T11:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹1,000 for loan LON-20001 (Interest)" },
            { timestamp: new Date("2026-02-15T14:30:00").toISOString(), actionType: "CREATE", details: "Created borrower Priya Sharma (BRW-10002)" },
            { timestamp: new Date("2026-02-15T15:00:00").toISOString(), actionType: "CREATE", details: "Disbursed loan LON-20002 of ₹100,000 to Priya Sharma" },
            { timestamp: new Date("2026-03-05T11:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹1,000 for loan LON-20001 (Interest)" },
            { timestamp: new Date("2026-03-15T12:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹1,500 for loan LON-20002 (Interest)" },
            { timestamp: new Date("2026-04-01T09:00:00").toISOString(), actionType: "CREATE", details: "Created borrower Sunita Verma (BRW-10004)" },
            { timestamp: new Date("2026-04-01T09:30:00").toISOString(), actionType: "CREATE", details: "Disbursed loan LON-20004 of ₹20,000 to Sunita Verma" },
            { timestamp: new Date("2026-04-05T11:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹1,000 for loan LON-20001 (Interest)" },
            { timestamp: new Date("2026-04-15T12:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹1,500 for loan LON-20002 (Interest)" },
            { timestamp: new Date("2026-05-01T10:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹500 for loan LON-20004 (Interest)" },
            { timestamp: new Date("2026-05-05T11:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹1,000 for loan LON-20001 (Interest)" },
            { timestamp: new Date("2026-06-05T16:00:00").toISOString(), actionType: "PAYMENT", details: "Recorded collection of ₹33,600 for loan LON-20003 (Mixed)" },
            { timestamp: new Date("2026-06-05T16:05:00").toISOString(), actionType: "UPDATE", details: "Closed Loan LON-20003 for Amit Patel - Fully settled." }
        ];

        this.set(this.KEYS.SETTINGS, defaultSettings);
        this.set(this.KEYS.BORROWERS, demoBorrowers);
        this.set(this.KEYS.LOANS, demoLoans);
        this.set(this.KEYS.TRANSACTIONS, demoTransactions);
        this.set(this.KEYS.ACTIVITY_LOG, demoActivityLogs);
    }

    static logActivity(actionType, details) {
        const logs = this.get(this.KEYS.ACTIVITY_LOG) || [];
        logs.unshift({
            timestamp: new Date().toISOString(),
            actionType,
            details
        });
        // Limit logs to last 500 entries to prevent memory bloating
        if (logs.length > 500) logs.pop();
        this.set(this.KEYS.ACTIVITY_LOG, logs);
    }

    static clearAll() {
        localStorage.removeItem(this.KEYS.SETTINGS);
        localStorage.removeItem(this.KEYS.BORROWERS);
        localStorage.removeItem(this.KEYS.LOANS);
        localStorage.removeItem(this.KEYS.TRANSACTIONS);
        localStorage.removeItem(this.KEYS.ACTIVITY_LOG);
    }
}
