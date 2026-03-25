{
  stdenv,
  lib,
  meson,
  glib,
  gtk4,
  libsoup_3,
  gjs,
  desktop-file-utils,
  ninja,
  gobject-introspection,
  libadwaita,
  wrapGAppsHook4,
  glib-networking,
  fetchFromGitHub,
}:
stdenv.mkDerivation (
  finalAttrs:
  let
    mesonBuild = builtins.replaceStrings [ "\n" ] [ " " ] (
      builtins.readFile "${finalAttrs.src}/meson.build"
    );
    mesonData = builtins.match ".*project\\([[:space:]]*'([^']+)'[[:space:]]*,[[:space:]]*version:[[:space:]]*'([^']+)'.*" mesonBuild;
    name-from-meson = builtins.head mesonData;
    version-from-meson = (builtins.elemAt mesonData 1) + "-git";
    meta = builtins.fromJSON (builtins.readFile "${finalAttrs.src}/digital.fischers.mensash.json");
  in
  {
    pname = name-from-meson;
    version = version-from-meson;
    strictDeps = true;
    nativeBuildInputs = [
      meson
      glib
      desktop-file-utils
      ninja
      gobject-introspection
      wrapGAppsHook4
    ];
    buildInputs = [
      gtk4
      libadwaita
      libsoup_3
      glib-networking
    ];

    postPatch = ''
      substituteInPlace ./src/meson.build \
        --replace-fail "bin_conf.set('GJS', find_program('gjs').full_path())" \
        "bin_conf.set('GJS', '${lib.getExe gjs}')"
    '';

    postInstall = ''
      ln -s $out/share/${finalAttrs.pname}/${meta.id}.src.gresource \
            $out/share/${finalAttrs.pname}/${finalAttrs.pname}.src.gresource
      ln -s $out/share/${finalAttrs.pname}/${meta.id}.data.gresource \
            $out/share/${finalAttrs.pname}/${finalAttrs.pname}.data.gresource
      ln -s $out/bin/${meta.id} \
            $out/bin/${finalAttrs.pname}
    '';
    src = ./.;

    meta = {
      homepage = "https://github.com/importantus/mensa-sh-gnome";
      description = "GTK4/Libadwaita client for the menus of the canteens and cafeterias in Schleswig-Holstein";
      license = lib.licenses.gpl3Plus;
      platforms = lib.platforms.all;
      maintainers = with lib.maintainers; [ lomenzel ];
    };
  }
)
