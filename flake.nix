{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs =
    { nixpkgs, self }:
    {
      overlay = final: prev: {
        mensa-sh = final.callPackage ./default.nix { };
      };
      packages = nixpkgs.lib.genAttrs nixpkgs.lib.systems.flakeExposed (system: {
        default =
          (import nixpkgs {
            inherit system;
            overlays = [ self.overlay ];
          }).mensa-sh;
      });
    };
}
