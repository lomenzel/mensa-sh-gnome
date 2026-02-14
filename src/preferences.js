import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import { API } from './api.js';

export const MensaPreferences = GObject.registerClass(
  class MensaPreferences extends Adw.PreferencesWindow {
    constructor(config) {
      super({
        modal: true,
        title: _("Preferences"),
        default_width: 400,
        default_height: 500,
      });

      this.config = config;
      this.api = new API();

      // Locations Page
      const locationsPage = new Adw.PreferencesPage({
        title: _("Locations"),
        icon_name: "mark-location-symbolic"
      });
      this.add(locationsPage);
      this.locationsPage = locationsPage;
      this.fetchLocations();

      // Display Page
      const displayPage = new Adw.PreferencesPage({
        title: _("Display"),
        icon_name: "computer-symbolic"
      });
      this.add(displayPage);
      this.createDisplayPage(displayPage);

      // Allergens Page
      const allergensPage = new Adw.PreferencesPage({
        title: _("Allergens"),
        icon_name: "dialog-warning-symbolic"
      });
      this.add(allergensPage);
      this.allergensPage = allergensPage;
      this.fetchAllergens();
    }

    async fetchLocations() {
      try {
        const json = await this.api.fetchLocations();

        const cities = {};
        for (const loc of json.data) {
          if (!cities[loc.city]) cities[loc.city] = [];
          cities[loc.city].push(loc);
        }

        for (const [city, locs] of Object.entries(cities)) {
          const group = new Adw.PreferencesGroup({ title: city });

          for (const loc of locs) {
            const row = new Adw.SwitchRow({
              title: loc.name,
              subtitle: loc.code,
              active: this.config.isLocationEnabled(loc.code)
            });

            row.connect('notify::active', () => {
              this.config.toggleLocation(loc.code, row.active);
            });

            group.add(row);
          }
          this.locationsPage.add(group);
        }

      } catch (e) {
        console.error("Error loading the locations:", e);
      }
    }

    createDisplayPage(page) {
      const dietaryGroup = new Adw.PreferencesGroup({
        title: _("Dietary Preferences"),
        description: _("Filter meals by dietary preference")
      });

      const dietaryOptions = [
        { value: "all", title: _("All meals") },
        { value: "vegetarian", title: _("Vegetarian only") },
        { value: "vegan", title: _("Vegan only") }
      ];

      const currentDietary = this.config.getDietaryPreference();
      let firstDietaryRadio = null;

      dietaryOptions.forEach((option, index) => {
        const row = new Adw.ActionRow({
          title: option.title,
          activatable: true
        });

        const radio = new Gtk.CheckButton({
          group: index === 0 ? null : firstDietaryRadio,
          active: option.value === currentDietary
        });

        if (index === 0) {
          firstDietaryRadio = radio;
        }

        radio.connect('toggled', () => {
          if (radio.get_active()) {
            this.config.setDietaryPreference(option.value);
          }
        });

        row.add_prefix(radio);
        row.connect('activated', () => radio.set_active(true));
        dietaryGroup.add(row);
      });

      page.add(dietaryGroup);

      // Price Display Group
      const priceGroup = new Adw.PreferencesGroup({
        title: _("Price Display"),
        description: _("Show prices for")
      });

      const priceOptions = [
        { value: "students", title: _("Students") },
        { value: "employees", title: _("Employees") },
        { value: "guests", title: _("Guests") }
      ];

      const currentPrice = this.config.getPriceCategory();
      let firstPriceRadio = null;

      priceOptions.forEach((option, index) => {
        const row = new Adw.ActionRow({
          title: option.title,
          activatable: true
        });

        const radio = new Gtk.CheckButton({
          group: index === 0 ? null : firstPriceRadio,
          active: option.value === currentPrice
        });

        if (index === 0) {
          firstPriceRadio = radio;
        }

        radio.connect('toggled', () => {
          if (radio.get_active()) {
            this.config.setPriceCategory(option.value);
          }
        });

        row.add_prefix(radio);
        row.connect('activated', () => radio.set_active(true));
        priceGroup.add(row);
      });

      page.add(priceGroup);

      // Language Group
      const langGroup = new Adw.PreferencesGroup({
        title: _("Language"),
        description: _("App language")
      });

      const currentLang = this.config.getLanguagePreference();
      const followSystemRow = new Adw.SwitchRow({
        title: _("Follow system"),
        active: currentLang === "system"
      });

      const langComboRow = new Adw.ComboRow({
        title: _("Language"),
        model: new Gtk.StringList({
          strings: [_("English"), _("German")]
        }),
        sensitive: currentLang !== "system",
        selected: currentLang === "de" ? 1 : 0
      });

      // Helper to show toast and restart
      const showRestartToast = () => {
        const toast = new Adw.Toast({
          title: _("Restart app to apply language changes"),
          timeout: 5
        });
        this.add_toast(toast);
      };

      // Handle follow system switch
      followSystemRow.connect('notify::active', () => {
        const followSystem = followSystemRow.get_active();
        const newLang = followSystem ? "system" : (langComboRow.get_selected() === 1 ? "de" : "en");

        // Only show toast if language actually changed
        if (newLang !== currentLang) {
          this.config.setLanguagePreference(newLang);
          langComboRow.set_sensitive(!followSystem);
          showRestartToast();
        }
      });

      // Handle language combo change
      langComboRow.connect('notify::selected', () => {
        if (!followSystemRow.get_active()) {
          const newLang = langComboRow.get_selected() === 1 ? "de" : "en";

          // Only show toast if language actually changed
          if (newLang !== currentLang) {
            this.config.setLanguagePreference(newLang);
            showRestartToast();
          }
        }
      });

      langGroup.add(followSystemRow);
      langGroup.add(langComboRow);
      page.add(langGroup);
    }

    async fetchAllergens() {
      try {
        const langPreference = this.config.getLanguagePreference();
        const json = await this.api.fetchAllergens("HL_ME", langPreference);

        const group = new Adw.PreferencesGroup({
          title: _("Allergen Warnings"),
          description: _("Select allergens to highlight")
        });

        const enabledAllergens = this.config.getEnabledAllergens();

        for (const allergen of json.data) {
          const row = new Adw.SwitchRow({
            title: allergen.name,
            active: enabledAllergens.includes(allergen.code)
          });

          row.connect('notify::active', () => {
            this.config.toggleAllergen(allergen.code, row.active);
          });

          group.add(row);
        }

        this.allergensPage.add(group);

      } catch (e) {
        console.error("Error loading allergens:", e);
      }
    }
  });
