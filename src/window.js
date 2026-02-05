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

Gio._promisify(
  Soup.Session.prototype,
  "send_and_read_async",
  "send_and_read_finish",
);

export const MensaShWindow = GObject.registerClass({
  GTypeName: 'MensaShWindow',
  Template: 'resource:///digital/fischers/mensash/window.ui',
  InternalChildren: ['meals', 'refresh_btn', 'meals_revealer', 'refresh_stack', 'refresh_spinner'],
}, class MensaShWindow extends Adw.ApplicationWindow {
  http_session = new Soup.Session();
  config = new Config(() => this.fetchMeals());

  constructor(application) {
    super({ application });

    this._refresh_btn.connect('clicked', () => {
      this.fetchMeals().catch(console.error);
    });

    const preferencesAction = new Gio.SimpleAction({ name: 'preferences' });
    preferencesAction.connect('activate', () => {
      const prefs = new MensaPreferences(this.config);
      prefs.present(this);
    });

    application.add_action(preferencesAction);

    this.load_styling();

    this.init()
  }

  async init() {
    this._meals_revealer.set_reveal_child(false);
    await this.fetchMeals().catch(console.error);
    this._meals_revealer.set_reveal_child(true);
  }

  async fetchMeals() {
    this._refresh_btn.set_sensitive(false);
    this._refresh_stack.set_visible_child(this._refresh_spinner);
    this._refresh_spinner.start();

    const date = GLib.DateTime.new_now_local();
    const locationString = this.config.getSelectedLocationsString();

    if (!locationString) {
      console.log("No location selected");
      this._refresh_btn.set_sensitive(true);
      return;
    }

    const url = `https://speiseplan.mcloud.digital/v2/meals?location=${locationString}&date=${date.format("%Y-%m-%d")}`;
    const message = Soup.Message.new("GET", url);

    try {
      const bytes = await this.http_session.send_and_read_async(
        message,
        GLib.PRIORITY_DEFAULT,
        null,
      );

      if (message.get_status() !== Soup.Status.OK) {
        console.error(`HTTP Status ${message.get_status()}`);
        return;
      }

      const text_decoder = new TextDecoder("utf-8");
      const json = JSON.parse(text_decoder.decode(bytes.toArray()));

      const mealsByLocation = {};
      for (const meal of json.data) {
        const locName = meal.location.name;
        if (!mealsByLocation[locName]) mealsByLocation[locName] = [];
        mealsByLocation[locName].push(meal);
      }

      let child = this._meals.get_first_child();
      while (child) {
        this._meals.remove(child);
        child = this._meals.get_first_child();
      }

      const scrollablePage = new Adw.PreferencesPage();
      this._meals.append(scrollablePage);

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
          const name = new Gtk.Label({
            wrap: true, xalign: 0, halign: Gtk.Align.START,
            label: (meal.vegan ? "🌻" : meal.vegetarian ? "🌽" : "🥩") + " " + meal.name,
            css_classes: ["meal-name"],
          });
          const price = new Gtk.Label({
            wrap: true, xalign: 0, halign: Gtk.Align.START,
            label: (meal.price.students).toFixed(2) + " €",
            css_classes: ["meal-price", "body", "dim-label"],
          });
          box.append(name);
          box.append(price);
          mealGroup.append(box);
        }
        group.add(mealGroup);
        scrollablePage.add(group);
      }

    } catch (e) {
      console.error("Error loading meals", e);
    } finally {
      this._refresh_spinner.stop();
      this._refresh_stack.set_visible_child(this._refresh_btn);
      this._refresh_btn.set_sensitive(true);
    }
  }

  load_styling() {
    const provider = new Gtk.CssProvider();
    // prefix like in gresource.xml
    provider.load_from_resource('/digital/fischers/mensash/js/style.css');

    Gtk.StyleContext.add_provider_for_display(
      Gdk.Display.get_default(),
      provider,
      Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
    );
  }
});
