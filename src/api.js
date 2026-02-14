import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

const BASE_URL = "https://speiseplan.mcloud.digital/v2";

export class API {
    constructor() {
        this.http_session = new Soup.Session();
    }

    /**
     * Get language parameter for API calls
     * @param {string} preference - "system" | "en" | "de"
     * @returns {string} URL parameter string (empty for system/German)
     */
    getLanguageParam(preference) {
        if (preference === "system") {
            const langs = GLib.get_language_names();
            const primaryLang = langs.length > 0 ? langs[0] : 'C';

            if (!primaryLang.startsWith('de')) {
                return "&language=en";
            }
            return "";
        }

        if (preference === "en") {
            return "&language=en";
        }

        return "";
    }

    /**
     * Fetch locations from API
     * @returns {Promise<Object>} API response with locations data
     */
    async fetchLocations() {
        const message = Soup.Message.new("GET", `${BASE_URL}/locations`);

        const bytes = await this.http_session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        if (message.get_status() !== Soup.Status.OK) {
            throw new Error(`HTTP ${message.get_status()}`);
        }

        const decoder = new TextDecoder('utf-8');
        return JSON.parse(decoder.decode(bytes.toArray()));
    }

    /**
     * Fetch allergens from API
     * @param {string} locationCode - Location code (e.g., "HL_ME")
     * @param {string} langPreference - Language preference
     * @returns {Promise<Object>} API response with allergens data
     */
    async fetchAllergens(locationCode, langPreference = "system") {
        const langParam = this.getLanguageParam(langPreference);
        const message = Soup.Message.new("GET", `${BASE_URL}/allergens?location=${locationCode}${langParam}`);

        const bytes = await this.http_session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        if (message.get_status() !== Soup.Status.OK) {
            throw new Error(`HTTP ${message.get_status()}`);
        }

        const decoder = new TextDecoder('utf-8');
        return JSON.parse(decoder.decode(bytes.toArray()));
    }

    /**
     * Fetch meals from API
     * @param {Array<string>} locationCodes - Array of location codes
     * @param {Array<Date>} dates - Array of dates
     * @param {string} langPreference - Language preference
     * @returns {Promise<Object>} API response with meals data
     */
    async fetchMeals(locationCodes, dates, langPreference = "system") {
        const locationString = locationCodes.join(',');

        let urlParams = `location=${locationString}&date=`;
        for (const day of dates) {
            urlParams += `${day.format("%Y-%m-%d")},`;
        }

        const langParam = this.getLanguageParam(langPreference);
        const message = Soup.Message.new("GET", `${BASE_URL}/meals?${urlParams}${langParam}`);

        const bytes = await this.http_session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            null
        );

        if (message.get_status() !== Soup.Status.OK) {
            throw new Error(`HTTP ${message.get_status()}`);
        }

        const decoder = new TextDecoder('utf-8');
        return JSON.parse(decoder.decode(bytes.toArray()));
    }
}
