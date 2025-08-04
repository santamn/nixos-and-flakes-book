# Flakes を使って NixOS を管理する

NixOS の現在のデフォルト設定方法と比較して、Flakes はより良い再現性を提供し、その明確なパッケージ構造定義は他の Git リポジトリへの依存をネイティブにサポートし、コードの共有を容易にします。そのため、本書ではシステム設定の管理に Flakes を使用することを推奨しています。

このセクションでは、Flakes を使用して NixOS システム設定を管理する方法を紹介します。**このセクションを読むために、Flakes に関する事前の知識は必要ありません**。

## NixOS の Flakes サポートを有効にする {#enable-nix-flakes}

現在、Flakes は実験的な機能であり、まだデフォルトで有効になっていません。そのため、まず `/etc/nixos/configuration.nix` ファイルを手動で変更し、Flakes 機能とそれに付随する新しい nix コマンドラインツールを有効にする必要があります：

```nix{12,15}
{ config, pkgs, ... }:

{
  imports =
    [ # ハードウェアスキャンの結果を含める
      ./hardware-configuration.nix
    ];

  # ......

  # Flakes 機能とそれに付随する新しい nix コマンドラインツールを有効にする
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  environment.systemPackages = with pkgs; [
    # Flakes は git コマンドで依存関係を取得するため、まず git をインストールする必要があります
    git
    vim
    wget
  ];
  # デフォルトエディタを vim に設定
  environment.variables.EDITOR = "vim";

  # ......
}
```

次に `sudo nixos-rebuild switch` を実行して変更を適用すると、Flakes 機能を使用してシステム設定を管理できるようになります。

nix の新しいコマンドラインツールには便利な機能もいくつかあります。例えば、`nix repl` コマンドで nix の対話環境を開くことができます。興味があれば、これを使って以前学んだすべての Nix 構文を復習・テストしてみてください。

## システム設定を flake.nix に切り替える {#switch-to-flake-nix}

Flakes 機能を有効にすると、`sudo nixos-rebuild switch` コマンドはまず `/etc/nixos/flake.nix` ファイルを読み込もうとします。見つからない場合は `/etc/nixos/configuration.nix` を使用しようとします。

公式テンプレートを使って flake の書き方を学ぶことから始められます。まず、利用可能なテンプレートを調べてみましょう：

```bash
nix flake show templates
```

その中に `templates#full` というテンプレートがあり、すべての可能な使用法が示されています。その内容を見てみましょう：

```bash
nix flake init -t templates#full
cat flake.nix
```

このテンプレートを参考にして `/etc/nixos/flake.nix` ファイルを作成し、設定内容を記述します。今後のシステムのすべての変更は Nix Flakes が管理します。サンプル内容は以下の通りです：

```nix{16}
{
  description = "A simple NixOS flake";

  inputs = {
    # NixOS 公式ソフトウェアソース、ここでは nixos-25.05 ブランチを使用
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }@inputs: {
    # TODO: 以下の my-nixos をあなたのホスト名に置き換えてください
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        # ここで以前使用した configuration.nix をインポートします。
        # これにより、古い設定ファイルが引き続き有効になります
        ./configuration.nix
      ];
    };
  };
}
```

ここでは `my-nixos` という名前のシステムを定義し、その設定ファイルは `/etc/nixos/` フォルダ内の `./configuration.nix` です。つまり、古い設定をそのまま使用しています。

अब `sudo nixos-rebuild switch` を実行して設定を適用します。システムには何の変化もないはずです。なぜなら、単に Nix Flakes に切り替えただけで、設定内容は以前と同じだからです。

> あなたのシステムのホスト名が `my-nixos` でない場合は、`flake.nix` の `nixosConfigurations` の名前を変更するか、`--flake /etc/nixos#my-nixos` を使って設定名を指定する必要があります。

切り替えが完了したら、Flakes 機能を使ってシステムを管理できます。

現在、私たちの flake には以下のファイルが含まれています：

- `/etc/nixos/flake.nix`: flake のエントリポイントファイル。`sudo nixos-rebuild switch` を実行すると認識され、デプロイされます。
- `/etc/nixos/flake.lock`: 自動生成されるバージョンロックファイル。flake 全体のすべての入力データソース、ハッシュ値、バージョン番号を記録し、システムの再現性を保証します。
- `/etc/nixos/configuration.nix`: これは以前の設定ファイルで、`flake.nix` でモジュールとしてインポートされます。現在、すべてのシステム設定がこのファイルに記述されています。
- `/etc/nixos/hardware-configuration.nix`: これはシステムハードウェア設定ファイルで、NixOS によって生成され、システムのハードウェア情報を記述しています。

## まとめ {#conclusion}

このセクションでは、非常にシンプルな設定ファイル `/etc/nixos/flake.nix` を追加しました。これは単に `/etc/nixos/configuration.nix` の薄いラッパーであり、それ自体は新しい機能を提供せず、破壊的な変更も導入していません。

本書の後の内容で、`flake.nix` の構造と機能を学び、このようなラッパーがもたらす利点を徐々に見ていきます。

> 注意：**本書で説明する設定管理方法は「すべてを単一ファイルに」ではありません。設定内容をカテゴリ別に異なる nix ファイルに保存し**、`flake.nix` の `modules` パラメータリストでこれらの設定ファイルをインポートし、Git で管理することを推奨します。この方法の利点は、設定ファイルをより良く整理し、設定の保守性を向上させることです。後の [モジュール化 NixOS 設定](./modularize-the-configuration.md) のセクションで、NixOS 設定をモジュール化する方法を詳しく説明し、[その他の実用的なヒント - Git で NixOS 設定を管理する](./other-useful-tips.md) で、Git を使って NixOS 設定を管理するためのいくつかのベストプラクティスを紹介します。

[nix flake - Nix Manual]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake#flake-inputs
[nixpkgs/flake.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/flake.nix
[nixpkgs/nixos/lib/eval-config.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/lib/eval-config.nix
[Module System - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md
[nixpkgs/nixos-25.05/lib/modules.nix - _module.args]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/lib/modules.nix#L122-L184
[nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-types.section.md?plain=1#L237-L244
