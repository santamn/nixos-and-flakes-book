# Flakes と Nixpkgs モジュールシステムを組み合わせる

## Nixpkgs のモジュール構造の簡単な紹介 {#simple-introduction-to-nixpkgs-module-structure}

> Nixpkgs モジュールシステムの詳しい仕組みについての解説は後の [設定のモジュール化](./modularize-the-configuration.md) セクションに譲り、ここではモジュールシステムの基礎知識についてのみ扱います。

なぜ `/etc/nixos/configuration.nix` という設定ファイルが Nixpkgs モジュールの定義に沿っており、`flake.nix` から直接参照できるのか、と疑問に思う読者の方がいらっしゃるかもしれません。

これを理解するためには、まず Nixpkgs モジュールシステムの由来とその用途について知る必要があります。

NixOS のすべてのコードは [nixpkgs/nixos](https://github.com/NixOS/nixpkgs/tree/master/nixos) にあり、これらのソースコードのほとんどは Nix 言語で書かれています。これほど多くの Nix 言語のコードを記述・保守し、ユーザーが NixOS システムの各機能を柔軟にカスタマイズできるようにするためには、コードのモジュールシステムが不可欠でした。

そのような Nix のコードのためのモジュールシステムは NixOS のコードと同様に Nixpkgs リポジトリで実装されており、主に NixOS のシステム設定をモジュール化するのに使われていますが、nix-darwin や home-manager など他の場面でも広く利用されています。

NixOS 自体がこのモジュールシステムの上に成り立っているため、`/etc/nixos/configuration.nix` を含む設定ファイル群が Nixpkgs モジュールであることはとても自然です。

次の内容に進む前に、まずこのモジュールシステムの挙動の基本的な部分について理解しておく必要があります。

簡略化された Nixpkgs モジュールの構造は次のとおりです:

```nix
{lib, config, options, pkgs, ...}:
{
  # 他のモジュールをインポート
  imports = [
    # ......
    # ./xxx.nix
  ];

  for.bar.enable = true;
  # その他のオプションの設定
  # ...
}
```

その内容は実際には Nix 関数であり、この関数には**明示的な宣言なしにモジュールシステムから自動的に与えられる5つのパラメータ**があります:

1. `lib`: **Nixpkgs に付属する組み込み関数のライブラリで、Nix 式を扱うための便利な関数を数多く提供しています**
   - 詳細は <https://nixos.org/manual/nixpkgs/stable/#id-1.4> を参照してください
2. `config`: 現在の環境に関するすべてのオプションを含んだ attribute set で、以降のモジュールシステムに関するセクションで頻繁に登場します
3. `options`: 現在の環境にあるすべてのモジュールで定義されているオプションからなる attribute set です
4. `pkgs`: **すべての Nixpkgs パッケージを含む attribute set で、多くの関連するユーティリティ関数も提供しています**
   - 入門段階では、`pkgs` のデフォルト値は `nixpkgs.legacyPackages."${system}"` であると考えておけば問題ありません。また、`pkgs` の値は `nixpkgs.pkgs` オプションを通じてカスタマイズできます
5. `modulesPath`: NixOS でのみ利用可能なパラメータで、[nixpkgs/nixos/modules](https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/modules) を指すパスです
   - これは [nixpkgs/nixos/lib/eval-config-minimal.nix#L43](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/lib/eval-config-minimal.nix#L43) で定義されています
   - 通常は追加で NixOS モジュールをインポートするために使用され、NixOS が自動生成する `hardware-configuration.nix` でよく見られます

## カスタムパラメータをサブモジュールに渡す {#pass-non-default-parameters-to-submodules}

NixOS のモジュールシステムによって自動的に与えられる5つの標準パラメータ（`lib`, `config`, `options`, `pkgs`, `modulesPath`）以外の、ユーザーが独自に定義したパラメータをサブモジュールに渡す場合は、特別な方法でパラメータを指定する必要があります。

Nixpkgs のモジュールシステムにはカスタムパラメータを渡す方法が2つあります:

1. `nixpkgs.lib.nixosSystem` 関数の `specialArgs` パラメータを使う
2. 任意のモジュールで `_module.args` オプションを使う

これら2つのパラメータについての公式ドキュメントは非常に見つけづらく、また内容も曖昧で理解しにくいです。興味のある読者のために、ここにリンクを置いておきます:

1. `specialArgs`: NixOS Manual と Nixpkgs Manualにはそれぞれこのパラメータに関連する断片的な記述があります
   - Nixpkgs Manual: [Module System - Nixpkgs]
   - NixOS Manual: [nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]
2. `_module.args`:
   - NixOS Manual: [Appendix A. Configuration Options](https://nixos.org/manual/nixos/stable/options#opt-_module.args)
   - ソースコード: [nixpkgs/nixos-25.05/lib/modules.nix - _module.args]

要約すると、`specialArgs` と `_module.args` はどちらも attribute set を入力にとるもので、またどちらの場合も attribute set 内のすべてのパラメータをすべてのサブモジュールに渡すという機能をもちます。両者の違いは次のとおりです:

1. どのモジュールでも `_module.args` オプションを使ってパラメータを相互に渡し合うことができ、`nixpkgs.lib.nixosSystem` 関数でのみ使用できる `specialArgs` よりも柔軟に使用できます
2. `_module.args` はモジュール内で宣言して使用されるため、すべてのモジュールが評価されてはじめて利用できるようになります。これにより、**`imports = [ ... ];` において `_module.args` を介して渡されたパラメータを使用すると、`infinite recursion` エラーが発生します**。この場合は代わりに `specialArgs` を使わなければいけません。

私は個人的には `specialArgs` の方が良いと思います。なぜなら、よりシンプルで使いやすいからです。また、`_xxx` のような命名スタイルは内部的に利用されるもののように感じられてしまい、ユーザーの設定ファイルで使うにはあまり適していません。

ある依存関係をサブモジュールに渡したい場合、`specialArgs` パラメータを使って `inputs` をすべてのサブモジュールに渡すことができます:

```nix{13}
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    another-input.url = "github:username/repo-name/branch-name";
  };

  outputs = inputs@{ self, nixpkgs, another-input, ... }: {
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";

      # すべてのサブモジュールに inputs のすべての値を特殊な引数として渡すことで
      # サブモジュールで inputs に含まれる依存関係が直接利用できます
      specialArgs = { inherit inputs; };
      modules = [
        ./configuration.nix
      ];
    };
  };
}
```

同様に、`_module.args` オプションを使用しても同じ効果が得られます:

```nix{15}
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    another-input.url = "github:username/repo-name/branch-name";
  };

  outputs = inputs@{ self, nixpkgs, another-input, ... }: {
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
        {
          # すべてのサブモジュールに inputs のすべての値を特殊な引数として渡すことで
          # サブモジュールで inputs に含まれる依存関係が直接利用できます
          _module.args = { inherit inputs; };
        }
      ];
    };
  };
}
```

上記の2つの方法のいずれかを選んで設定を変更すると、`/etc/nixos/configuration.nix` で `inputs` パラメータを使用できるようになります。モジュールシステムが `specialArgs` で定義された `inputs` を自動的に照合し、このパラメータを必要とするすべてのサブモジュールに注入します:

```nix{3}
# Nix はモジュールの引数名を照合し、specialArgs や _module.args に渡されたのと
# 同名の仮引数（ここでは inputs）があれば、自動でその値を関数に注入します
{ config, pkgs, inputs, ... }:

# これで、以下では inputs パラメータを使用できます
{
  # ......
}
```

次のセクションでは、`specialArgs` や `_module.args` を使って他の flake ソースからシステムソフトウェアをインストールする方法を示します。

## 他の flake からシステムソフトウェアをインストールする {#install-system-packages-from-other-flakes}

システム管理で最も一般的な要件はソフトウェアのインストールです。[前のセクション](nixos-with-flakes-enabled.md#enable-nix-flakes) では、`environment.systemPackages` を使って `pkgs` 内のパッケージをインストールする方法を確認しました。これらのパッケージはすべて公式の Nixpkgs リポジトリのものです。

ここでは、他の flake ソースからソフトウェアパッケージをインストールする方法について学びます。この方法は Nixpkgs から直接インストールするよりもはるかに柔軟であり、Nixpkgs にまだ追加されていなかったり、Nixpkgs では更新されていないソフトウェアの最新バージョンをインストールする際に主に用いられます。

[Helix](https://github.com/helix-editor/helix) エディタを例に、Helix の master ブランチを直接コンパイルしてインストールする方法を示します。

まず、`flake.nix` に helix という inputs データソースを追加します:

```nix{6,12,18}
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";

    # Helix エディタのマスターブランチを追加
    helix.url = "github:helix-editor/helix/master";
  };

  outputs = inputs@{ self, nixpkgs, ... }: {
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      specialArgs = { inherit inputs; };
      modules = [
        ./configuration.nix

        # この無名モジュールは上記で使用した `specialArgs` と同じように機能します
        # どちらか一方を選択してください
        # { _module.args = { inherit inputs; };}
      ];

    };
  };
}
```

このようにすることで、`configuration.nix` でこの flake input データソースを参照できます:

```nix{1,10}
{ config, pkgs, inputs, ... }:
{
  # ...
  environment.systemPackages = with pkgs; [
    git
    vim
    wget
    # helix パッケージは helix という inputs データソースからインストールされます
    inputs.helix.packages."${pkgs.system}".helix
  ];
  # ...
}
```

変更後に `sudo nixos-rebuild switch` でデプロイすると、Helix がインストールされます。今回のデプロイは Nix がソースから Helix のプログラム全体をコンパイルするため、通常よりもかなり時間がかかります。

デプロイが完了したら、ターミナルで `hx` コマンドを使って直接テストや検証をすることができます。

また、Helix の最新バージョンを試してみてから、実際にシステムにインストールするかどうかを決めたい場合は、1コマンドで実行できるより簡単な方法があります（ただし、前述のようにソースからのコンパイルには時間がかかります）:

```bash
nix run github:helix-editor/helix/master
```

`nix run` の使用方法については、後の [新 CLIの使い方](../other-usage-of-flakes/the-new-cli.md) で詳しく説明します。

## 他の Flakes パッケージの機能を使う {#leveraging-features-from other-flakes-packages}

実際のところ、Flakes の最も主要な機能はこれです。ある flake は他の flake に依存することができ、それらが提供する機能を使用できます。これはちょうど TypeScript, Go, Rust などのプログラミング言語でプログラムを書くときに外部のライブラリから機能を取り入れるのと同じようなものです。

上記の Helix 公式による flake の最新バージョンを使う例がまさにこの機能を示しています。その他の多くの使用例は後ほどで触れますが、これから見ていく幾つかの例をあらかじめ挙げておきます:

- [Home Manager入門](./start-using-home-manager.md): コミュニティの Home-Manager を依存関係として導入し、その flake が提供する機能を直接利用できるようにします
- [パッケージのバージョン変更](./downgrade-or-upgrade-packages.md): 異なるバージョンの Nixpkgs を依存関係として導入し、さまざまなバージョンの Nixpkgs からパッケージを柔軟に選択できるようにします

## その他の Flakes の参考資料

ここまでで、Flakes を使用して NixOS システムを設定する方法を学びました。Flakes についてさらに疑問がある場合や、さらに深く学びたい場合は以下の公式/半公式ドキュメントを直接参照してください。

- Nix Flakesの公式ドキュメント:
  - [Nix flakes - Nix Manual](https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake)
  - [Flakes - nix.dev](https://nix.dev/concepts/flakes)
- Eelco Dolstra（Nix の作者）による Flakes に関する一連の記事:
  - [Nix Flakes, Part 1: An introduction and tutorial (Eelco Dolstra, 2020)](https://www.tweag.io/blog/2020-05-25-flakes/)
  - [Nix Flakes, Part 2: Evaluation caching (Eelco Dolstra, 2020)](https://www.tweag.io/blog/2020-06-25-eval-cache/)
  - [Nix Flakes, Part 3: Managing NixOS systems (Eelco Dolstra, 2020)](https://www.tweag.io/blog/2020-07-31-nixos-flakes/)
- その他の有用なドキュメント:
  - [Practical Nix Flakes](https://serokell.io/blog/practical-nix-flakes)

[nix flake - Nix Manual]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake#flake-inputs
[nixpkgs/flake.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/flake.nix
[nixpkgs/nixos/lib/eval-config.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/lib/eval-config.nix
[Module System - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md
[nixpkgs/nixos-25.05/lib/modules.nix - _module.args]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/lib/modules.nix#L122-L184
[nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-types.section.md?plain=1#L237-L244
