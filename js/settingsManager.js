class SettingsManager {
    constructor() {
        this.loadSettings();
    }

    loadSettings() {
        this.settings = StorageManager.get(StorageManager.KEYS.SETTINGS) || {
            businessName: "Apex Finance Solutions",
            lenderName: "Private Lender",
            defaultInterestRate: 2,
            currencySymbol: "₹",
            themePreference: "dark",
            backupPreferences: "weekly"
        };
        this.applyTheme(this.settings.themePreference);
    }

    getSettings() {
        return this.settings;
    }

    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        const success = StorageManager.set(StorageManager.KEYS.SETTINGS, this.settings);
        if (success) {
            StorageManager.logActivity("UPDATE", "Updated business settings");
            this.applyTheme(this.settings.themePreference);
        }
        return success;
    }

    applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
    }

    toggleTheme() {
        const newTheme = this.settings.themePreference === 'dark' ? 'light' : 'dark';
        this.saveSettings({ themePreference: newTheme });
        return newTheme;
    }
}
