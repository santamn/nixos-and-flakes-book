# Nixpkgs の高度な使い方 {#nixpkgs-advanced-usage}

`callPackage`, `Overriding`, `Overlays` は Nix を使う際に時折必要となる技術で、いずれも Nix パッケージのビルド方法をカスタマイズするためのものです。

多くのソフトウェアには多数のビルドパラメータがあり、ユーザーごとに異なる値を使いたい場合があります。こうしたとき、`Overriding` や `Overlays` が役に立ちます。いくつか私の実例を挙げます:

1. [fcitx5-rime.nix](https://github.com/NixOS/nixpkgs/blob/e4246ae1e7f78b7087dce9c9da10d28d3725025f/pkgs/tools/inputmethods/fcitx5/fcitx5-rime.nix): fcitx5-rime の `rimeDataPkgs` はデフォルトで `rime-data` パッケージを使いますが、このパラメータは `override` によってカスタマイズ可能です。
2. [vscode/with-extensions.nix](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/pkgs/applications/editors/vscode/with-extensions.nix): この VSCode 用パッケージも `vscodeExtensions` の値をオーバーライドすることでカスタマイズ可能で、これにより VSCode に独自のプラグインをインストールすることができます。
   - [nix-vscode-extensions](https://github.com/nix-community/nix-vscode-extensions): `vscodeExtensions` をオーバーライドして実装された VSCode プラグインマネージャー
3. [firefox/common.nix](https://github.com/NixOS/nixpkgs/blob/416ffcd08f1f16211130cd9571f74322e98ecef6/pkgs/applications/networking/browsers/firefox/common.nix): FireFoxにも多くのカスタマイズ可能なパラメータがあります。
4. などなど

要するに、`callPackage`, `Overriding`, `Overlays` を使うことで Nix パッケージのビルドパラメータのカスタマイズをすることができるということです。
