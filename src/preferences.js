import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

export const MensaPreferences = GObject.registerClass(
  class MensaPreferences extends Adw.PreferencesWindow {
    constructor(config) {
      super({
        modal: true,
        title: "Preferences",
        default_width: 400,
        default_height: 500,
      });

      this.config = config;
      this.http_session = new Soup.Session();

      // Display Page
      const displayPage = new Adw.PreferencesPage({
        title: "Display",
        icon_name: "computer-symbolic"
      });
      this.add(displayPage);
      this.createDisplayPage(displayPage);


      // Locations Page
      const locationsPage = new Adw.PreferencesPage({
        title: "Locations",
        icon_name: "mark-location-symbolic"
      });
      this.add(locationsPage);
      this.locationsPage = locationsPage;
      this.fetchLocations();

      // Allergens Page
      const allergensPage = new Adw.PreferencesPage({
        title: "Allergens",
        icon_name: "dialog-warning-symbolic"
      });
      this.add(allergensPage);
      this.allergensPage = allergensPage;
      this.fetchAllergens();
    }

    async fetchLocations() {
      const message = Soup.Message.new("GET", "https://speiseplan.mcloud.digital/v2/locations" + urlParams);

      try {
        const bytes = await this.http_session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        if (message.get_status() !== Soup.Status.OK) return;

        const decoder = new TextDecoder('utf-8');
        const json = JSON.parse(decoder.decode(bytes.toArray()));

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
        title: "Dietary Preferences",
        description: "Filter meals by dietary preference"
      });

      const dietaryOptions = [
        { value: "all", title: "All meals" },
        { value: "vegetarian", title: "Vegetarian only" },
        { value: "vegan", title: "Vegan only" }
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
        title: "Price Display",
        description: "Show prices for"
      });

      const priceOptions = [
        { value: "students", title: "Students" },
        { value: "employees", title: "Employees" },
        { value: "guests", title: "Guests" }
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
    }

    async fetchAllergens() {
      let urlParams = "";

      const langs = GLib.get_language_names();
      const primaryLang = langs.length > 0 ? langs[0] : 'C';

      if (!primaryLang.startsWith('de')) {
        urlParams += "&language=en";
      }

      const message = Soup.Message.new("GET", "https://speiseplan.mcloud.digital/v2/allergens?location=HL_ME" + urlParams);

      try {
        const bytes = await this.http_session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
        if (message.get_status() !== Soup.Status.OK) return;

        const decoder = new TextDecoder('utf-8');
        const json = JSON.parse(decoder.decode(bytes.toArray()));

        const group = new Adw.PreferencesGroup({
          title: "Allergen Warnings",
          description: "Select allergens to highlight"
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
