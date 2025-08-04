# モジュールシステムとカスタムoptions {#module-system}

NixOSやHome Managerの設定では、さまざまな`options`の値を設定してシステムを構成します。これらの`options`は、以下の場所で定義されています：

- NixOS:
  [nixpkgs/nixos/modules](https://github.com/NixOS/nixpkgs/tree/25.05/nixos/modules)（<https://search.nixos.org/options>で全NixOS optionsを検索可能）
- Home Manager:
  [home-manager/modules](https://github.com/nix-community/home-manager/blob/release-25.05/modules)（<https://nix-community.github.io/home-manager/options.xhtml>で全optionsを検索可能）

> nix-darwinを使う場合も同様で、[nix-darwin/modules](https://github.com/LnL7/nix-darwin/tree/master/modules)にモジュール実装があります。

これらNixOS ModulesやHome Manager Modulesの基盤は、Nixpkgsで実装されている共通モジュールシステム[lib/modules.nix][lib/modules.nix]です。公式ドキュメントは以下ですが、NixOSに慣れている人でも理解は簡単ではありません：

- [Module System - Nixpkgs]

Nixpkgsのモジュールシステムのドキュメントが未整備なため、ドキュメント内では別のNixOSモジュール執筆ガイドを読むことが推奨されています。こちらの方が分かりやすいですが、初心者にはやや難しいかもしれません：

- [Writing NixOS Modules - Nixpkgs]

要するに、モジュールシステムはNixpkgsで実装されており、Nixパッケージマネージャ自体の一部ではありません。そのため、ドキュメントもNixパッケージマネージャのものではなく、Nixpkgs側にあります。NixOSやHome ManagerはどちらもNixpkgsのモジュールシステムを基盤としています。

## モジュールシステムのメリット {#what-is-module-system}

一般ユーザーとしては、NixOSやHome Managerのoptionsを使うだけで大抵の要件は満たせます。では、モジュールシステムを深く学ぶメリットは何でしょうか？

前章で設定のモジュール化を紹介した際、ポイントは「設定を複数のモジュールに分割し、`imports = [ ... ];`でまとめて読み込む」ことでした。これがモジュールシステムの基本的な使い方です。しかし、単に`imports = [ ... ];`を使うだけでは、各モジュールの設定をそのまま取り込むだけで柔軟性に欠けます。設定がシンプルな場合は十分ですが、複雑になると限界があります。

例として、A・B・C・Dの4台のNixOSマシンを1つの設定で管理したいとします。できるだけ重複を減らしつつ、以下の要件を満たしたい：

- A・B・C・Dすべてでdockerサービスを有効化し、自動起動
- Aだけdockerのストレージドライバをbtrfsに変更
- B・Cは中国国内のサーバーなのでdockerのミラー設定を追加
- Cは米国サーバーで特に追加設定なし
- DはデスクトップでdockerのHTTPプロキシ設定を追加

`imports`だけで実現しようとすると、設定を以下のように分割し、各マシンで異なるモジュールを読み込む必要があります：

```bash
› tree
.
├── docker-default.nix  # 基本docker設定（自動起動含む）
├── docker-btrfs.nix    # docker-default.nixをimportし、ストレージドライバをbtrfsに
├── docker-china.nix    # docker-default.nixをimportし、ミラー設定を追加
└── docker-proxy.nix    # docker-default.nixをimportし、HTTPプロキシ設定を追加
```

このような構成は冗長に感じるかもしれません。これはまだ単純な例ですが、マシンが増えたり設定の差異が大きくなると、冗長さがより顕著になります。

この冗長さを解消するには、カスタムoptionsを定義するなど、他の手法が必要です。

モジュールシステムの詳細に進む前に強調しておきますが、以下の内容は必須ではありません。多くのNixOSユーザーはカスタムoptionsを一切定義せず、`imports`だけで十分な場合も多いです。初心者の方は、`imports`だけで解決できない課題に直面したときに、必要に応じて学ぶのでも問題ありません。

## 基本構造と使い方 {#basic-structure-and-usage}

Nixpkgsで定義されるモジュールの基本構造は以下の通りです：

```nix
{ config, pkgs, ... }:
{
  imports =
    [ # ここに他のモジュールをimport
    ];

  options = {
    # ...
  };

  config = {
    # ...
  };
}
```

`imports = [ ... ];`はすでにおなじみですが、他の2つの部分について簡単に説明します：

- `options = { ... };`：プログラミング言語でいう変数宣言のようなもので、設定可能なオプションを宣言します。
- `config = { ... };`：宣言したoptionsに値を割り当てます。

典型的な使い方は、同じモジュール内で`options`で宣言したオプションに、`config`で値を割り当てる形です。

例：

```nix
# ./foo.nix
{ config, lib, pkgs, ... }:

with lib;

let
  cfg = config.programs.foo;
in {
  options.programs.foo = {
    enable = mkEnableOption "the foo program";
    package = mkOption {
      type = types.package;
      default = pkgs.hello;
      defaultText = literalExpression "pkgs.hello";
      description = "fooで使うパッケージ";
    };
    extraConfig = mkOption {
      default = "";
      example = ''
        foo bar
      '';
      type = types.lines;
      description = ''
        foo用の追加設定
      '';
    };
  };

  config = mkIf cfg.enable {
    home.packages = [ cfg.package ];
    xdg.configFile."foo/foorc" = mkIf (cfg.extraConfig != "") {
      text = ''
        # Home Managerによる自動生成
        ${cfg.extraConfig}
      '';
    };
  };
}
```

このモジュールでは3つの`options`を定義しています：

- `programs.foo.enable`：このモジュールを有効化するかどうか
- `programs.foo.package`：fooで使うパッケージ（バージョンやビルドパラメータの切り替えなど）
- `programs.foo.extraConfig`：fooの設定ファイル内容

`config`では、これらの値に応じて設定を行います。

- `programs.foo.enable`が`false`または未定義なら何もしません（`lib.mkIf`で実現）
- それ以外の場合、`programs.foo.package`を`home.packages`に追加し、`programs.foo.extraConfig`の内容を`~/.config/foo/foorc`に書き込みます

このように、別のnixファイルからこのモジュールをimportし、optionsの値を設定することで柔軟なカスタマイズが可能です。

```nix
# ./bar.nix
{ config, lib, pkgs, ... }:
{
  imports = [
    ./foo.nix
  ];
  programs.foo ={
    enable = true;
    package = pkgs.hello;
    extraConfig = ''
      foo baz
    '';
  };
}
```

この例では、optionsへの値の割り当ては**省略記法**です。モジュール内で定義（`config`）のみ、宣言（`option`）や他の特殊パラメータがなければ、`config`ラッパーを省略して直接書くこともできます。

## モジュールシステムの値割り当てと遅延評価 {#module-system-assignment-and-lazy-evaluation}

モジュールシステムはNixの遅延評価を活用しており、これがパラメータ化設定の鍵となっています。

簡単な例：

```nix
# ./flake.nix
{
  description = "NixOS Flake for Test";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";

  outputs = {nixpkgs, ...}: {
    nixosConfigurations = {
      "test" = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ({config, lib, ...}: {
            options = {
              foo = lib.mkOption {
                default = false;
                type = lib.types.bool;
              };
            };

            # 正常例1
            config.warnings = if config.foo then ["foo"] else [];

            # 無限再帰例（エラー）
            # config = if config.foo then { warnings = ["foo"];} else {};

            # 正常例2
            # config = lib.mkIf config.foo {warnings = ["foo"];};
          })
        ];
      };
    };
  };
}
```

この設定の`config.warnings`は`config.foo`の値に依存していますが、実装方法によっては無限再帰エラーになります。`lib.mkIf`を使うことで遅延評価を活かし、正しく動作させることができます。

Nixpkgsのモジュールシステムには、`lib.mkIf`のようなパラメータ化や柔軟な合成を実現する関数が多数用意されています：

1. `lib.mkIf`：条件付きで値を合成
2. `lib.mkOverride` / `lib.mkDefault` / `lib.mkForce`：優先度付きの値合成（前章「モジュール化」参照）
3. `lib.mkOrder`, `lib.mkBefore`, `lib.mkAfter`：合成順序の制御
4. [Option Definitions - NixOS][Option Definitions - NixOS]でさらに多くの関数を確認できます

## optionsの宣言と型チェック {#option-declarations-and-type-checking}

値の割り当ては最もよく使う機能ですが、カスタムoptionsを定義したい場合は宣言や型チェックも理解しておく必要があります。

これは比較的シンプルで、[Option Declarations - NixOS][Option Declarations - NixOS]や[Options Types - NixOS][Options Types - NixOS]の公式ドキュメントを参照すれば大まかに理解できます。

## 非デフォルトパラメータのモジュールシステムへの伝播 {#pass-non-default-parameters-to-the-module-system}

[FlakesでNixOSを管理する](../nixos-with-flakes/nixos-with-flakes-enabled.md#pass-non-default-parameters-to-submodules)で紹介した通り、`specialArgs`や`_module.args`を使って追加パラメータを他のモジュール関数に渡すことができます。

## モジュールの条件付きimport {#selectively-import-modules}

前述の例では、カスタムoptionsで機能の有効・無効を切り替えましたが、モジュールが複数ファイルに分かれている場合はどうすればよいでしょうか。

まず、よくある誤用例を紹介し、その後で正しい使い方を説明します。

### 誤用例1 - `config = { ... };`内で`imports`を使う {#wrong-usage-1}

最初に思いつくのは、`config = { ... };`内で`imports`を使うことかもしれません：

```nix
# ./flake.nix
{
  description = "NixOS Flake for Test";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";

  outputs = {nixpkgs, ...}: {
    nixosConfigurations = {
      "test" = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ({config, lib, ...}: {
            options = {
              foo = lib.mkOption {
                default = false;
                type = lib.types.bool;
              };
            };

            config = lib.mkIf config.foo {
              # config内でimportsを使うとエラー
              imports = [
                {warnings = ["foo"];}
                # ...他のモジュールやファイルパス
              ];
            };
          })
        ];
      };
    };
  };
}
```

このような書き方は動作しません。`nix eval .#nixosConfigurations.test.config.warnings`を実行すると、`error: The option 'imports' does not exist.`というエラーになります。

これは、`config`は通常のattribute setであり、`imports`はモジュールシステムの特殊パラメータだからです。`config.imports`というoptionは存在しません。

### 正しい使い方1 - 必要な条件でimportする各モジュールにoptionsを定義する {#correct-usage-1}

最も推奨される方法です。NixOSシステムのモジュールはこの方式で実装されています。<https://search.nixos.org/options>で`enable`を検索すると、多くのモジュールが`enable` optionで有効・無効を切り替えられることが分かります。

具体的な書き方は前述の[基本構造と使い方](#basic-structure-and-usage)で紹介した通りです。

この方法の欠点は、条件付きimportしたいすべてのNixモジュールを改造し、設定宣言を`config = { ... };`ブロックに移す必要があることです。コードが複雑になり、初心者にはやや難しいかもしれません。

### 正しい使い方2 - `imports = [];`内で`lib.optionals`を使う {#correct-usage-2}

この方法の主な利点は、前述の方法よりもシンプルで、モジュールの内容を変更する必要がありません。`imports`内で`lib.optionals`を使って、条件に応じてモジュールをimportできます。

> `lib.optionals`の詳細は<https://noogle.dev/f/lib/optionals>を参照してください。

例：

```nix
# ./flake.nix
{
  description = "NixOS Flake for Test";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";

  outputs = {nixpkgs, ...}: {
    nixosConfigurations = {
      "test" = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        specialArgs = { enableFoo = true; };
        modules = [
          ({config, lib, enableFoo ? false, ...}: {
            imports =
              [
                 # 他のモジュール
              ]
              # lib.optionalsでfoo.nixを条件付きimport
              ++ (lib.optionals (enableFoo) [./foo.nix]);
          })
        ];
      };
    };
  };
}
```

```nix
# ./foo.nix
{ warnings = ["foo"];}
```

この2つのnixファイルを同じディレクトリに保存し、`nix eval .#nixosConfigurations.test.config.warnings`を実行すると、正常に動作します：

```bash
› nix eval .#nixosConfigurations.test.config.warnings
[ "foo" ]
```

注意点として、**`imports = [ ... ];`内で`_module.args`で渡したパラメータは使えません**。前述の[非デフォルトパラメータのモジュールシステムへの伝播](../nixos-with-flakes/nixos-flake-and-module-system#pass-non-default-parameters-to-submodules)で詳しく説明しています。

## 参考

- [Best resources for learning about the NixOS module system? - Discourse](https://discourse.nixos.org/t/best-resources-for-learning-about-the-nixos-module-system/1177/4)
- [NixOS modules - NixOS Wiki](https://wiki.nixos.org/wiki/NixOS_modules)
- [NixOS: config argument - NixOS Wiki](https://wiki.nixos.org/wiki/NixOS:config_argument)
- [Module System - Nixpkgs][Module System - Nixpkgs]
- [Writing NixOS Modules - Nixpkgs][Writing NixOS Modules - Nixpkgs]

[lib/modules.nix]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/lib/modules.nix#L995
[Module System - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md
[Writing NixOS Modules - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/writing-modules.chapter.md
[Option Definitions - NixOS]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-def.section.md
[Option Declarations - NixOS]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-declarations.section.md
[Options Types - NixOS]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-types.section.md
