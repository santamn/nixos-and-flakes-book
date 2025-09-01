# `pkgs.callPackage`

`pkgs.callPackage` は、Nix の Derivation 構築をパラメータ化するために使用されます。その目的を理解するために、まず `pkgs.callPackage` を使用しない場合の Nix パッケージ（別名 Derivation）の定義方法を考えてみましょう。

## 1. `pkgs.callPackage` を使わない場合

Nix パッケージは次のようなコードで定義できます:

```nix
pkgs.writeShellScriptBin "hello" ''echo "hello, ryan!"''
```

`nix repl` で実行結果を確認すると、確かに Derivation が生成されていることが分かります:

```shell
› nix repl -f '<nixpkgs>'
Welcome to Nix 2.13.5. Type :? for help.

Loading installable ''...
Added 19203 variables.

nix-repl> pkgs.writeShellScriptBin "hello" '' echo "hello, xxx!" ''
«derivation /nix/store/zhgar12vfhbajbchj36vbbl3mg6762s8-hello.drv»
```

この Derivation の定義は簡潔ですが、実際に nixpkgs に含まれる Derivation の多くはこれよりはるかに複雑です。前の章では `import xxx.nix` で他の Nix ファイルから Nix 式をインポートする方法を紹介し、また何度も使ってきましたが、これはコードの保守性を高めるためのものでした。

以下でも同様に、`import` を使ってファイルを分割する例を考えます:

1. Derivation の定義を別のファイル (例: `hello.nix`) に分離します。
   1. ただし、`hello.nix` 自体のスコープには `pkgs` 変数が含まれていないため、内容を修正し `pkgs` を引数として受け取るようにします。
2. Derivation を使いたい場所で `import ./hello.nix pkgs` のようにインポートし、`pkgs` を引数として渡して内部で定義された関数を実行します。

再び `nix repl` で確認すると、やはり Derivation が生成されます:

```shell
› cat hello.nix
pkgs:
  pkgs.writeShellScriptBin "hello" '' echo "hello, xxx!" ''

› nix repl -f '<nixpkgs>'
Welcome to Nix 2.13.5. Type :? for help.

warning: Nix search path entry '/nix/var/nix/profiles/per-user/root/channels' does not exist, ignoring
Loading installable ''...
Added 19203 variables.

nix-repl> import ./hello.nix pkgs
«derivation /nix/store/zhgar12vfhbajbchj36vbbl3mg6762s8-hello.drv»
```

## 2. `pkgs.callPackage` を使う場合

上の `pkgs.callPackage` を使用しない例では `pkgs` を引数として直接 `hello.nix` に渡していましたが、この方法には以下のような欠点があります:

1. `hello` Derivation の依存関係はすべて `pkgs` と密接に結びつけられます
   1. 独自の依存関係が必要な場合、`pkgs` か `hello.nix` の内容を修正する必要があり、これは煩雑な作業となる可能性があります。
1. `hello.nix` が複雑になると、`pkgs` 内のどの Derivation に依存しているか分かりづらくなり、Derivation 間の依存関係を分析するのが困難になります。

こうした問題を解決するツールとして Derivation をパラメータ化する `pkgs.callPackage` 関数があります。そのソースコードやコメントを見てみましょう [nixpkgs/lib/customisation.nix#L101-L121](https://github.com/NixOS/nixpkgs/blob/fe138d3/lib/customisation.nix#L101-L121):

```nix
  /* Call the package function in the file `fn` with the required
    arguments automatically.  The function is called with the
    arguments `args`, but any missing arguments are obtained from
    `autoArgs`.  This function is intended to be partially
    parameterised, e.g.,

      callPackage = callPackageWith pkgs;
      pkgs = {
        libfoo = callPackage ./foo.nix { };
        libbar = callPackage ./bar.nix { };
      };

    If the `libbar` function expects an argument named `libfoo`, it is
    automatically passed as an argument.  Overrides or missing
    arguments can be supplied in `args`, e.g.

      libbar = callPackage ./bar.nix {
        libfoo = null;
        enableX11 = true;
      };
  */
  callPackageWith = autoArgs: fn: args:
    let
      f = if lib.isFunction fn then fn else import fn;
      fargs = lib.functionArgs f;

      # All arguments that will be passed to the function
      # This includes automatic ones and ones passed explicitly
      allArgs = builtins.intersectAttrs fargs autoArgs // args;

    # ......
```

これを要約すると、`pkgs.callPackage` は `pkgs.callPackage fn args`の形で使われるということです。ここで、`fn` は Nix ファイルまたは関数を表し、`args` は attribute set です。動作の流れは次のようになります:

1. `pkgs.callPackage fn args` は、まず `fn` が関数かファイルかを判定し、ファイルなら `import xxx.nix` で関数を取得します。
   1. このステップで `lib`, `stdenv`, `fetchurl` といったパラメータや場合によってはカスタムパラメータを引数にとるような関数を取得できます。
2. 次に `args` と `pkgs` の attribute set がマージされます。もし引数が重複する場合は `args` 側が優先されます。
3. そしてマージされた attribute set から `fn` 関数の引数を取り出し、それらを使って関数が呼び出されます。
4. 関数の実行結果は Derivation、つまり Nix パッケージとなります。

`pkgs.callPackage` の引数となる Nix ファイルの具体例については、[Nixpkgs の発展的な使い方 - 概要](./intro.md) で紹介した `hello.nix` や`fcitx5-rime.nix`, `vscode/with-extensions.nix`, `firefox/common.nix` などが参考になります。これらパッケージはすべて `pkgs.callPackage` を使ってインポートできます。

例えば、`kernel.nix` ファイルで独自の NixOS カーネル設定を定義し、開発ブランチ名とカーネルソースコードをカスタムできるようにした場合を考えてみましょう:

```nix
{
  lib,
  stdenv,
  linuxManualConfig,

  src,
  boardName,
  ...
}:
(linuxManualConfig {
  version = "5.10.113-thead-1520";
  modDirVersion = "5.10.113";

  inherit src lib stdenv;

  # カーネル設定ファイルへのパス (make menuconfig で生成される `.config` ファイル)
  configfile = ./. + "${boardName}_config";

  allowImportFromDerivation = true;
})
```

次のように、任意の Nix モジュール内で `pkgs.callPackage ./hello.nix {}` のようにインポートし、必要に応じてパラメータを柔軟に差し替えて使うことができます:

```nix
{ lib, pkgs, pkgsKernel, kernel-src, ... }:

{
  # ......

  boot = {
    # ......
    kernelPackages = pkgs.linuxPackagesFor (pkgs.callPackage ./pkgs/kernel {
        src = kernel-src;  # カーネルソースは `specialArgs` として渡され、このモジュールに注入される
        boardName = "licheepi4a";  # カーネル設定ファイルのパスを生成するためのボード名
    });
  }

  # ......
}
```

上記の例で示したように、`pkgs.callPackage` を使うことで `kernel.nix` で定義された関数に対して異なる `src` と `boardName` を渡すことで、さまざまなカーネルパッケージを生成できます。これにより、同じ `kernel.nix` ファイルを異なるカーネルソースコードや開発ボードに柔軟に適応させることが可能になります。

`pkgs.callPackage`の利点は次のとおりです:

1. Derivation の定義がパラメータ化され、その依存関係が関数の引数にまとめられるので、依存関係の解析が容易になります。
2. Derivation の依存や独自パラメータを `pkgs.callPackage` の第2引数で簡単に置き換えできるので、再利用性が大きく向上します。
3. `pkgs` 内のすべての依存関係が自動的に注入されるため、コードの複雑さを増やすことなくこれら2つの機能を実現できます。

このような利点があるため、Derivation の定義には `pkgs.callPackage` の利用が推奨されます。

## 参考

- [Chapter 13. Callpackage Design Pattern - Nix Pills](https://nixos.org/guides/nix-pills/callpackage-design-pattern.html)
- [callPackage, a tool for the lazy - The Summer of Nix](https://summer.nixos.org/blog/callpackage-a-tool-for-the-lazy/)
- [Document what callPackage does and its preconditions - Nixpkgs Issues](https://github.com/NixOS/nixpkgs/issues/36354)
