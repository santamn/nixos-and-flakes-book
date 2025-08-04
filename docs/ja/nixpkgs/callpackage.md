# pkgs.callPackage

`pkgs.callPackage`は、Nixパッケージのパラメータ化された構築に使われます。その用途を理解するため、まず`pkgs.callPackage`を使わない場合にNixパッケージ（Derivation）をどのように定義するか考えてみましょう。

## 1. `pkgs.callPackage`を使わない場合

以下のように、Nixパッケージを定義できます：

```nix
pkgs.writeShellScriptBin "hello" ''echo "hello, ryan!"''
```

`nix repl`で実行結果を確認すると、確かにDerivationが生成されていることが分かります：

```shell
› nix repl -f '<nixpkgs>'
Welcome to Nix 2.13.5. Type :? for help.

Loading installable ''...
Added 19203 variables.

nix-repl> pkgs.writeShellScriptBin "hello" '' echo "hello, xxx!" ''
«derivation /nix/store/zhgar12vfhbajbchj36vbbl3mg6762s8-hello.drv»
```

このDerivationの定義は1行で済みますが、nixpkgs内の多くのDerivationはこれよりずっと複雑です。前述のように`import xxx.nix`で他のNixファイルからNix式をインポートする方法も多用されます。これにより、コードの保守性が向上します：

1. 上記のDerivation定義を`hello.nix`というファイルに分離します。
   1. ただし、`hello.nix`自体のスコープには`pkgs`変数が含まれていないため、内容を修正し、`pkgs`を引数として受け取るようにします。
1. Derivationを使いたい場所で`import ./hello.nix pkgs`のようにインポートし、`pkgs`を引数として渡して関数を実行します。

再び`nix repl`で確認すると、やはりDerivationが生成されます：

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

## 2. `pkgs.callPackage`を使う場合

前述の例では、`pkgs`を直接引数として`hello.nix`に渡していましたが、この方法には以下のような欠点があります：

1. `hello` Derivationの他の依存はすべて`pkgs`から取得する必要があり、柔軟性に欠けます。
   1. たとえば他の独自依存を追加したい場合、`pkgs`や`hello.nix`の内容を修正しなければならず、どちらも面倒です。
1. `hello.nix`が複雑になると、どのDerivationが`pkgs`内の何に依存しているか分かりづらくなり、依存関係の解析が困難です。

`pkgs.callPackage`は、こうした問題を解決するためのパラメータ化Derivation構築用の関数です。ソースコード上の定義やコメントは[nixpkgs/lib/customisation.nix#L101-L121](https://github.com/NixOS/nixpkgs/blob/fe138d3/lib/customisation.nix#L101-L121)を参照してください。

簡単に言えば、`pkgs.callPackage fn args`の形式で使い、`fn`はNixファイルまたは関数、`args`はattribute setです。動作の流れは：

1. `pkgs.callPackage fn args`は、まず`fn`が関数かファイルかを判定し、ファイルなら`import xxx.nix`で関数を取得します。
2. `args`と`pkgs`のattribute setをマージし、引数が重複する場合は`args`側が優先されます。
3. その関数の引数名に一致する値だけを抽出して関数を実行します。
4. 実行結果はDerivation、つまりNixパッケージとなります。

`pkgs.callPackage`の引数となるNixファイルの具体例は、[Nixpkgs 高度な使い方 - 簡単な紹介](./intro.md)で紹介した`hello.nix`や`fcitx5-rime.nix`、`vscode/with-extensions.nix`、`firefox/common.nix`などが参考になります。

たとえば独自のNixOSカーネル設定`kernel.nix`を作成し、開発ボード名やカーネルソースを可変パラメータとして渡す場合：

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

  # file path to the generated kernel config file (make menuconfigで生成される.config)
  configfile = ./. + "${boardName}_config";

  allowImportFromDerivation = true;
})
```

このように、任意のNixpkgsモジュール内で`pkgs.callPackage ./hello.nix {}`のようにインポートし、パラメータを柔軟に差し替えられます。

`pkgs.callPackage`の利点は：

1. Derivationの定義がパラメータ化され、すべての関数引数が依存関係となるため、依存関係の解析が容易です。
2. 依存や独自パラメータを`pkgs.callPackage`の第2引数で簡単に上書きでき、再利用性が大きく向上します。
3. これらの機能を実現しつつ、コードの複雑さは増さず、`pkgs`内の依存は自動で注入されるため、手動で渡す必要がありません。

そのため、Derivationの定義には`pkgs.callPackage`の利用が推奨されます。

## 参考

- [Chapter 13. Callpackage Design Pattern - Nix Pills](https://nixos.org/guides/nix-pills/callpackage-design-pattern.html)
- [callPackage, a tool for the lazy - The Summer of Nix](https://summer.nixos.org/blog/callpackage-a-tool-for-the-lazy/)
- [Document what callPackage does and its preconditions - Nixpkgs Issues](https://github.com/NixOS/nixpkgs/issues/36354)
