# Dotfiles デバッグの高速化

Home Manager で Dotfiles を管理していると、 Dotfiles を変更するたびに `sudo nixos-rebuild switch`（または Home Manager 単体利用時は `home-manager switch`）を実行しないと変更が反映されない、という問題に直面することがあります。しかし、このコマンドは毎回システム全体の状態を再計算するため、 Nix の多くのキャッシュ機構があっても、実行には時間がかかり面倒です。

たとえば、わたしの Neovim / Emacs の設定は頻繁に変更しており、1日に何十回、時には何百回も編集します。そのたびに `nixos-rebuild` の完了を数十秒待つのは、時間の無駄です。

幸い、 Home Manager には [mkOutOfStoreSymlink][mkOutOfStoreSymlink] という関数があり、 Dotfiles の絶対パスへのシンボリックリンクを作成できます。これにより Home Manager を経由せず、編集内容が即座に反映されます。

この方法は、 Dotfiles の内容が Nix で生成されていない場合に有効です。たとえば、わたしの Emacs / Neovim の設定はネイティブで、 Nix Home-Manager の `home.file` や `xdg.configFile` で正しい場所にリンクしているだけです。

以下に、この関数を使って Dotfiles のデバッグを高速化する方法を簡単に説明します。

Neovim の設定を `~/nix-config/home/nvim` に置いている場合、 Home Manager の設定（例: `~/nix-config/home/default.nix`）に次のように記述します。

```nix
{ config, pkgs, ... }: let
  # nvim 設定ディレクトリへのパス
  nvimPath = "${config.home.homeDirectory}/nix-config/home/nvim";
  # doom emacs 設定ディレクトリへのパス
  doomPath = "${config.home.homeDirectory}/nix-config/home/doom";
in
{
  xdg.configFile."nvim".source = config.lib.file.mkOutOfStoreSymlink nvimPath;
  xdg.configFile."doom".source = config.lib.file.mkOutOfStoreSymlink doomPath;
  # 他の設定
}
```

設定を変更したら `sudo nixos-rebuild switch`（または Home Manager 単体利用時は `home-manager switch`）を実行して反映します。以降は `~/nix-config/home/nvim` や `~/nix-config/home/doom` を編集するだけで、 Neovim / Emacs に即座に反映されます。

この方法なら、すべての Dotfiles を1つの nix-config リポジトリで管理しつつ、頻繁に編集する Nix 以外の設定も素早く反映できます。

[mkOutOfStoreSymlink]: https://github.com/search?q=repo%3Anix-community%2Fhome-manager%20outOfStoreSymlink&type=code
