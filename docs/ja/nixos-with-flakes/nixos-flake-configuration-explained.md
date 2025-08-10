# NixOS の `flake.nix` について {#flake-nix-configuration-explained}

前のセクションでシステム設定を管理するために `flake.nix` ファイルを作成しましたが、その構造についてはまだよくわからないかもしれません。以下ではこのファイルの内容を詳しく説明します。

## 1. Flake Inputs

まず、`inputs` 属性について見てみましょう。`inputs` とは flake のすべての依存関係を定義する attribute set であり、ここに書かれた依存は取得されると `outputs` 関数の引数として渡されます:

```nix{2-5,7}
{
  inputs = {
    # NixOS 公式ソフトウェアソース。ここでは nixos-25.05 ブランチを使用
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }@inputs: {
    # 前の設定を省略......
  };
}
```

`inputs` の依存関係には多くの種類と定義方法があり、依存の参照先として別の flake や通常の Git リポジトリ、またローカルパスなどを使うことができます。[Flakes のその他の使い方 - Flake Inputs](../other-usage-of-flakes/inputs.md) で、一般的な依存関係の種類と定義方法について詳しく説明しています。

ここでは `nixpkgs` という依存関係のみを定義しており、参照方法は `github:owner/name/reference` という flake で最も一般的な形式を使っています。ここで `reference` はブランチ名、commit-id、またはタグのいずれかとなります。

`nixpkgs` が `inputs` で定義されると、本書で示す例のように後の `outputs` 関数の引数としてこの依存関係の中身を使うことができます。

## 2. Flake Outputs

次に `outputs` を見てみましょう。これは `inputs` の依存関係を引数として受け取る関数であり、その戻り値はこの flake のビルド結果を表す attribute set です:

```nix{11-19}
{
  description = "A simple NixOS flake";

  inputs = {
    # NixOS 公式ソフトウェアソース。ここでは nixos-25.05 ブランチを使用
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }@inputs: {
    # ホスト名が my-nixos であるホストにこの設定が適用されます
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
      ];
    };
  };
}
```

flake には多くの用途があり、さまざまな種類の outputs があります。[Flake Outputs](../other-usage-of-flakes/outputs.md) のセクションでより詳しく説明しています。ここでは、NixOS システムを設定するために用いられる `nixosConfigurations` という種類の outputs のみを使用しています。

`sudo nixos-rebuild switch` コマンドを実行すると、このコマンドは `/etc/nixos/flake.nix` の `outputs` 関数の返り値の attribute set から `nixosConfigurations.my-nixos`（`my-nixos` は現在のシステムのホスト名）という attribute を検索し、その定義を使って NixOS システムを設定します。

デフォルト値を使用するのではなく、flake の場所と NixOS の設定名を別個で指定することもできます。`nixos-rebuild` コマンドに `--flake` パラメータを追加するだけです。例：

```nix
sudo nixos-rebuild switch --flake /path/to/your/flake#your-hostname
```

上記のコマンドの `--flake /path/to/your/flake#your-hostname` パラメータは次のようになっています:

1. `/path/to/your/flake` は対象の flake の場所で、デフォルトでは `/etc/nixos/` というパスが使用されます。
2. `#` は区切り文字で、その後の `your-hostname` は NixOS の設定名です。`nixos-rebuild` はデフォルトで現在のシステムのホスト名を設定名として検索を行います。

リモートの GitHub リポジトリを flake ソースとして直接参照することもできます。例：

```nix
sudo nixos-rebuild switch --flake github:owner/repo#your-hostname
```

## 3. `outputs` 関数の特殊パラメータ `self` {#special-parameter-self-of-outputs-function}

これまで触れていませんでしたが、これまでのすべてのサンプルコードで、`outputs` 関数にはもう一つ特殊なパラメータ `self` がありました。ここでその役割を簡単に説明します。

[nix flake - Nix Reference Manual] の説明は次のとおりです：

> `self` という特殊な名前の input は、現在の flake の outputs とソースツリーを参照します。

つまり、`self` は現在の flake の `outputs` 関数の戻り値であり、同時に現在の flake のソースコードのフォルダパス（source tree）でもあります。

ここでは `self` パラメータは使用していませんが、より複雑な例やネット上で見かける設定では `self` が使われているのを目にすることでしょう。

> 注意: 一部のコードで `self.outputs` を使用して現在の flake の output を参照しているのを見かけるかもしれません。これは確かに可能ですが、Nix Reference Manual はこれについて全く触れておらず、flake の具体的な内部実装に依存するものと考えられるので、自分のコードで使用することはお勧めできません。

## 4. `nixpkgs.lib.nixosSystem` 関数の簡単な紹介 {#simple-introduction-to-nixpkgs-lib-nixos-system}

**Flake は他の Flake を依存として取り込むことで、そこで定義された機能やパッケージを利用できます。**

デフォルトでは、flake は各依存関係（つまり `inputs` の各項目）のルートディレクトリで `flake.nix` ファイルを探し、それらの `outputs` 関数を**遅延評価**します。次に、これらの関数が返す attribute set を自身の `outputs` 関数の引数として渡し、現在の flake において依存する他の flake が提供する機能を使用できるようにします。

より正確に言うと、各依存関係の `outputs` 関数は遅延評価されるので、flake の `outputs` 関数は実際に使用されるときにのみ評価されます。これによって不要な計算を避け、効率よく評価を行うことができます。

上記の説明では少しややこしいかもしれないので、このセクションで使用した `flake.nix` を用いて実際にこのプロセスを見てみましょう。私たちの `flake.nix` は `inputs.nixpkgs` という依存関係を宣言しているため、`sudo nixos-rebuild switch` コマンドを実行すると [nixpkgs/flake.nix] が評価されます。

Nixpkgs のリポジトリのソースコードを見ると、この flake の outputs の定義には `lib` という attribute が含まれていることがわかります。私たちの例では、`lib` という attribute の `nixosSystem` 関数を使用して NixOS システムを設定しています：

```nix{8-13}
{
  inputs = {
    # NixOS 公式ソフトウェアソース。ここでは nixos-25.05 ブランチを使用
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }@inputs: {
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
      ];
    };
  };
}
```

`nixpkgs.lib.nixosSystem` の後に続く attribute set がこの関数の引数です。ここでは2つのパラメータしか設定していません:

1. `system`: これはわかりやすく、システムアーキテクチャを表す引数です。
2. `modules`: これはモジュールのリストで、NixOS の実際のシステム設定はこれらのモジュールで定義されます。`/etc/nixos/configuration.nix` という設定ファイル自体が Nixpkgs Module であるため、`modules` リストに直接追加して使うことができます。

初心者の段階ではこれだけで十分です。`nixpkgs.lib.nixosSystem` 関数の具体的な実装を探るには、Nixpkgs のモジュールシステムについてある程度の知識が必要です。[設定のモジュール化](./modularize-the-configuration.md) のセクションを読み終えてから、[nixpkgs/flake.nix] に戻って `nixpkgs.lib.nixosSystem` の定義を見て、そのソースコードを追いかけながら実装について勉強するのが良いでしょう。

[nix flake - Nix Reference Manual]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake#flake-inputs
[nixpkgs/flake.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/flake.nix
[nixpkgs/nixos/lib/eval-config.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/lib/eval-config.nix
[Module System - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md
[nixpkgs/nixos-25.05/lib/modules.nix - _module.args]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/lib/modules.nix#L122-L184
[nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-types.section.md?plain=1#L237-L244
