# パッケージのアップ・ダウングレード

Flakes を使っていると、バグや互換性の問題を解決するために特定のパッケージをダウングレードまたはアップグレードしなければならないときがあります。Flakes ではパッケージのバージョンとハッシュ値はその flake input の Git コミットと直接紐づいています。したがって、パッケージのバージョンを変更するには flake input の Git コミットを別のものに差し替え、ロックし直す必要があります。

以下では、それぞれに異なる Git コミットまたはブランチを参照する複数の Nixpkgs inputs を追加する例を示します。

```nix{8-13,19-20,27-43}
{
  description = "NixOS configuration of Ryan Yin"

  inputs = {
    # デフォルトでは nixos-unstable ブランチを使用
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    # バージョンロールバック用の Nixpkgs の最新の stable ブランチ
    # 現在の最新バージョンは25.05
    nixpkgs-stable.url = "github:nixos/nixpkgs/nixos-25.05";

    # Git コミットハッシュを指定することでバージョンをロックすることもできます
    nixpkgs-fd40cef8d.url = "github:nixos/nixpkgs/fd40cef8d797670e203a27a91e4b8e6decf0b90c";
  };

  outputs = inputs@{
    self,
    nixpkgs,
    nixpkgs-stable,
    nixpkgs-fd40cef8d,
    ...
  }: {
    nixosConfigurations = {
      my-nixos = nixpkgs.lib.nixosSystem rec {
        system = "x86_64-linux";

        # `specialArgs` パラメータを使ってデフォルト以外の Nixpkgs インスタンスを
        # 他の Nix モジュールに渡します
        specialArgs = {
          # nixpkgs-stable のパッケージを使うために、いくつかのパラメータを設定します
          pkgs-stable = import nixpkgs-stable {
            # 外側のスコープから `system` パラメータを再帰的に参照します
            inherit system;
            # Chrome を使うために非フリーソフトウェアの
            # インストールを許可する必要があります
            config.allowUnfree = true;
          };

          pkgs-fd40cef8d = import nixpkgs-fd40cef8d {
            inherit system;
            config.allowUnfree = true;
          };
        };

        modules = [
          ./hosts/my-nixos

          # 他のモジュール設定を省略...
        ];
      };
    };
  };
}
```

上記の例では、複数の Nixpkgs inputs (`nixpkgs`, `nixpkgs-stable`, `nixpkgs-fd40cef8d`) を定義しており、各 input は異なる Git コミットまたはブランチに対応しています。

```nix{4-6,12,24}
{
  pkgs,
  config,
  # Nix が flake.nix の `specialArgs` からこのパラメータを見つけ、値を注入します
  pkgs-stable,
  # pkgs-fd40cef8d,
  ...
}:

{
  # ここではデフォルトの pkgs ではなく、pkg-stable からパッケージを参照します
  home.packages = with pkgs-stable; [
    firefox-wayland

    # nixos-unstable ブランチの Chrome Wayland サポートには現在問題があるため、
    # ここでは stable ブランチにロールバックしています
    # 関連Issue: https://github.com/swaywm/sway/issues/7562
    google-chrome
  ];

  programs.vscode = {
    enable = true;
    # ここも同様に `pkgs` ではなく `pkgs-stable` からパッケージを参照しています
    package = pkgs-stable.vscode;
  };
}
```

## Overlay でパッケージバージョンを固定

上記の方法はアプリケーションパッケージには最適ですが、時にはそれらのパッケージで使われるライブラリを置き換えなければいけないことがあります。そこで役立つのが [Overlays](../nixpkgs/overlays.md) です。Overlay を使うことでパッケージの任意の attribute を置換・編集することができますが、ここでは単に特定のパッケージをデフォルトとは異なるバージョンの Nixpkgs に紐づけるために使っています。

Overlay で依存関係を編集する際の主なデメリットは、Nix によってパッケージがインストールされる際に、それに依存するすべてのインストール済みパッケージが再コンパイルされてしまうことです。しかし、状況によっては特定のバグを修正するためにそれが必要な場合もあります。

```nix
# overlays/mesa.nix
{ config, pkgs, lib, pkgs-fd40cef8d, ... }:
{
  nixpkgs.overlays = [
    # Overlay: `self` と `super` を使って継承関係を表現
    (self: super: {
      mesa = pkgs-fd40cef8d.mesa;
    })
  ];
}
```

## 新しい設定の適用

上のように設定を調整した後、`sudo nixos-rebuild switch` で変更した設定を適用できます。これにより、Firefox, Chrome, VSCode のバージョンは `nixpkgs-stable` または `nixpkgs-fd40cef8d` に対応するものへ切り替わります。

> [1000 instances of nixpkgs](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347) によると、サブモジュールやサブフレークで `import` を使用して `nixpkgs` をカスタマイズするのは好ましくありません。なぜなら、`import` を呼ぶたびに新しい `nixpkgs` のインスタンスが生成され、構成が大きくなるほどビルド時間とメモリ使用量が増えてしまうからです。この問題を避けるため、すべての `nixpkgs` インスタンスを `flake.nix` 内で作成しています。
