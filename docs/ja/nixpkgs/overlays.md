# Overlays

前章で紹介した`pkgs.xxx.override { ... }`や`pkgs.xxx.overrideAttrs (finalAttrs: previousAttrs: { ... });`は、pkgsインスタンス内の既存Derivationを直接変更するのではなく、新しいDerivationを返します。そのため、これらはローカルな用途に向いています。しかし、もし上書きしたDerivationが他のNixパッケージからも依存されている場合、他のパッケージは元のDerivationを使い続けてしまいます。

この問題を解決するため、Nixはoverlaysという仕組みを提供しています。簡単に言えば、Overlaysはpkgs内のDerivationをグローバルに上書きできます。

従来のNix環境では、Nixはデフォルトで`~/.config/nixpkgs/overlays.nix`や`~/.config/nixpkgs/overlays/*.nix`配下の全overlays設定を自動で読み込みます。

しかしFlakesを使う場合、システムの再現性を保つため、Flakeは外部Gitリポジトリ以外の設定に依存できません。そのため、従来の設定方法は使えなくなります。

`flake.nix`でNixOSを設定する場合、Home ManagerやNixOSは`nixpkgs.overlays`オプションでoverlaysを導入できます。関連ドキュメント：

- [home-manager docs - `nixpkgs.overlays`](https://nix-community.github.io/home-manager/options.xhtml#opt-nixpkgs.overlays)
- [nixpkgs source code - `nixpkgs.overlays`](https://github.com/NixOS/nixpkgs/blob/30d7dd7e7f2cba9c105a6906ae2c9ed419e02f17/nixos/modules/misc/nixpkgs.nix#L169)

例として、以下の内容はOverlaysを読み込むモジュールの一例です。Home ManagerモジュールとしてもNixOSモジュールとしても使えます（定義は共通です）：

> ただし、Home Managerは外部コンポーネントであり、unstableブランチを使うことが多いため、Home Managerモジュールでoverlaysを導入するより、NixOSモジュールで導入する方が安定しておすすめです。

```nix
# ./overlays/default.nix
{ config, pkgs, lib, ... }:
{
  nixpkgs.overlays = [
    # overlay1 - selfとsuperで継承関係を表現
    (self: super: {
      google-chrome = super.google-chrome.override {
        commandLineArgs =
          "--proxy-server='https=127.0.0.1:3128;http=127.0.0.1:3128'";
      };
    })

    # overlay2 - extendで他のoverlayを継承
    (final: prev: {
      steam = prev.steam.override {
        extraPkgs = pkgs:
          with pkgs; [
            keyutils
            libkrb5
            libpng
            libpulseaudio
            libvorbis
            stdenv.cc.cc.lib
            xorg.libXcursor
            xorg.libXi
            xorg.libXinerama
            xorg.libXScrnSaver
          ];
        extraProfile = "export GDK_SCALE=2";
      };
    })

    # overlay3 - 別ファイルでoverlayを定義
    (import ./overlay3)
  ];
}
```

上記の例では、3つのoverlaysを定義しています：

1. Overlay 1は`google-chrome`のDerivationを上書きし、プロキシサーバのコマンドライン引数を追加します。
2. Overlay 2は`steam`のDerivationを上書きし、追加パッケージや環境変数を加えます。
3. Overlay 3は`./overlays/overlay3/default.nix`で定義されています。

これらの設定をNixOSモジュールとして`flake.nix`に導入する例：

```nix
# ./flake.nix
{
  inputs = {
    # ...
  };

  outputs = inputs@{ nixpkgs ... }: {
    nixosConfigurations = {
      my-nixos = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./configuration.nix
          (import ./overlays)
        ];
      };
    };
  };
}
```

これはあくまで例です。実際の利用時は自身の要件に合わせてoverlays設定を編集してください。

## 複数の異なるoverlaysを使うnixpkgsインスタンス

前述の`nixpkgs.overlays = [...];`はグローバルなデフォルトnixpkgsインスタンスを直接変更します。深いレベルのパッケージを変更すると他のモジュールにも影響し、大量のローカルビルドやパッケージの不具合を招くことがあります。

特定の場所だけでoverlaysを使いたい場合、グローバルなnixpkgsインスタンスを変更せず、複数のnixpkgsインスタンスを使い分ける方法が有効です。次章「[複数nixpkgsインスタンスの活用](./multiple-nixpkgs.md)」で詳しく解説します。

## 参考

- [Chapter 3. Overlays - nixpkgs Manual](https://nixos.org/manual/nixpkgs/stable/#chap-overlays)
