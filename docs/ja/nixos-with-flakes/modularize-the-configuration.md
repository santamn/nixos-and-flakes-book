# 設定のモジュール化 {#modularize-nixos-configuration}

ここまででシステムの骨組みについてはほぼ設定完了です。現在の `/etc/nixos` 内のシステム設定の構造は次のようになっているはずです:

```
$ tree
.
├── flake.lock
├── flake.nix
├── home.nix
└── configuration.nix
```

これら4つのファイルの機能はそれぞれ次のとおりです:

- `flake.lock`: 自動で生成されるバージョンロック用ファイル。flake 全体のすべての入力データソース、ハッシュ値、バージョン番号を記録し、システムの再現性を担保します。
- `flake.nix`: flake のエントリポイントファイル。`sudo nixos-rebuild switch` を実行すると認識され、デプロイされます。
  - `flake.nix` の全てのオプションについては [Flakes - NixOS Wiki](https://wiki.nixos.org/wiki/Flakes) を参照してください。
- `configuration.nix`: 現段階ではすべてのシステムレベルの設定が書かれているファイルで、`flake.nix` で Nix モジュールとしてインポートされています。
  - `configuration.nix` の全てのオプションについては [Configuration - NixOS Manual](https://nixos.org/manual/nixos/unstable/index.html#ch-configuration) を参照してください。
- `home.nix`: `flake.nix` で Home Manager によって `ryan` ユーザーの設定としてインポートされ、`ryan` の全ての設定とホームディレクトリを管理しています。
  - `home.nix` のすべてのオプションについては [Appendix A. Configuration Options - Home Manager](https://nix-community.github.io/home-manager/options.xhtml) を参照してください。

これらの設定ファイルを変更することで、システムとホームディレクトリの状態を宣言的に変更できます。しかし、`configuration.nix` と `home.nix` だけに頼っていると、設定が増えるにつれて設定ファイルが肥大化し、メンテナンスが困難になります。この問題の解決策は、Nix モジュールを使って設定ファイルを複数のモジュールに分割し、体系的に管理することです。

Nix 言語は [`import`関数](https://nix.dev/tutorials/nix-language.html#import) を提供しており、これには特別なルールがあります:

> `import` の引数がフォルダパスの場合、`import` 関数はそのフォルダ内の `default.nix` の実行結果を返します。

Nixpkgs モジュールシステムは、これと似た `imports` パラメータを提供しており、これは `.nix` ファイルのリストを受け取って、そのリスト内のすべての設定を現在の Nix モジュールに**マージ**するものです。

ここで、`imports` が単に重複する設定項目を上書きするのではなく、より合理的に処理するということに留意してください。例えば、複数のモジュールで `program.packages = [...]` が定義されている場合、`imports` はすべての Nix モジュールで定義された `program.packages` を1つのリストにマージします。リストだけでなく、attribute set も同様に正しくマージされます。具体的な挙動についてはご自身で検証してみてください。

> [Nixpkgs-Unstable Official Manual - evalModules Parameters](https://nixos.org/manual/nixpkgs/unstable/#module-system-lib-evalModules-parameters) で `imports` について私が見つけた唯一の説明は次のとおりでした: `A list of modules. These are merged together to form the final configuration.` あとは察してね、ということなんでしょうか...（Nix のドキュメントは本当に...こんなに重要なパラメータのドキュメントがこれだけなんて...）

`imports` を使用することで、`home.nix` と `configuration.nix` を複数の Nix モジュールに分割し、それぞれを異なる `.nix` ファイルに定義することが可能になります。例として、`packages.nix` モジュールを見てみましょう:

```nix
{
  config,
  pkgs,
  ...
}: {
  imports = [
    (import ./special-fonts-1.nix {inherit config pkgs;}) # (1)
    ./special-fonts-2.nix                                 # (2)
  ];

  fontconfig.enable = true;
}
```

このモジュールは、imports セクションで `special-fonts-1.nix` と`special-fonts-2.nix` という2つの他のモジュールを読み込んでいます。これらのファイル自体もモジュールであり、以下のような構造になっています。

```nix
{ config, pkgs, ...}: {
    # 設定項目...
}
```

上記の2つの import 文は、同じパラメータを受け取ります:

- `(1)` は `special-fonts-1.nix` 内の関数をインポートし、`{config = config; pkgs = pkgs}` という引数を渡して呼び出します。基本的には、呼び出し結果（attribute set 形式の部分的な設定）を `imports` リスト内で使用しています。
- `(2)` ではモジュールへのパスを指定しており、Nix がシステム構成 `config` を組み立てる際にこのモジュールの関数が自動的に読み込まれます。そして、`packages.nix` の関数の引数のうち名前が一致するものはすべて、ここで読み込まれる `special-fonts-2.nix` の関数に渡されるので、結果として `import ./special-fonts-2.nix {config = config; pkgs = pkgs}` という呼び出しが行われます。

設定のモジュール化を始めるにあたって優れた例をご紹介します。ぜひ参考にしてください:

- [Misterio77/nix-starter-configs](https://github.com/Misterio77/nix-starter-configs)

もう少し複雑な例として、私が以前使用していた i3 ウィンドウマネージャ搭載の NixOS システムの設定 [ryan4yin/nix-config/i3-kickstarter](https://github.com/ryan4yin/nix-config/tree/i3-kickstarter) があります。以下にそのディレクトリ構造を示します:

```shell
├── flake.lock
├── flake.nix
├── home
│   ├── default.nix         # ここで imports = [...] を使ってすべてのサブモジュールをインポート
│   ├── fcitx5              # fcitx5 入力メソッドの設定
│   │   ├── default.nix
│   │   └── rime-data-flypy
│   ├── i3                  # i3 ウィンドウマネージャの設定
│   │   ├── config
│   │   ├── default.nix
│   │   ├── i3blocks.conf
│   │   ├── keybindings
│   │   └── scripts
│   ├── programs
│   │   ├── browsers.nix
│   │   ├── common.nix
│   │   ├── default.nix   # ここで imports = [...] を使って programs フォルダのすべてのモジュールをインポート
│   │   ├── git.nix
│   │   ├── media.nix
│   │   ├── vscode.nix
│   │   └── xdg.nix
│   ├── rofi              #  rofi ランチャーの設定
│   │   ├── configs
│   │   │   ├── arc_dark_colors.rasi
│   │   │   ├── arc_dark_transparent_colors.rasi
│   │   │   ├── power-profiles.rasi
│   │   │   ├── powermenu.rasi
│   │   │   ├── rofidmenu.rasi
│   │   │   └── rofikeyhint.rasi
│   │   └── default.nix
│   └── shell             # シェル・ターミナル関連の設定
│       ├── common.nix
│       ├── default.nix
│       ├── nushell
│       │   ├── config.nu
│       │   ├── default.nix
│       │   └── env.nu
│       ├── starship.nix
│       └── terminals.nix
├── hosts
│   ├── msi-rtx4090      # メインマシンの設定
│   │   ├── default.nix  # これは以前の configuration.nix ですが、ほとんどの内容はモジュールに分割されています
│   │   └── hardware-configuration.nix  # NixOS インストール時に自動生成されるハードウェア・ディスク関連の設定
│   └── my-nixos       # テスト用マシンの設定
│       ├── default.nix
│       └── hardware-configuration.nix
├── modules          # 再利用可能な NixOS モジュール
│   ├── i3.nix
│   └── system.nix
└── wallpaper.jpg    # 壁紙
```

必ずしも上記の構造に従う必要はありませんので、ご自身の好みに合わせて自由に設定を整理してください。重要なのは、サブモジュールをすべてメインモジュールにインポートするために `imports` を使うということです。

## `lib.mkOverride`, `lib.mkDefault`, `lib.mkForce`

Nix で `lib.mkDefault` や `lib.mkForce` を使って値を定義している人を見かけることがあるかもしれません。これらの名前が示すように、`lib.mkDefault` や `lib.mkForce` はオプションのデフォルト値を設定したり、オプションの値を強制的に設定したりするために使用されます。

この説明だけでは理解しづらいかもしれません。公式ドキュメントにもこれらの関数についての詳細な解説はほとんどありません。最も手っ取り早く理解する方法は、直接ソースコードを読むことです。

`nix repl -f '<nixpkgs>'` を実行して `:e lib.mkDefault` と入力すると、`lib.mkDefault` と `lib.mkForce` のソースコードを見ることができます。`nix repl` について知りたい場合は、`:?`と入力してヘルプ情報を参照してください。

ソースコードの抜粋は以下のとおりです:

```nix
  # ......

  mkOverride = priority: content:
    { _type = "override";
      inherit priority content;
    };

  mkOptionDefault = mkOverride 1500;    # オプションのデフォルトでの優先度
  mkDefault = mkOverride 1000;          # 非ユーザーモジュールの設定セクションでのデフォルト値
  mkImageMediaOverride = mkOverride 60; # イメージ用の Profiles がホスト設定を上書きでき、かつユーザーが mkForce でさらに上書き可能な優先度
  mkForce = mkOverride 50;
  mkVMOverride = mkOverride 10;         # `nixos-rebuild build-vm`で使用

  # ......
```

要約すると、内部的な優先度が1000の `lib.mkDefault` はオプションのデフォルト値を設定するために使用されるもので、内部的な優先度が50の `lib.mkForce` はオプションの値を強制的に設定するために使用されます。オプションの値を直接設定する場合、その優先度は `lib.mkDefault` と同じ1000になります。

`priority` の値が低いほど、実際の優先度は高くなります。したがって、`lib.mkForce` の優先度は `lib.mkDefault` よりも高くなります。同じ優先度の値を複数定義すると、Nix はエラーを投げます。

これらの関数は、設定をモジュール化する際に非常に便利です。なぜなら、低レベルのモジュール（ベースモジュール）でデフォルト値を設定し、高レベルのモジュールでより高い優先度の値を設定できるからです。

例として、私はこのようにデフォルト値を定義しています: [ryan4yin/nix-config/blob/c515ea9/modules/nixos/core-server.nix](https://github.com/ryan4yin/nix-config/blob/c515ea9/modules/nixos/core-server.nix#L32)

```nix{6}
{ lib, pkgs, ... }:

{
  # ......

  nixpkgs.config.allowUnfree = lib.mkDefault false;

  # ......
}
```

そして、デスクトップの設定で次のようにデフォルト値を上書きしています: [ryan4yin/nix-config/blob/c515ea9/modules/nixos/core-desktop.nix](https://github.com/ryan4yin/nix-config/blob/c515ea9/modules/nixos/core-desktop.nix#L18)

```nix{10}
{ lib, pkgs, ... }:

{
  # ベースモジュールをインポート
  imports = [
    ./core-server.nix
  ];

  # ベースモジュールで定義されたデフォルト値を上書き
  nixpkgs.config.allowUnfree = lib.mkForce true;

  # ......
}
```

## `lib.mkOrder`, `lib.mkBefore`, `lib.mkAfter`

`lib.mkDefault` と `lib.mkForce` に加えて、`lib.mkBefore` や `lib.mkAfter` は**リスト型**のオプションのマージ順序を設定するために使用されます。これらの関数を使うことで、設定のモジュール化がいっそう促進されます。

> リスト型のオプションに関する公式ドキュメントは見つかりませんでしたが、私はシンプルにマージ結果がマージの順序に依存する型だと理解しています。この理解に基づくと、`list` 型と `string` 型はどちらもリスト型のオプションであり、実際にこれらの関数はこの両方の型について使用できます。

前述のように、同じ**上書き優先度**の値を複数定義すると、Nix はエラーを出します。しかし、`lib.mkOrder`, `lib.mkBefore`, `lib.mkAfter` のいずれかを使うことで同じ上書き優先度をもつ複数の値を定義できるようになり、これらは指定された順序でマージされます。

まずソースコードを見てみましょう。`lib.mkBefore` のソースコードを確認するには、`nix repl -f <nixpkgs>` を実行し、`:e lib.mkBefore` と入力してください。`nix repl` について知りたい場合は、`:?` と入力してヘルプ情報を参照してください:

```nix
  # ......

  mkOrder = priority: content:
    { _type = "order";
      inherit priority content;
    };

  mkBefore = mkOrder 500;
  defaultOrderPriority = 1000;
  mkAfter = mkOrder 1500;

  # ......
```

`lib.mkBefore` は `lib.mkOrder 500` の略記であり、`lib.mkAfter` は `lib.mkOrder 1500` の略記であることがわかります。

`lib.mkBefore` と `lib.mkAfter` の使い方を確かめるために、簡単な Flake プロジェクトを作成してみましょう。

```nix{10-38}
# flake.nix
{
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  outputs = {nixpkgs, ...}: {
    nixosConfigurations = {
      "my-nixos" = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";

        modules = [
          ({lib, ...}: {
            programs.bash.shellInit = lib.mkBefore ''
              echo 'insert before default'
            '';
            programs.zsh.shellInit = lib.mkBefore "echo 'insert before default';";
            nix.settings.substituters = lib.mkBefore [
              "https://nix-community.cachix.org"
            ];
          })

          ({lib, ...}: {
            programs.bash.shellInit = lib.mkAfter ''
              echo 'insert after default'
            '';
            programs.zsh.shellInit = lib.mkAfter "echo 'insert after default';";
            nix.settings.substituters = lib.mkAfter [
              "https://ryan4yin.cachix.org"
            ];
          })

          ({lib, ...}: {
            programs.bash.shellInit = ''
              echo 'this is default'
            '';
            programs.zsh.shellInit = "echo 'this is default';";
            nix.settings.substituters = [
              "https://nix-community.cachix.org"
            ];
          })
        ];
      };
    };
  };
}
```

上の flake には、複数行文字列と単一行文字列とリストについて `lib.mkBefore` と `lib.mkAfter` を適用する例が書かれています。結果をテストしてみましょう:

```bash
# 例1：複数行文字列のマージ
› echo $(nix eval .#nixosConfigurations.my-nixos.config.programs.bash.shellInit)
trace: warning: system.stateVersion is not set, defaulting to 25.05. Read why this matters on https://nixos.org/manual/nixos/stable/options.html#opt-system.stateVersio
n.
"echo 'insert before default'

echo 'this is default'

if [ -z \"$__NIXOS_SET_ENVIRONMENT_DONE\" ]; then
 . /nix/store/60882lm9znqdmbssxqsd5bgnb7gybaf2-set-environment
fi



echo 'insert after default'
"

# 例2：単一行文字列のマージ
› echo $(nix eval .#nixosConfigurations.my-nixos.config.programs.zsh.shellInit)
"echo 'insert before default';
echo 'this is default';
echo 'insert after default';"

# 例3：リストのマージ
› nix eval .#nixosConfigurations.my-nixos.config.nix.settings.substituters
[ "https://nix-community.cachix.org" "https://nix-community.cachix.org" "https://cache.nixos.org/" "https://ryan4yin.cachix.org" ]

```

ご覧のように、`lib.mkBefore` と `lib.mkAfter` を使うことで、
複数行文字列、単一行文字列、およびリストのマージ順序を定義できます。

> モジュールシステムについてより詳しく知りたい場合は [モジュールシステムとカスタムオプション](../other-usage-of-flakes/module-system.md) を参照してください。

## References

- [Nix modules: Improving Nix's discoverability and usability ](https://cfp.nixcon.org/nixcon2020/talk/K89WJY/)
- [Module System - Nixpkgs](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md)
