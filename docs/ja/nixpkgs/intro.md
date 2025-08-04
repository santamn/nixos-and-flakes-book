# Nixpkgsの高度な使い方 {#nixpkgs-advanced-usage}

callPackage、Overriding、OverlaysはNixを使う際に時折必要となる技術で、いずれもNixパッケージのビルド方法をカスタマイズするためのものです。

多くのソフトウェアには多くのビルドパラメータがあり、ユーザーごとに異なる値を使いたい場合があります。こうしたとき、OverridingやOverlaysが役立ちます。いくつか実例を挙げます：

1. [fcitx5-rime.nix](https://github.com/NixOS/nixpkgs/blob/e4246ae1e7f78b7087dce9c9da10d28d3725025f/pkgs/tools/inputmethods/fcitx5/fcitx5-rime.nix):
   fcitx5-rimeの`rimeDataPkgs`はデフォルトで`rime-data`パッケージを使いますが、overrideで独自の値を指定し、カスタムのrime設定（例：小鶴音形入力法など）を読み込むこともできます。
2. [vscode/with-extensions.nix](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/pkgs/applications/editors/vscode/with-extensions.nix):
   vscodeパッケージもoverrideで`vscodeExtensions`パラメータを指定し、独自の拡張機能をインストールできます。
   1. [nix-vscode-extensions](https://github.com/nix-community/nix-vscode-extensions):
      これはこのパラメータを活用したvscode拡張管理の例です。
3. [firefox/common.nix](https://github.com/NixOS/nixpkgs/blob/416ffcd08f1f16211130cd9571f74322e98ecef6/pkgs/applications/networking/browsers/firefox/common.nix):
   firefoxも多くのカスタマイズ可能なパラメータがあります。
4. などなど

このようなNixパッケージのビルドパラメータをカスタマイズしたい場合や、より深いレベルの変更を加えたい場合、callPackage、Overriding、Overlaysの機能が必要になります。
