# Derivation と Nix 式のデバッグ

## 詳細なエラーメッセージを表示する

デプロイ時にエラーが発生した場合は、 `nixos-rebuild` コマンドに `--show-trace --print-build-logs --verbose` を追加すると、詳細なエラー内容を確認できます。例：

```bash
cd /etc/nixos
sudo nixos-rebuild switch --flake .#myhost --show-trace --print-build-logs --verbose

# より簡潔な書き方
sudo nixos-rebuild switch --flake .#myhost --show-trace -L -v
```

## `nix repl` でのデバッグ

> ※ `NIX_PATH` を無効化している場合、 `<nixpkgs>` のような構文は使えません。代わりに `nix repl -f flake:nixpkgs` で nixpkgs を読み込んでください。

このガイドでもたびたび `nix repl '<nixpkgs>'` を使ってソースを調べてきました。これは Nix の仕組みを理解するのにとても便利なツールです。

まずは `nix repl` のヘルプを見てみましょう：

```
› nix repl -f '<nixpkgs>'
Welcome to Nix 2.13.3. Type :? for help.

Loading installable ''...
Added 17755 variables.
nix-repl> :?
The following commands are available:

  <expr>        式を評価して表示
  <x> = <expr>  式を変数にバインド
  :a <expr>     結果セットから属性をスコープに追加
  :b <expr>     derivation をビルド
  :bl <expr>    derivation をビルドし、作業ディレクトリに GC ルートを作成
  :e <expr>     パッケージや関数を $EDITOR で開く
  :i <expr>     derivation をビルドし、結果を現在のプロファイルにインストール
  :l <path>     Nix 式をロードしてスコープに追加
  :lf <ref>     Nix flake をロードしてスコープに追加
  :p <expr>     式を再帰的に評価して表示
  :q            nix-repl を終了
  :r            すべてのファイルをリロード
  :sh <expr>    derivation の依存をビルドし nix-shell を起動
  :t <expr>     評価結果の型を表示
  :u <expr>     derivation をビルドし nix-shell を起動
  :doc <expr>   組み込み関数のドキュメントを表示
  :log <expr>   derivation のログを表示
  :te [bool]    エラー時のトレース表示を切り替え
```

よく使うのは `:lf <ref>` と `:e <expr>` です。

`:e <expr>` は直感的なのでここでは割愛し、 `:lf <ref>` について説明します。

```nix
# 自分の nix 設定ディレクトリに移動（各自の環境に合わせてください）
› cd ~/nix-config/

# nix repl インタプリタに入る
› nix repl
Welcome to Nix 2.13.3. Type :? for help.

# 私のnix設定をflakeとして現在のスコープにロードします
nix-repl> :lf .
Added 16 variables.

# <TAB>を押して現在のスコープにどのような変数があるかを確認します。nixosConfigurations、inputs、outputs、packagesがすべて含まれていることがわかります
# これは、これらの設定の内部状態を簡単に確認できることを意味します
nix-repl><TAB>
# ......一部の出力を省略
__isInt                          nixosConfigurations
__isList                         null
__isPath                         outPath
__isString                       outputs
__langVersion                    packages
# ......一部の出力を省略

# inputsに何があるかを確認します
nix-repl> inputs.<TAB>
inputs.agenix            inputs.nixpkgs
inputs.darwin            inputs.nixpkgs-darwin
inputs.home-manager      inputs.nixpkgs-unstable
inputs.hyprland          inputs.nixpkgs-wayland
inputs.nil
inputs.nixos-generators

# inputs.nil.packagesに何があるかを確認します
nix-repl> inputs.nil.packages.
inputs.nil.packages.aarch64-darwin
inputs.nil.packages.aarch64-linux
inputs.nil.packages.x86_64-darwin
inputs.nil.packages.x86_64-linux

# outputsに何があるかを確認します
nix-repl> outputs.nixosConfigurations.<TAB>
outputs.nixosConfigurations.ai
outputs.nixosConfigurations.aquamarine
outputs.nixosConfigurations.kana
outputs.nixosConfigurations.ruby

# aiの設定に何があるかを確認します
nix-repl> outputs.nixosConfigurations.ai.<TAB>
outputs.nixosConfigurations.ai._module
outputs.nixosConfigurations.ai._type
outputs.nixosConfigurations.ai.class
outputs.nixosConfigurations.ai.config
outputs.nixosConfigurations.ai.extendModules
outputs.nixosConfigurations.ai.extraArgs
outputs.nixosConfigurations.ai.options
outputs.nixosConfigurations.ai.pkgs
outputs.nixosConfigurations.ai.type

nix-repl> outputs.nixosConfigurations.ai.config.
outputs.nixosConfigurations.ai.config.age
outputs.nixosConfigurations.ai.config.appstream
outputs.nixosConfigurations.ai.config.assertions
outputs.nixosConfigurations.ai.config.boot
outputs.nixosConfigurations.ai.config.console
outputs.nixosConfigurations.ai.config.containers
# ......その他の出力を省略

nix-repl> outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.<TAB>
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.activation
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.activationPackage
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.emptyActivationPath
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.enableDebugInfo
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file
# ......その他の出力を省略


nix-repl> outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.sessionVariables.<TAB>
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.sessionVariables.BROWSER
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.sessionVariables.DELTA_PAGER
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.sessionVariables.EDITOR
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.sessionVariables.TERM
# ......その他の出力を省略

# `TERM`という環境変数の値を確認します
nix-repl> outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.sessionVariables.TERM
"xterm-256color"


# `home.file`で定義したすべてのファイルを確認します
nix-repl> outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file.<TAB>
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file..bash_profile
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file..bashrc
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file..config/fcitx5/profile
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file..config/fcitx5/profile-bak
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file..config/i3/config
outputs.nixosConfigurations.ai.config.home-manager.users.ryan.home.file..config/i3/i3blocks.conf
#......
```

ご覧のとおり、`nix repl`に私のflake設定をロードすると、すべての設定項目を簡単に確認でき、デバッグに非常に役立ちます。

## nixpkgsで提供されているデバッグ関数を使用する

TODO

## derivationの`NIX_DEBUG`パラメータを使用してデバッグする

TODO

## 参考資料

- [How to make nix build display all commands executed by make?](https://www.reddit.com/r/NixOS/comments/14stdgy/how_to_make_nix_build_display_all_commands/)
  - derivationで`NIX_DEBUG=7`を使用
- [Collection of functions useful for debugging broken nix expressions.](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/lib/debug.nix)
