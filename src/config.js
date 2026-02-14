import GLib from 'gi://GLib';

export class Config {
    constructor(onSettingsChanged) {
        this.onSettingsChanged = onSettingsChanged;

        this.configDir = GLib.get_user_config_dir() + "/mensa-app";
        this.configPath = this.configDir + "/config.json";
        this.data = {
            locations: ["HL_ME", "HL_CA"],
            dietaryPreference: "all",
            priceCategory: "students",
            enabledAllergens: []
        };
        this.load();
    }

    load() {
        try {
            if (GLib.file_test(this.configPath, GLib.FileTest.EXISTS)) {
                const [success, content] = GLib.file_get_contents(this.configPath);
                if (success) {
                    const decoder = new TextDecoder('utf-8');
                    this.data = JSON.parse(decoder.decode(content));
                }
            }
        } catch (e) {
            console.error("Couldn't load config:", e);
        }
    }

    save() {
        try {
            // Ordner erstellen, falls nicht existent
            GLib.mkdir_with_parents(this.configDir, 0o755);
            const content = JSON.stringify(this.data, null, 2);
            GLib.file_set_contents(this.configPath, content);
            this.onSettingsChanged();
        } catch (e) {
            console.error("Couldn't save config:", e);
        }
    }

    isLocationEnabled(code) {
        return this.data.locations.includes(code);
    }

    toggleLocation(code, enabled) {
        const index = this.data.locations.indexOf(code);
        if (enabled && index === -1) {
            this.data.locations.push(code);
        } else if (!enabled && index !== -1) {
            this.data.locations.splice(index, 1);
        }
        this.save();
    }

    getSelectedLocationsString() {
        return this.data.locations.join(',');
    }

    getDietaryPreference() {
        return this.data.dietaryPreference || "all";
    }

    setDietaryPreference(preference) {
        this.data.dietaryPreference = preference;
        this.save();
    }

    getPriceCategory() {
        return this.data.priceCategory || "students";
    }

    setPriceCategory(category) {
        this.data.priceCategory = category;
        this.save();
    }

    getEnabledAllergens() {
        return this.data.enabledAllergens || [];
    }

    isAllergenEnabled(code) {
        return (this.data.enabledAllergens || []).includes(code);
    }

    toggleAllergen(code, enabled) {
        if (!this.data.enabledAllergens) {
            this.data.enabledAllergens = [];
        }
        const index = this.data.enabledAllergens.indexOf(code);
        if (enabled && index === -1) {
            this.data.enabledAllergens.push(code);
        } else if (!enabled && index !== -1) {
            this.data.enabledAllergens.splice(index, 1);
        }
        this.save();
    }
}
