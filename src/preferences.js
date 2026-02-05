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

        const page = new Adw.PreferencesPage({
            title: "Locations",
            icon_name: "map-marker-symbolic"
        });
        this.add(page);

        this.locationsPage = page;

        this.fetchLocations();
    }

    async fetchLocations() {
        const message = Soup.Message.new("GET", "https://speiseplan.mcloud.digital/v2/locations");

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
});
