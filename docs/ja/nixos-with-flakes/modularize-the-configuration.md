# NixOS設定のモジュール化 {#modularize-nixos-configuration}

ここまでで、システム全体の骨格はほぼ設定完了です。現在の`/etc/nixos`内のシステム設定構造は次のようになっているはずです：

```
$ tree
.
├── flake.lock
├── flake.nix
├── home.nix
└── configuration.nix
```

以下に、これら4つのファイルの機能をそれぞれ説明します：

- `flake.lock`: 自動生成されるバージョンロックファイルで、flake全体のすべての入力データソース、ハッシュ値、バージョン番号を記録し、システムの再現性を保証します。
- `flake.nix`: flakeのエントリポイントファイルで、`sudo nixos-rebuild switch`を実行すると認識され、デプロイされます。
- `configuration.nix`: flake.nixでシステムモジュールとしてインポートされ、現在すべてのシステムレベルの設定がこのファイルに記述されています。
  - この設定ファイルのすべてのオプションについては、公式ドキュメント[Configuration - NixOS Manual](https://nixos.org/manual/nixos/unstable/index.html#ch-configuration)を参照してください。
- `home.nix`: flake.nixでhome-managerによってryanユーザーの設定としてインポートされます。つまり、ryanというユーザーのすべてのHome Manager設定が含まれており、そのホームフォルダを管理します。
  - この設定ファイルのすべてのオプションについては、[Appendix A. Configuration Options - Home Manager](https://nix-community.github.io/home-manager/options.xhtml)を参照してください。

上記の設定ファイルを変更することで、システムとホームディレクトリの状態を変更できます。しかし、設定が増えるにつれて、`configuration.nix`と`home.nix`だけに頼っていると、設定ファイルが肥大化し、メンテナンスが困難になります。より良い解決策は、Nixのモジュールメカニズムを使用して、設定ファイルを複数のモジュールに分割し、分類して記述・メンテナンスすることです。

Nix言語は[`import`関数](https://nix.dev/tutorials/nix-language.html#import)を提供しており、これには特別なルールがあります：

> `import`の引数がフォルダパスの場合、そのフォルダ内の`default.nix`ファイルの実行結果を返します。

Nixpkgsモジュールシステムは、それに似た`imports`パラメータを提供しており、`.nix`ファイルのリストを受け取り、そのリスト内のすべての設定を現在の属性セットに**マージ**（Merge）します。

ここでの言葉遣いは「**マージ**」であることに注意してください。これは、`imports`が重複する設定項目に遭遇した場合、実行順に単純に上書きするのではなく、より合理的に処理することを示しています。例えば、複数のモジュールで`program.packages = [...]`を定義した場合、`imports`はすべてのモジュール内の`program.packages`というリストをマージします。リストだけでなく、属性セットも正しくマージできます。具体的な動作は、読者の皆様で探求してみてください。

> 私は[nixpkgs-unstable公式マニュアル - evalModules parameters](https://nixos.org/manual/nixpkgs/unstable/#module-system-lib-evalModules-parameters)で`imports`に関する記述を一つだけ見つけました：`A list of modules. These are merged together to form the final configuration.`、意図を汲み取ってください...（Nixのドキュメントは本当に...こんなに重要なパラメータのドキュメントがこれだけなんて...）

`imports`パラメータを利用して、`home.nix`と`configuration.nix`を複数の`.nix`ファイルに分割することができます。

モジュール化された設定の非常に良い例として、以下を参考にしてください：

- [Misterio77/nix-starter-configs](https://github.com/Misterio77/nix-starter-configs)

もう少し複雑な例として、以下は私が以前使用していたi3wm設定のディレクトリ構造です[ryan4yin/nix-config/i3-kickstarter](https://github.com/ryan4yin/nix-config/tree/i3-kickstarter)：

```shell
├── flake.lock
├── flake.nix
├── home
│   ├── default.nix         # ここでimports = [...]を使ってすべてのサブモジュールをインポート
│   ├── fcitx5              # fcitx5中国語入力メソッドの設定、私はカスタムの小鶴音形入力メソッドを使用
│   │   ├── default.nix
│   │   └── rime-data-flypy
│   ├── i3                  # i3wmデスクトップ設定
│   │   ├── config
│   │   ├── default.nix
│   │   ├── i3blocks.conf
│   │   ├── keybindings
│   │   └── scripts
│   ├── programs
│   │   ├── browsers.nix
│   │   ├── common.nix
│   │   ├── default.nix   # ここでimports = [...]を使ってprogramsディレクトリ内のすべてのnixファイルをインポート
│   │   ├── git.nix
│   │   ├── media.nix
│   │   ├── vscode.nix
│   │   └── xdg.nix
│   ├── rofi              #  rofiアプリケーションランチャー設定、i3wmで設定したショートカットキーでトリガー
│   │   ├── configs
│   │   │   ├── arc_dark_colors.rasi
│   │   │   ├── arc_dark_transparent_colors.rasi
│   │   │   ├── power-profiles.rasi
│   │   │   ├── powermenu.rasi
│   │   │   ├── rofidmenu.rasi
│   │   │   └── rofikeyhint.rasi
│   │   └── default.nix
│   └── shell             # シェル端末関連の設定
│       ├── common.nix
│       ├── default.nix
│       ├── nushell
│       │   ├── config.nu
│       │   ├── default.nix
│       │   └── env.nu
│       ├── starship.nix
│       └── terminals.nix
├── hosts
│   ├── msi-rtx4090      # PCホストの設定
│   │   ├── default.nix                 # これは以前のconfiguration.nixですが、ほとんどの内容はモジュールに分割されています
│   │   └── hardware-configuration.nix  # システムハードウェア関連の設定、nixosインストール時に自動生成
│   └── my-nixos       # テスト用の仮想マシン設定
│       ├── default.nix
│       └── hardware-configuration.nix
├── modules          # configuration.nixから分割されたいくつかの共通設定
│   ├── i3.nix
│   └── system.nix
└── wallpaper.jpg    # デスクトップの壁紙、i3wm設定で参照
```

Nix Flakesはディレクトリ構造に何の要件もありません。上記の例を参考に、自分に合ったディレクトリ構造を模索することができます。重要なのは、`imports`パラメータを使って他の`.nix`ファイルをインポートすることです。

## `lib.mkOverride`, `lib.mkDefault`, `lib.mkForce`

Nixファイルで`lib.mkDefault`や`lib.mkForce`を使って値を定義している人を見かけるかもしれません。名前が示すように、`lib.mkDefault`と`lib.mkForce`はオプションのデフォルト値を設定したり、オプションの値を強制的に設定したりするために使用されます。

このままでは理解しにくいかもしれませんし、公式ドキュメントにもこれらの関数の詳細な説明はありません。最も直接的な理解方法は、ソースコードを見ることです。

新しいウィンドウを開き、`nix repl -f '<nixpkgs>'`と入力してREPLインタプリタに入り、`:e lib.mkDefault`と入力すると、`lib.mkDefault`のソースコードを見ることができます（`:e`が何をするかわからない場合は、`:?`と入力してヘルプ情報を参照してください）。

ソースコードの抜粋は以下の通りです：

```nix
  # ......

  mkOverride = priority: content:
    { _type = "override";
      inherit priority content;
    };

  mkOptionDefault = mkOverride 1500; # option defaultsの優先度
  mkDefault = mkOverride 1000; # ユーザー以外のモジュールの設定セクションでデフォルトを設定するために使用
  mkImageMediaOverride = mkOverride 60; # image media profilesはホスト設定に含めることで派生できるため、ホスト設定を上書きする必要があるが、ユーザーがmkForceできるようにする
  mkForce = mkOverride 50;
  mkVMOverride = mkOverride 10; # `nixos-rebuild build-vm`で使用

  # ......
```

したがって、`lib.mkDefault`はオプションのデフォルト値を設定するために使用され、その優先度は1000です。一方、`lib.mkForce`はオプションの値を強制的に設定するために使用され、その優先度は50です。オプションの値を直接設定する場合、その優先度は1000（`lib.mkDefault`と同じ）になります。

`priority`の値が低いほど、実際の優先度は高くなります。したがって、`lib.mkForce`の優先度は`lib.mkDefault`よりも高くなります。同じ優先度の値を複数定義すると、Nixはパラメータの競合があるとしてエラーを出し、手動で解決する必要があります。

これらの関数は、NixOSの設定をモジュール化する際に非常に便利です。なぜなら、低レベルのモジュール（ベースモジュール）でデフォルト値を設定し、高レベルのモジュール（ハイレベルモジュール）でより高い優先度の値を設定できるからです。

例として、私はここでデフォルト値を定義しています：<https://github.com/ryan4yin/nix-config/blob/c515ea9/modules/nixos/core-server.nix#L32>

```nix{6}
{ lib, pkgs, ... }:

{
  # ......

  nixpkgs.config.allowUnfree = lib.mkDefault false;

  # ......
}
```

そして、デスクトップマシンの設定で、デフォルト値を強制的に上書きしました：
<https://github.com/ryan4yin/nix-config/blob/c515ea9/modules/nixos/core-desktop.nix#L18>

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

`lib.mkBefore`と`lib.mkAfter`は、**リスト型**のマージ順序を設定するために使用されます。これらは`lib.mkDefault`や`lib.mkForce`と同様に、モジュール化された設定で使用されます。

> リスト型の定義に関する公式ドキュメントは見つかりませんでしたが、簡単に言うと、マージ結果がマージの順序に依存する型だと理解しています。この理解に基づくと、list型とstring型はどちらもリスト型であり、実際にこれらの関数は両方の型で使用できます。

前述のように、同じ優先度の値を複数定義すると、Nixはパラメータの競合があるとしてエラーを出します。

しかし、**リスト型**の値を定義する場合、Nixはエラーを出しません。なぜなら、Nixは定義した複数の値を1つのリストにマージするからです。そして、`lib.mkBefore`と`lib.mkAfter`は、このリストのマージ順序を設定するために使用されます。

まずソースコードを見てみましょう。ターミナルを開き、`nix repl -f '<nixpkgs>'`と入力してREPLインタプリタに入り、`:e lib.mkBefore`と入力すると、`lib.mkBefore`のソースコードを見ることができます（`:e`が何をするかわからない場合は、`:?`と入力してヘルプ情報を参照してください）。

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

`lib.mkBefore`は`lib.mkOrder 500`のエイリアスであり、`lib.mkAfter`は`lib.mkOrder 1500`のエイリアスであることがわかります。

これら2つの関数をより直感的に理解するために、テスト用のflakeを作成してみましょう：

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

上記の例には、複数行文字列、単一行文字列、およびリストの3つの型で`lib.mkBefore`と`lib.mkAfter`を適用する例が含まれています。結果をテストしてみましょう：

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

ご覧のとおり、`lib.mkBefore`は後の値を前に挿入し、`lib.mkAfter`は後の値を後ろに挿入します。

> モジュールシステムのより詳細な紹介については、[モジュールシステムとカスタムオプション](../other-usage-of-flakes/module-system.md)を参照してください。

## References

- [Nix modules: Improving Nix's discoverability and usability ](https://cfp.nixcon.org/nixcon2020/talk/K89WJY/)
- [Module System - Nixpkgs](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md)
- [Misterio77/nix-starter-configs](https://github.com/Misterio77/nix-starter-configs)
