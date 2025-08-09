# Flakes で NixOS を管理する

Flakes を使うことで NixOS で現在使用されている標準的な設定方法よりも再現性を高めることができます。Flakes はパッケージ構造が明確で、かつ他の Git リポジトリへの依存をネイティブにサポートしているので、コードの共有が簡単です。そのため、本書ではシステム設定の管理に Flakes を使うことをお勧めします。

このセクションでは、Flakes を使用して NixOS のシステム設定を管理する方法を紹介しますが、**このセクションを読むために Flakes に関する事前知識は必要ありません**。

## NixOS の Flakes サポートを有効にする {#enable-nix-flakes}

現在 Flakes は実験的な機能であり、まだデフォルトでは有効になっていません。そのため、まず `/etc/nixos/configuration.nix` ファイルを手動で変更し、Flakes 機能とそれに付随する新しい nix コマンドラインツールを有効にする必要があります：

```nix{12,16}
{ config, pkgs, ... }:

{
  imports = [
      # ハードウェアスキャンの結果を含める
      ./hardware-configuration.nix
    ];

  # ......

  # Flakes とそれに付随する新しい nix コマンドラインツールを有効にする
  nix.settings.experimental-features = [ "nix-command" "flakes" ];
  environment.systemPackages = with pkgs; [
    # Flakes は git コマンドで依存関係を取得するため、まず git をインストールする
    git
    vim
    wget
  ];
  # デフォルトエディタを vim に設定
  environment.variables.EDITOR = "vim";

  # ......
}
```

このような修正を行なってから `sudo nixos-rebuild switch` を実行して変更を適用すると、Flakes を使用してシステム設定を管理できるようになります。

新しい nix コマンドラインツールには便利な機能がいくつかあります。例えば、`nix repl` コマンドで nix の対話環境を開くことができます。興味があれば、これを使って Nix の文法を復習したりテストしたりしてみてください。

## システム設定を `flake.nix` に切り替える {#switch-to-flake-nix}

Flakes を有効にすると、`sudo nixos-rebuild switch` コマンドはまず `/etc/nixos/flake.nix` ファイルを読み込もうとします。見つからない場合は `/etc/nixos/configuration.nix` を使用しようとします。

公式のテンプレートを使って Flake の書き方を勉強していきましょう。まずは、利用可能なテンプレートを調べます:

```bash
nix flake show templates
```

その中に `templates#full` というテンプレートがあり、これにはすべての機能の利用例が網羅されています。その内容を見てみましょう:

```bash
nix flake init -t templates#full
cat flake.nix
```

このテンプレートを参考にして `/etc/nixos/flake.nix` ファイルを作成し、設定内容を記述していきます。今後のシステムのすべての変更は Nix Flakes によって管理します。サンプルの内容は以下の通りです:

```nix{16}
{
  description = "A simple NixOS flake";

  inputs = {
    # NixOS 公式ソフトウェアソース。ここでは nixos-25.05 ブランチを使用
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }@inputs: {
    # my-nixos はあなたのホスト名に置き換えてください
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        # これまで使っていた configuration.nix をインポートすることで
        # 古い設定が引き続き有効になるようにします
        ./configuration.nix
      ];
    };
  };
}
```

ここでは `my-nixos` という名前のシステムを定義しており、その設定ファイルは `/etc/nixos/` フォルダ内の `./configuration.nix` です。つまり、古い設定をそのまま流用しています。

ここで `sudo nixos-rebuild switch` を実行して設定を適用しても、システムは何も変わらないはずです。なぜなら、単に Nix Flakes を使うように切り替えただけで、設定内容は以前と同じだからです。

> あなたのシステムのホスト名が `my-nixos` でない場合は、`flake.nix` の `nixosConfigurations` の名前を変更するか、`--flake /etc/nixos#my-nixos` を使って設定名を指定する必要があります。

切り替えが完了したら、Flakes を使ってシステムを管理できます。

この時点で flake には以下のファイルが含まれています:

- `/etc/nixos/flake.nix`: flake のエントリポイントファイルで、`sudo nixos-rebuild switch` を実行した際にこのファイルが評価・デプロイされます
- `/etc/nixos/flake.lock`: 自動生成されるバージョンロックファイルで、flake 全体の全ての input のデータソース、ハッシュ値、バージョン番号を記録して、システムの再現性を担保します
- `/etc/nixos/configuration.nix`: 従来の設定ファイル。ここでは `flake.nix` でモジュールとしてインポートされており、現時点ではすべてのシステム設定がこのファイルに記述されています
- `/etc/nixos/hardware-configuration.nix`: NixOS によって自動で生成される、システムのハードウェア情報が書かれたハードウェアの設定ファイル

## まとめ {#conclusion}

このセクションでは、非常にシンプルな設定ファイル `/etc/nixos/flake.nix` を作成しました。これは単に `/etc/nixos/configuration.nix` の薄いラッパーであり、それ自体は新しい機能を提供せず、破壊的な変更も導入していません。

本書の後の内容で、`flake.nix` の構造と機能を学び、このようなラッパーがもたらす利点を徐々に見ていきます。

> 注意: 本書で説明する設定管理方法は「すべてを単一ファイルに」ではありません。設定内容はカテゴリごとに別々の nix ファイルに分け、`flake.nix` の `modules` リストでこれらの設定ファイルを取り込み、Git で管理することを推奨します。
>
> このようにすることで設定ファイルがより整理しやすくなり、構成の保守性を高めることができます。後の [設定のモジュール化](./modularize-the-configuration.md) のセクションで、NixOS の設定をモジュール化する方法を詳しく説明し、[その他の便利なヒント](./other-useful-tips.md) で Git を使って NixOS の設定を管理するためのいくつかのベストプラクティスを紹介します。

[nix flake - Nix Manual]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake#flake-inputs
[nixpkgs/flake.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/flake.nix
[nixpkgs/nixos/lib/eval-config.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/lib/eval-config.nix
[Module System - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md
[nixpkgs/nixos-25.05/lib/modules.nix - _module.args]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/lib/modules.nix#L122-L184
[nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-types.section.md?plain=1#L237-L244
