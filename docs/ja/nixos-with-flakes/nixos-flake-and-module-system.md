# Flakesの組み合わせ能力とNixpkgsモジュールシステム

## Nixpkgsモジュール構造の簡単な紹介 {#simple-introduction-to-nixpkgs-module-structure}

> このモジュールシステムの動作方法については、後の[NixOS設定のモジュール化](./modularize-the-configuration.md)のセクションで詳しく説明します。ここでは基礎知識のみを紹介します。

なぜ`/etc/nixos/configuration.nix`という設定ファイルがNixpkgsモジュールの定義に準拠しており、`flake.nix`で直接参照できるのでしょうか？一部の読者にとっては、これは少し意外に思えるかもしれません。

これを理解するためには、まずNixpkgsモジュールシステムの由来とその用途について知る必要があります。

NixOSのすべての実装コードは[Nixpkgs/nixos](https://github.com/NixOS/nixpkgs/tree/master/nixos)ディレクトリに保存されており、これらのソースコードのほとんどはNix言語で書かれています。これほど多くのNixコードを記述・保守し、ユーザーがNixOSシステムの各機能を柔軟にカスタマイズできるようにするためには、Nixコードのモジュール化システムが不可欠です。

このNixコードのモジュール化システムの実現も同様にNixpkgsリポジトリにあり、主にNixOSシステム設定のモジュール化に使用されますが、nix-darwinやhome-managerなど、他のアプリケーションでも広く使用されています。

NixOSがこのモジュールシステムに基づいて構築されていることを考えると、その設定ファイル（`/etc/nixos/configuration.nix`を含む）がNixpkgsモジュールであることは非常に自然です。

後の内容に進む前に、まずこのモジュールシステムの動作方法について簡単に理解する必要があります。

簡略化されたNixpkgsモジュールの構造は次のとおりです：

```nix
{lib, config, options, pkgs, ...}:
{
  # 他のモジュールをインポート
  imports = [
    # ......
    # ./xxx.nix
  ];

  for.bar.enable = true;
  # other options declarations
  # ...
}
```

その定義は実際にはNix関数であり、この関数には**モジュールシステムによって自動的に生成、注入され、追加の宣言が不要な5つのパラメータ**があります：

1. `lib`: **nixpkgsに付属の関数ライブラリで、Nix式を操作するための多くの便利な関数を提供します**
   - 詳細は<https://nixos.org/manual/nixpkgs/stable/#id-1.4>を参照してください
2. `config`: 現在の環境のすべてのオプションの値を含んでおり、後のモジュールシステムの学習で頻繁に使用されます
3. `options`: 現在の環境のすべてのモジュールで定義されているすべてのオプションの集合
4. `pkgs`: **すべてのnixpkgsパッケージを含む集合で、多くの関連ツール関数も提供します**
   - 入門段階では、そのデフォルト値は`nixpkgs.legacyPackages."${system}"`と考えることができ、`pkgs`の値は`nixpkgs.pkgs`オプションを通じてカスタマイズできます
5. `modulesPath`: NixOSでのみ利用可能なパラメータで、[nixpkgs/nixos/modules](https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/modules)を指すPathです
   - これは[nixpkgs/nixos/lib/eval-config-minimal.nix#L43](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/lib/eval-config-minimal.nix#L43)で定義されています
   - 通常、追加のNixOSモジュールをインポートするために使用され、NixOSが自動生成する`hardware-configuration.nix`でよく見られます

## 非デフォルトパラメータをサブモジュールに渡す {#pass-non-default-parameters-to-submodules}

他の非デフォルトパラメータをサブモジュールに渡す必要がある場合は、特別な手段を使用してこれらの非デフォルトパラメータを手動で指定する必要があります。

Nixpkgsのモジュールシステムは、非デフォルトパラメータを渡すための2つの方法を提供します：

1. `nixpkgs.lib.nixosSystem`関数の`specialArgs`パラメータ
2. 任意のモジュールで`_module.args`オプションを使用してパラメータを渡す

これら2つのパラメータの公式ドキュメントは非常に深く隠されており、曖昧で理解しにくいです。興味のある読者のために、ここにリンクを置いておきます：

1. `specialArgs`: NixOS ManualとNixpkgs Manualには、それぞれ関連する断片的な記述があります
   - Nixpkgs Manual: [Module System - Nixpkgs]
   - NixOS Manual: [nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]
2. `_module.args`:
   - NixOS Manual: [Appendix A. Configuration Options](https://nixos.org/manual/nixos/stable/options#opt-_module.args)
   - Source Code: [nixpkgs/nixos-25.05/lib/modules.nix - _module.args]

要するに、`specialArgs`と`_module.args`が必要とする値はどちらも属性セットであり、その機能も同じで、属性セット内のすべてのパラメータをすべてのサブモジュールに渡すことです。両者の違いは次のとおりです：

1. どのモジュールでも`_module.args`オプションを使用してパラメータを相互に渡すことができ、`nixpkgs.lib.nixosSystem`関数でのみ使用できる`specialArgs`よりも柔軟です。
2. `_module.args`はモジュール内で宣言して使用するため、すべてのモジュールが評価された後でなければ使用できません。これにより、**`imports = [ ... ];`で`_module.args`を介して渡されたパラメータを使用すると、`infinite recursion`エラーが発生します。この場合、代わりに`specialArgs`を使用する必要があります**。

私は個人的に`specialArgs`を好みます。なぜなら、よりシンプルで直接的で、使いやすいからです。また、`_xxx`のような命名スタイルは内部で使用されるもののように感じさせ、ユーザー設定ファイルでの使用にはあまり適していません。

ある依存関係をサブモジュールに渡して使用したい場合、`specialArgs`パラメータを使用して`inputs`をすべてのサブモジュールに渡すことができます：

```nix{13}
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
    another-input.url = "github:username/repo-name/branch-name";
  };

  outputs = inputs@{ self, nixpkgs, another-input, ... }: {
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";

      # すべてのinputsパラメータをすべてのサブモジュールの特別な引数として設定し、
      # これにより、サブモジュールでinputsのすべての依存関係を直接使用できるようになります
      specialArgs = { inherit inputs;};
      modules = [
        ./configuration.nix
      ];
    };
  };
}
```

または、`_module.args`オプションを使用しても同じ効果が得られます：

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
          # すべてのinputsパラメータをすべてのサブモジュールの特別な引数として設定し、
          # これにより、サブモジュールでinputsのすべての依存関係を直接使用できるようになります
          _module.args = { inherit inputs; };
        }
      ];
    };
  };
}
```

上記2つの方法のいずれかを選択して設定を変更すると、`/etc/nixos/configuration.nix`で`inputs`パラメータを使用できるようになります。モジュールシステムは`specialArgs`で定義された`inputs`を自動的に照合し、このパラメータを必要とするすべてのサブモジュールに注入します：

```nix{3}
# Nixは名前で照合し、
# specialArgs/_module.argsのinputsをこの関数の3番目のパラメータに自動的に注入します
{ config, pkgs, inputs, ... }:

# これで、以下でinputsパラメータを使用できます
{
  # ......
}
```

次のセクションでは、`specialArgs`/`_module.args`を使用して他のflakeソースからシステムソフトウェアをインストールする方法をデモします。

## 他のflakesからシステムソフトウェアをインストールする {#install-system-packages-from-other-flakes}

システム管理で最も一般的な要件はソフトウェアのインストールです。前のセクションでは、`environment.systemPackages`を使用して`pkgs`内のパッケージをインストールする方法を見ました。これらのパッケージはすべて公式のnixpkgsリポジトリからのものです。

ここでは、他のflakeソースからソフトウェアパッケージをインストールする方法を学びます。これは、nixpkgsから直接インストールするよりもはるかに柔軟で、主な用途は、Nixpkgsにまだ追加または更新されていないソフトウェアの最新バージョンをインストールすることです。

[helix](https://github.com/helix-editor/helix)エディタを例に、helixのmasterブランチを直接コンパイルしてインストールする方法を示します。

まず、`flake.nix`にhelixというinputsデータソースを追加します：

```nix{6,12,18}
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";

    # helix editor, use the master branch
    helix.url = "github:helix-editor/helix/master";
  };

  outputs = inputs@{ self, nixpkgs, ... }: {
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      specialArgs = { inherit inputs;};
      modules = [
        ./configuration.nix

        # 以下のモジュールは前の`specialArgs`パラメータと機能的に同じです
        # どちらか一方を選択してください
        # { _module.args = { inherit inputs; };}
      ];

    };
  };
}
```

次に、`configuration.nix`でこのflake inputデータソースを参照できます：

```nix{1,10}
{ config, pkgs, inputs, ... }:
{
  # 無関係な設定を省略......
  environment.systemPackages = with pkgs; [
    git
    vim
    wget
    # ここで、helixプログラムはhelixというinputsデータソースからインストールされます
    inputs.helix.packages."${pkgs.system}".helix
  ];
  # 他の設定を省略......
}
```

変更後、`sudo nixos-rebuild switch`でデプロイすると、Helixプログラムがインストールされます。今回のデプロイは、NixがソースからHelixプログラム全体をコンパイルするため、通常よりもかなり時間がかかります。

デプロイが完了したら、ターミナルで`hx`コマンドを使用して直接テストおよび検証できます。

また、Helixの最新バージョンを試してみてから、実際にシステムにインストールするかどうかを決めたい場合は、もっと簡単な方法があります。1行のコマンドで済みます（ただし、前述のように、ソースからのコンパイルには時間がかかります）：

```bash
nix run github:helix-editor/helix/master
```

`nix run`の使用方法については、後の[新世代Nixコマンドラインツールの使用](../other-usage-of-flakes/the-new-cli.md)で詳しく説明します。

## 他のFlakesパッケージが提供する機能の使用

実際、これがFlakesの最も主要な機能です。あるFlakeは他のFlakeに依存し、それらが提供する機能を使用できます——ちょうどTypeScript/Go/Rustなどのプログラムを書くときに他のライブラリが提供する機能を使用するのと同じです。

上記のHelixの公式Flakeが提供する最新バージョンを使用する例がそれです。他の多くの使用例は後で触れますが、ここでは後で説明するいくつかの例を引用します：

- [Home Manager入門](./start-using-home-manager.md): ここでは、コミュニティのHome-Managerを依存関係として導入し、そのFlakeが提供する機能を直接使用できるようにします。
- [パッケージのダウングレードまたはアップグレード](./downgrade-or-upgrade-packages.md): ここでは、異なるバージョンのNixpkgsを依存関係として導入し、異なるバージョンのNixpkgsからパッケージを柔軟に選択できるようにします。

## その他のFlakes学習資料

ここまでで、Flakesを使用してNixOSシステムを設定する方法を学びました。Flakesについてさらに疑問がある場合や、深く学びたい場合は、以下の公式/半公式ドキュメントを直接参照してください。

- Nix Flakesの公式ドキュメント：
  - [Nix flakes - Nix Manual](https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake)
  - [Flakes - nix.dev](https://nix.dev/concepts/flakes)
- Eelco Dolstra（Nixの作成者）によるFlakesに関する一連の記事：
  - [Nix Flakes, Part 1: An introduction and tutorial (Eelco Dolstra, 2020)](https://www.tweag.io/blog/2020-05-25-flakes/)
  - [Nix Flakes, Part 2: Evaluation caching (Eelco Dolstra, 2020)](https://www.tweag.io/blog/2020-06-25-eval-cache/)
  - [Nix Flakes, Part 3: Managing NixOS systems (Eelco Dolstra, 2020)](https://www.tweag.io/blog/2020-07-31-nixos-flakes/)
- その他役立つ可能性のあるドキュメント：
  - [Practical Nix Flakes](https://serokell.io/blog/practical-nix-flakes)

[nix flake - Nix Manual]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake#flake-inputs
[nixpkgs/flake.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/flake.nix
[nixpkgs/nixos/lib/eval-config.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/lib/eval-config.nix
[Module System - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md
[nixpkgs/nixos-25.05/lib/modules.nix - _module.args]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/lib/modules.nix#L122-L184
[nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-types.section.md?plain=1#L237-L244
