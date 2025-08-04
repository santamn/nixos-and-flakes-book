# パッケージのダウングレードとアップグレード {#rollback-package-version}

Nix Flakesを使用していると、`nixos-unstable`ブランチのnixpkgsがよく使われますが、時々バグに遭遇することがあります。例えば、最近（2023/5/6）[chrome/vscodeがクラッシュする問題](https://github.com/swaywm/sway/issues/7562)に遭遇しました。

このような場合、以前のバージョンに戻す必要があります。Nix Flakesでは、すべてのパッケージのバージョンとハッシュ値は、そのinputデータソースのgit commitと一対一で対応しています。したがって、特定のパッケージを過去のバージョンにロールバックするには、そのinputデータソースのgit commitをロックする必要があります。

この要件を実現するために、まず`/etc/nixos/flake.nix`を修正します。以下に例を示します（主に`specialArgs`パラメータを利用します）：

```nix{8-13,19-20,27-44}
{
  description = "NixOS configuration of Ryan Yin"

  inputs = {
    # デフォルトでnixos-unstableブランチを使用
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";

    # 個別のパッケージをロールバックするための最新のstableブランチのnixpkgs
    # 現在の最新バージョンは25.05
    nixpkgs-stable.url = "github:nixos/nixpkgs/nixos-25.05";

    # git commitハッシュを使用してバージョンをロックすることもできます。これは最も確実なロック方法です
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

        # これがコアパラメータで、非デフォルトのnixpkgsデータソースを他のモジュールに渡します
        specialArgs = {
          # importするたびに新しいnixpkgsインスタンスが生成されることに注意してください
          # ここではflake.nixで直接インスタンスを作成し、他のサブモジュールに渡して使用します
          # これにより、nixpkgsインスタンスを効果的に再利用し、インスタンスの氾濫を避けることができます
          pkgs-stable = import nixpkgs-stable {
            # ここで外部のsystem属性を再帰的に参照します
            inherit system;
            # chromeなどのパッケージを取得するために、
            # ここで非フリーソフトウェアのインストールを許可する必要があります
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

そして、対応するモジュールでそのデータソースのパッケージを使用します。Home Managerのサブモジュールの例です：

````nix{4-7,13,25}
{
  pkgs,
  config,

  # nixはflake.nixのspecialArgsからこのパラメータを検索して注入します
  pkgs-stable,
  # pkgs-fd40cef8d,  # 固定ハッシュのnixpkgsデータソースも使用できます
  ...
}:

{
  # # ここではデフォルトのpkgsではなく、pkg-stableからパッケージを参照します
  home.packages = with pkgs-stable; [
    firefox-wayland

    # nixos-unstableブランチのChrome Waylandサポートには現在問題があるため、
    # ここではgoogle-chromeをstableブランチにロールバックして、一時的にバグを解決します。
    # 関連Issue: https://github.com/swaywm/sway/issues/7562
    google-chrome
  ];

  programs.vscode = {
    enable = true;
    # ここも同様に、pkgs-stableからパッケージを参照します
    package = pkgs-stable.vscode;
  };
}
```}
````

## オーバーレイでパッケージバージョンを固定

上記のアプローチはアプリケーションパッケージには完璧ですが、時にはそれらのパッケージで
使用されるライブラリを置き換える必要があります。ここで[Overlays](../nixpkgs/overlays.md)が
威力を発揮します！オーバーレイはパッケージの任意の属性を編集または置換できますが、
ここでは異なるnixpkgsバージョンにパッケージを固定するだけです。オーバーレイで依存関係を
編集する主な欠点は、Nixインストールがそれに依存するすべてのインストール済みパッケージを
再コンパイルすることですが、特定のバグ修正のために状況がそれを必要とする場合があります。

```nix
# overlays/mesa.nix
{ config, pkgs, lib, pkgs-fd40cef8d, ... }:
{
  nixpkgs.overlays = [
    # オーバーレイ: `self`と`super`を使用して
    # 継承関係を表現
    (self: super: {
      mesa = pkgs-fd40cef8d.mesa;
    })
  ];
}
```

## 新しい設定の適用

上記のように設定を調整することで、`sudo nixos-rebuild switch`を使用してデプロイできます。
これにより、Firefox/Chrome/VSCodeのバージョンが`nixpkgs-stable`または`nixpkgs-fd40cef8d`に
対応するものにダウングレードされます。

> [1000 instances of nixpkgs](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347)
> によると、サブモジュールやサブflakeで`import`を使用して`nixpkgs`をカスタマイズするのは
> 良い慣行ではありません。各`import`はnixpkgsの新しいインスタンスを作成し、設定が大きく
> なるにつれてビルド時間とメモリ使用量が増加します。この問題を回避するため、
> すべてのnixpkgsインスタンスを`flake.nix`で作成します。
