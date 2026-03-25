<p align="center">
<img src="data/icons/hicolor/scalable/apps/digital.fischers.mensash.svg" alt="The logo of the mensa app" width=20% />

<h1 align="center">Mensa-SH</h1>
<p align="center">Desktop application for viewing mensa meal plans</p>

<p align="center">
<img alt="GitHub Actions Workflow Status" src="https://img.shields.io/github/actions/workflow/status/Importantus/mensa-sh-gnome/build.yaml">
<img alt="GitHub release (latest by date)" src="https://img.shields.io/github/v/release/Importantus/mensa-sh-gnome?include_prereleases">
<img alt="GitHub" src="https://img.shields.io/github/license/Importantus/mensa-sh-gnome">
</p>

A native GTK4/libadwaita desktop application for viewing mensa (cafeteria) meal plans in Schleswig-Holstein, Germany.

## Features

- **Multi-location support**: View meal plans for multiple mensae across Schleswig-Holstein
- **5-day forecast**: Browse meals for the upcoming business days
- **Dietary preferences**: Filter by all meals, vegetarian, or vegan options
- **Price categories**: Display prices for students, employees, or guests
- **Allergen warnings**: Highlight meals containing allergens you care about
- **Internationalization**: Full support for German and English

## Related Projects

This desktop app is part of a family of mensa applications:

- **[luebeck-mensa-widget](https://github.com/hoppjan/luebeck-mensa-widget)** – Android app
- **[speiseplan-tray](https://github.com/Importantus/speiseplan-tray)** – System tray application
- **[speiseplan-cli](https://github.com/Draculente/speiseplan-cli)** – Command-line interface

## Installation using Flatpak

> Requires Flatpak to be installed and only works on x86_64 Linux machines

The easiest way to install Mensa-SH is via Flatpak. For every tagged release, a pre-built `.flatpak` bundle is available on the [Releases page](https://github.com/Importantus/mensa-sh-gnome/releases).

1. Download the `mensa-sh.flatpak` file from the latest release.
2. Install it using your software center (like GNOME Software)

## Running and Building

### Using Nix

If you have the [Nix package manager](https://nixos.org/) installed with flakes enabled, you don't need to manually install any dependencies. 

You can run the app directly from the repository:
```bash
nix run github:Importantus/mensa-sh-gnome
```

Or, to build it locally:

```bash
git clone https://github.com/Importantus/mensa-sh-gnome
cd mensa-sh-gnome
nix build
```

> **Tip for Developers:** You can run `nix develop` in the cloned repository to instantly drop into a development shell with Meson, GTK4, libadwaita, and all other required build tools pre-configured!

This repository also exposes a [Nixpkgs overlay](https://nixos.wiki/wiki/Overlays). You can use it in your own Nix flake or NixOS configuration for setups requiring advanced features like cross-compilation.

### Manual Build

If you are not using Nix, you can build the project manually using Meson.

#### Dependencies

- GNOME 46+
- Meson 1.0.0+
- GTK4
- libadwaita
- gettext

#### Build Instructions

```bash
# Clone the repository
git clone https://github.com/Importantus/mensa-sh-gnome.git
cd mensa-sh

# Configure the build
meson setup builddir

# Build the application
meson compile -C builddir

# Install (optional)
meson install -C builddir
```

#### Development Build

For development, you can run the application directly from the build directory:

```bash
meson configure -Dprefix=/usr/local builddir
meson compile -C builddir
builddir/src/digital.fischers.mensash
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This project is licensed under the GNU General Public License v3.0 or later – see the [COPYING](COPYING) file for details.

## Acknowledgments

Built with:
- [GTK4](https://gtk.org/) – The toolkit for the GNOME desktop
- [libadwaita](https://gnome.pages.gitlab.gnome.org/libadwaita/) – Building blocks for modern GNOME applications
