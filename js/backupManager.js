class BackupManager {
    static exportData() {
        try {
            const backup = {
                version: "1.0",
                timestamp: new Date().toISOString(),
                data: {
                    settings: StorageManager.get(StorageManager.KEYS.SETTINGS),
                    borrowers: StorageManager.get(StorageManager.KEYS.BORROWERS) || [],
                    loans: StorageManager.get(StorageManager.KEYS.LOANS) || [],
                    transactions: StorageManager.get(StorageManager.KEYS.TRANSACTIONS) || [],
                    activityLog: StorageManager.get(StorageManager.KEYS.ACTIVITY_LOG) || []
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 4));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            
            const dateStr = new Date().toISOString().slice(0,10);
            downloadAnchorNode.setAttribute("download", `MoneyLendingBackup_${dateStr}.json`);
            
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            
            StorageManager.logActivity("BACKUP", "Data backup exported successfully");
            return true;
        } catch (e) {
            console.error("Backup export failed", e);
            return false;
        }
    }

    static importData(file, callback) {
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const imported = JSON.parse(event.target.result);
                
                // Validate schema structure
                if (!imported.data || !imported.data.settings || !Array.isArray(imported.data.borrowers) || 
                    !Array.isArray(imported.data.loans) || !Array.isArray(imported.data.transactions)) {
                    throw new Error("Invalid backup file format. Missing core data structure.");
                }

                // Restore to storage
                StorageManager.set(StorageManager.KEYS.SETTINGS, imported.data.settings);
                StorageManager.set(StorageManager.KEYS.BORROWERS, imported.data.borrowers);
                StorageManager.set(StorageManager.KEYS.LOANS, imported.data.loans);
                StorageManager.set(StorageManager.KEYS.TRANSACTIONS, imported.data.transactions);
                
                // Log and restore activity log
                const newLogs = imported.data.activityLog || [];
                newLogs.unshift({
                    timestamp: new Date().toISOString(),
                    actionType: "RESTORE",
                    details: `Data restored from backup dated: ${imported.timestamp}`
                });
                StorageManager.set(StorageManager.KEYS.ACTIVITY_LOG, newLogs);
                
                callback(true, "Data restored successfully!");
            } catch (e) {
                console.error("Backup import failed", e);
                callback(false, e.message || "Failed to parse backup file.");
            }
        };
        reader.readAsText(file);
    }
}
