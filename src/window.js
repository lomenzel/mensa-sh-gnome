/* window.js
 *
 * Copyright 2026 Sören
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Soup from "gi://Soup";
import Gdk from 'gi://Gdk';
import { Config } from './config.js';
import { MensaPreferences } from './preferences.js';
import { API } from './api.js';

Gio._promisify(
  Soup.Session.prototype,
  "send_and_read_async",
  "send_and_read_finish",
);

export const MensaShWindow = GObject.registerClass({
  GTypeName: 'MensaShWindow',
  Template: 'resource:///digital/fischers/mensash/window.ui',
  InternalChildren: ['meals_stack', 'refresh_btn', 'refresh_stack', 'refresh_spinner'],
}, class MensaShWindow extends Adw.ApplicationWindow {
  api = new API();
  config = new Config(() => this.fetchMeals());

  constructor(application) {
    super({ application });

    this._refresh_btn.connect('clicked', () => {
      this.fetchMeals().catch(console.error);
    });

    const preferencesAction = new Gio.SimpleAction({ name: 'preferences' });
    preferencesAction.connect('activate', () => {
      const prefs = new MensaPreferences(this.config);
      prefs.present();
    });

    application.add_action(preferencesAction);

    this.load_styling();
    this.init();
  }

  async init() {
    await this.fetchMeals().catch(console.error);
  }

  getNextBusinessDays(number) {
    const days = [];
    let current = GLib.DateTime.new_now_local();

    while (days.length < number) {
      const dayOfWeek = current.get_day_of_week();

      if (dayOfWeek !== 6 && dayOfWeek !== 7) {
        days.push(current);
      }
      current = current.add_days(1);
    }
    return days;
  }

  async fetchMeals() {
    this._refresh_btn.set_sensitive(false);
    this._refresh_stack.set_visible_child(this._refresh_spinner);
    this._refresh_spinner.start();

    const locationCodes = this.config.data.locations;

    if (!locationCodes || locationCodes.length === 0) {
      console.log("No location selected");
      this._refresh_spinner.stop();
      this._refresh_stack.set_visible_child(this._refresh_btn);
      this._refresh_btn.set_sensitive(true);
      return;
    }

    const days = this.getNextBusinessDays(5);
    const langPreference = this.config.getLanguagePreference();

    try {
      const json = await this.api.fetchMeals(locationCodes, days, langPreference);
      const allMeals = json.data;

      let child = this._meals_stack.get_first_child();
      while (child) {
        const next = child.get_next_sibling();
        this._meals_stack.remove(child);
        child = next;
      }

      for (const dayDate of days) {
        const isoDate = dayDate.format("%Y-%m-%d");

        const tabTitle = dayDate.format("%a");

        const daysMeals = allMeals.filter(m => m.date === isoDate);

        const page = this.createPageForMeals(daysMeals);

        this._meals_stack.add_titled(
            page,
            `day_${isoDate}`,
            tabTitle
        );
      }

    } catch (e) {
      console.error("Error loading meals", e);
    } finally {
      this._refresh_spinner.stop();
      this._refresh_stack.set_visible_child(this._refresh_btn);
      this._refresh_btn.set_sensitive(true);
    }
  }

  createPageForMeals(mealsList) {
    const page = new Adw.PreferencesPage();

    if (mealsList.length === 0) {
      const statusPage = new Adw.StatusPage({
        icon_name: 'face-uncertain-symbolic',
        title: 'No meals today',
        description: 'Guess you have to starve now.'
      });
      return statusPage;
    }

    const dietaryPreference = this.config.getDietaryPreference();
    let filteredMeals = mealsList;
    if (dietaryPreference === "vegetarian") {
      filteredMeals = mealsList.filter(m => m.vegetarian);
    } else if (dietaryPreference === "vegan") {
      filteredMeals = mealsList.filter(m => m.vegan);
    }

    if (filteredMeals.length === 0) {
      const statusPage = new Adw.StatusPage({
        icon_name: 'face-uncertain-symbolic',
        title: 'No meals match your dietary preference',
        description: 'Try adjusting your dietary preferences in settings.'
      });
      return statusPage;
    }

    const mealsByLocation = {};
    for (const meal of filteredMeals) {
      const locName = meal.location.name;
      if (!mealsByLocation[locName]) mealsByLocation[locName] = [];
      mealsByLocation[locName].push(meal);
    }

    for (const [locationName, meals] of Object.entries(mealsByLocation)) {
        const group = new Adw.PreferencesGroup({
          title: locationName,
          description: meals[0].location.city,
        });
        const mealGroup = new Gtk.Box({
          css_classes: ["meal", "card"],
          orientation: Gtk.Orientation.VERTICAL,
          margin_top: 6, margin_bottom: 6, spacing: 12
        });

        for (const meal of meals) {
          const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL });

          let icon = "🥩";
          if (meal.vegan) icon = "🌻";
          else if (meal.vegetarian) icon = "🌽";

          const name = new Gtk.Label({
            wrap: true, xalign: 0, halign: Gtk.Align.START,
            label: `${icon} ${meal.name}`,
            css_classes: ["meal-name"],
          });

          const priceCategory = this.config.getPriceCategory();
          const priceValue = meal.price[priceCategory];
          const priceLabel = priceValue ? priceValue.toFixed(2) + " €" : "-,-- €";
          const price = new Gtk.Label({
            wrap: true, xalign: 0,
            halign: Gtk.Align.START,
            valign: Gtk.Align.CENTER,
            label: priceLabel,
            css_classes: ["meal-price", "body", "dim-label"],
          });

          const priceBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 12,
            margin_top: 4
          })

          priceBox.append(price)

          box.append(name);
          box.append(priceBox);

          // Allergen badges
          if (meal.allergens && meal.allergens.length > 0) {
            const enabledAllergens = this.config.getEnabledAllergens();
            const matchingAllergens = meal.allergens.filter(a => enabledAllergens.includes(a.code));

            if (matchingAllergens.length > 0) {
              const allergensBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 6,
                valign: Gtk.Align.CENTER
              });

              for (const allergen of matchingAllergens) {
                const badge = new Gtk.Label({
                  label: allergen.name,
                  css_classes: ["allergen-badge"]
                });
                allergensBox.append(badge);
              }

              priceBox.append(allergensBox);
            }
          }

          mealGroup.append(box);
        }
        group.add(mealGroup);
        page.add(group);
    }
    return page;
  }

  load_styling() {
    const provider = new Gtk.CssProvider();
    provider.load_from_resource('/digital/fischers/mensash/js/style.css');

    Gtk.StyleContext.add_provider_for_display(
      Gdk.Display.get_default(),
      provider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    );
  }
});
