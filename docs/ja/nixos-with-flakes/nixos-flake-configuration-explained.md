# `flake.nix` 設定の詳細解説 {#flake-nix-configuration-explained}

上記で、システム設定を管理するために `flake.nix` ファイルを作成しましたが、その構造についてはまだよくわからないかもしれません。以下でこのファイルの内容を詳しく説明します。

### 1. flake inputs

まず、`inputs` 属性を見てみましょう。これは、この flake のすべての依存関係を定義する属性セットです。これらの依存関係は、取得された後、`outputs` 関数の引数として渡されます：

```nix{2-5,7}
{
  inputs = {
    # NixOS 公式ソフトウェアソース、ここでは nixos-25.05 ブランチを使用
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }@inputs: {
    # 前の設定を省略......
  };
}
```

`inputs` の各依存関係には多くの種類と定義方法があり、別の flake、通常の Git リポジトリ、またはローカルパスにすることができます。[Flakes の他の使い方 - Flake の inputs](../other-usage-of-flakes/inputs.md) で、一般的な依存関係の種類と定義方法について詳しく説明しています。

ここでは `nixpkgs` という依存関係のみを定義しており、flake で最も一般的な参照方法、つまり `github:owner/name/reference` を使用しています。ここでの `reference` はブランチ名、commit-id、またはタグです。

`nixpkgs` が `inputs` で定義されると、後の `outputs` 関数のパラメータでこの依存関係の内容を使用できます。私たちの例ではまさにそのようにしています。

### 2. flake outputs

次に `outputs` を見てみましょう。これは `inputs` の依存関係をパラメータとして受け取る関数で、その戻り値はこの flake のビルド結果である属性セットです：

```nix{10-18}
{
  description = "A simple NixOS flake";

  inputs = {
    # NixOS 公式ソフトウェアソース、ここでは nixos-25.05 ブランチを使用
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.05";
  };

  outputs = { self, nixpkgs, ... }@inputs: {
    # ホスト名が my-nixos のホストはこの設定を使用します
    nixosConfigurations.my-nixos = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        ./configuration.nix
      ];
    };
  };
}
```

flake には多くの用途があり、さまざまな種類の outputs があります。[Flake の outputs](../other-usage-of-flakes/outputs.md) のセクションで詳しく説明しています。ここでは、NixOS システムを設定するために使用される `nixosConfigurations` という種類の outputs のみを使用しています。

`sudo nixos-rebuild switch` コマンドを実行すると、`/etc/nixos/flake.nix` の `outputs` 関数の戻り値から `nixosConfigurations.my-nixos`（`my-nixos` は現在のシステムのホスト名）という属性を検索し、その定義を使用して NixOS システムを設定します。

実際には、デフォルト値を使用する代わりに、flake の場所と NixOS 設定の名前をカスタマイズすることもできます。`nixos-rebuild` コマンドに `--flake` パラメータを追加するだけです。例：

```nix
sudo nixos-rebuild switch --flake /path/to/your/flake#your-hostname
```

上記のコマンドの `--flake /path/to/your/flake#your-hostname` パラメータの簡単な説明：

1. `/path/to/your/flake` は対象の flake の場所です。デフォルトでは `/etc/nixos/` というパスが使用されます。
2. `#` は区切り文字で、その後の `your-hostname` は NixOS 設定の名前です。`nixos-rebuild` はデフォルトで現在のシステムのホスト名を設定名として検索します。

リモートの GitHub リポジトリを flake ソースとして直接参照することもできます。例：

```nix
sudo nixos-rebuild switch --flake github:owner/repo#your-hostname
```

### 3. `outputs` 関数の特殊なパラメータ `self` {#special-parameter-self-of-outputs-function}

これまで触れていませんでしたが、前のすべてのサンプルコードで、`outputs` 関数にはもう一つ特殊なパラメータ `self` がありました。ここでその役割を簡単に説明します。

[nix flake - Nix Manual] の説明は次のとおりです：

> The special input named `self` refers to the outputs and source tree of this flake.

つまり、`self` は現在の flake の `outputs` 関数の戻り値であり、同時に現在の flake のソースコードのフォルダパス（source tree）でもあります。

ここでは `self` パラメータは使用していませんが、後のより複雑な例（またはオンラインで見つけた設定）では `self` の使い方を見ることができます。

> 注意：一部のコードで `self.outputs` を使用して現在の flake の出力を参照しているのを見かけるかもしれませんが、これは確かに可能です。しかし、Nix Manual はこれについて何も説明しておらず、flake の内部実装の詳細であるため、自分のコードで使用することはお勧めしません！

### 4. `nixpkgs.lib.nixosSystem` 関数の簡単な紹介 {#simple-introduction-to-nixpkgs-lib-nixos-system}

**ある Flake は他の Flake に依存し、それらが提供する機能を使用できます。**

デフォルトでは、flake は各依存関係（つまり `inputs` の各項目）のルートディレクトリで `flake.nix` ファイルを探し、それらの `outputs` 関数を**遅延評価**（lazy evaluation）します。次に、これらの関数が返す属性セットを自身の `outputs` 関数の引数として渡し、現在の flake で依存する他の flake が提供する機能を使用できるようにします。

より正確に言うと、各依存関係の `outputs` 関数の評価は遅延（lazy）です。つまり、flake の `outputs` 関数は実際に使用されるときにのみ評価されるため、不要な計算を避けて効率を向上させることができます。

上記の説明は少しややこしいかもしれませんが、このセクションで使用した `flake.nix` の例でこのプロセスを見てみましょう。私たちの `flake.nix` は `inputs.nixpkgs` という依存関係を宣言しているため、`sudo nixos-rebuild switch` コマンドを実行すると [nixpkgs/flake.nix] が評価されます。Nixpkgs リポジトリのソースコードから、その flake outputs 定義に `lib` という属性が返されることがわかります。私たちの例では、`lib` 属性の `nixosSystem` という関数を使用して NixOS システムを設定しています：

```nix{8-13}
{
  inputs = {
    # NixOS 公式ソフトウェアソース、ここでは nixos-25.05 ブランチを使用
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

`nixpkgs.lib.nixosSystem` の後に続く属性セットがこの関数のパラメータです。ここでは2つのパラメータしか設定していません：

1. `system`: これはわかりやすく、システムアーキテクチャのパラメータです。
2. `modules`: これは modules のリストで、NixOS の実際のシステム設定はこれらの modules で定義されます。

`/etc/nixos/configuration.nix` という設定ファイル自体が Nixpkgs Module であるため、`modules` リストに直接追加して使用できます。

初心者の段階ではこれだけで十分です。`nixpkgs.lib.nixosSystem` 関数の具体的な実装を探るには、Nixpkgs のモジュールシステムについてある程度の知識が必要です。読者は [モジュール化 NixOS 設定](./modularize-the-configuration.md) のセクションを学習した後、[nixpkgs/flake.nix] に戻って `nixpkgs.lib.nixosSystem` の定義を見つけ、そのソースコードを追跡し、実装方法を研究することができます。

[nix flake - Nix Manual]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix3-flake#flake-inputs
[nixpkgs/flake.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/flake.nix
[nixpkgs/nixos/lib/eval-config.nix]: https://github.com/NixOS/nixpkgs/tree/nixos-25.05/nixos/lib/eval-config.nix
[Module System - Nixpkgs]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/doc/module-system/module-system.chapter.md
[nixpkgs/nixos-25.05/lib/modules.nix - _module.args]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/lib/modules.nix#L122-L184
[nixpkgs/nixos-25.05/nixos/doc/manual/development/option-types.section.md#L237-L244]: https://github.com/NixOS/nixpkgs/blob/nixos-25.05/nixos/doc/manual/development/option-types.section.md?plain=1#L237-L244
