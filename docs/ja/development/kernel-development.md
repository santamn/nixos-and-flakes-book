# カーネル開発

> WIP このドキュメントはまだ完成していません

これは、licheepi4aの公式カーネル開発・デバッグ環境用の`flake.nix`の例です。

```nix
{
  description = "NixOS running on LicheePi 4A";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05-small";

    # カスタムカーネルのソース
    thead-kernel = {
      url = "github:revyos/thead-kernel/lpi4a";
      flake = false;
    };
  };

  outputs = inputs@{
    self
    ,nixpkgs
    ,thead-kernel
    ,... }:
  let
    pkgsKernel = import nixpkgs {
      localSystem = "x86_64-linux";
      crossSystem = {
        config = "riscv64-unknown-linux-gnu";
      };

      overlays = [
        (self: super: {
          # このカスタムカーネルをコンパイルするためにgcc 13を使用
          linuxPackages_thead = super.linuxPackagesFor (super.callPackage ./pkgs/kernel {
            src = thead-kernel;
            stdenv = super.gcc13Stdenv;
            kernelPatches = with super.kernelPatches; [
              bridge_stp_helper
              request_key_helper
            ];
          });
        })
      ];
    };
  in
  {
    nixosConfigurations.lp4a = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";

      specialArgs = {
        inherit nixpkgs pkgsKernel;
      };
      modules = [
        {
          # このflakeをクロスコンパイル
          nixpkgs.crossSystem = {
            system = "riscv64-linux";
          };
        }

        ./modules/licheepi4a.nix
        ./modules/sd-image-lp4a.nix
      ];
    };

    # `nix develop .#kernel` を使用して、カスタムカーネルビルド環境に入る
    # その後、`unpackPhase` を使用してカーネルソースコードを展開し、そのディレクトリに移動
    # `make menuconfig` を使用してカーネルを設定できる
    #
    # 問題
    #   - `make menuconfig` を使用すると - ncursesパッケージが見つからない
    devShells.x86_64-linux.kernel = pkgsKernel.linuxPackages_thead.kernel.dev;

    # `nix develop .#fhs` を使用して、ここで定義されたfhsテスト環境に入る
    devShells.x86_64-linux.fhs = let
      pkgs = import nixpkgs {
        system = "x86_64-linux";
      };
    in
      # ここのコードは主に以下からコピーされています：
      #   https://wiki.nixos.org/wiki/Linux_kernel#Embedded_Linux_Cross-compile_xconfig_and_menuconfig
      (pkgs.buildFHSUserEnv {
        name = "kernel-build-env";
        targetPkgs = pkgs_: (with pkgs_;
          [
            # `make menuconfig` を正常に実行するにはこれらのパッケージが必要
            pkgconfig
            ncurses

            pkgsKernel.gcc13Stdenv.cc
            gcc
          ]
          ++ pkgs.linux.nativeBuildInputs);
        runScript = pkgs.writeScript "init.sh" ''
          # クロスコンパイル用の環境変数を設定
          export CROSS_COMPILE=riscv64-unknown-linux-gnu-
          export ARCH=riscv
          export PKG_CONFIG_PATH="${pkgs.ncurses.dev}/lib/pkgconfig:"
          exec bash
        '';
      }).env;
  };
}
```

上記の`flake.nix`を使用すると、`nix develop .#kernel`を実行してカーネルのビルド環境に入り、`unpackPhase`を実行してカーネルソースコードを展開できます。

ただし、`make menuconfig`を実行してカーネルを設定することはできません。なぜなら、この環境には`ncurses`などのパッケージが不足しているためです。

そのため、次のステップとして、一度環境を終了し、`nix develop .#fhs`を実行して必要なパッケージが追加された別のFHS環境に入ります。その後、`make menuconfig`を実行してカーネルを設定し、その後のビルドとデバッグを行います。

## 参考文献

- [Linux kernel - NixOS Wiki](https://wiki.nixos.org/wiki/Linux_kernel)
- https://github.com/jordanisaacs/kernel-module-flake
