# Nixソフトウェアパッケージング入門

# result example(auto unzip the tarball) => "/nix/store/d59llm96vgis5fy231x6m7nrijs0ww36-source"

# Packaging 101

WIP（作業中）です。 Nix のパッケージングについては、まず以下の参考資料を参照してください。

## 参考資料

- [NixOS Series 3: Software Packaging 101](https://lantian.pub/en/article/modify-computer/nixos-packaging.lantian/)
- [How to Learn Nix, Part 28: The standard environment](https://ianthehenry.com/posts/how-to-learn-nix/the-standard-environment/)
- [stdenv - Nixpkgs Manual](https://github.com/NixOS/nixpkgs/tree/nixos-unstable/doc/stdenv)
- [languages-frameworks - Nixpkgs Manual](https://github.com/NixOS/nixpkgs/tree/nixos-unstable/doc/languages-frameworks)
- [Wrapping packages - NixOS Cookbook](https://wiki.nixos.org/wiki/Nix_Cookbook#Wrapping_packages)
- 便利なツール：
  - [nurl](https://github.com/nix-community/nurl): リポジトリ URL から Nix fetcher コールを生成
  - [nix-init](https://github.com/nix-community/nix-init): URL から Nix パッケージを生成（ハッシュ自動取得・依存推論・ライセンス検出など）
- ソースコード：
  - [pkgs/build-support/trivial-builders/default.nix - runCommand](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/pkgs/build-support/trivial-builders/default.nix#L21-L49)
  - [pkgs/build-support/setup-hooks/make-wrapper.sh](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/pkgs/build-support/setup-hooks/make-wrapper.sh)
  - FHS 関連
    - [pkgs/build-support/build-fhsenv-bubblewrap/buildFHSEnv.nix](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/pkgs/build-support/build-fhsenv-bubblewrap/buildFHSEnv.nix):
      `pkgs.buildFHSEnvBubblewrap`
    - [pkgs/build-support/build-fhsenv-chroot/default.nix](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/pkgs/build-support/build-fhsenv-bubblewrap/buildFHSEnv.nix):
      `pkgs.buildFHSEnvChroot`

---

## 1. stdenv ビルドの紹介

TODO

## 2. 言語固有のフレームワーク

TODO

## Fetchers {#fetchers}

ビルド入力はファイルシステムパスから直接取得するだけでなく、 fetcher を使って取得することもできます。 fetcher は特殊な関数で、属性セットを受け取り、 Nix Store 内のシステムパスを返します。

Nix には 4 つの組み込み fetcher があります：

- `builtins.fetchurl`: URL からファイルをダウンロード
- `builtins.fetchTarball`: URL から tarball ファイルをダウンロード
- `builtins.fetchGit`: git リポジトリからファイルをダウンロード
- `builtins.fetchClosure`: Nix Store から derivation を取得

例：

```nix
builtins.fetchurl "https://github.com/NixOS/nix/archive/7c3ab5751568a0bc63430b33a5169c5e4784a0ff.tar.gz"
# 結果例 => "/nix/store/7dhgs330clj36384akg86140fqkgh8zf-7c3ab5751568a0bc63430b33a5169c5e4784a0ff.tar.gz"

Derivationは、ソフトウェアパッケージをどのようにビルドするかを記述したもので、パッケージビルドプロセスのNix言語による記述です。ビルド時に必要な依存関係、ビルドツールチェーン、設定する環境変数、ビルドパラメータ、実行順序などを宣言します。
# 結果例（自動で展開）=> "/nix/store/d59llm96vgis5fy231x6m7nrijs0ww36-source"
```

## Derivations {#derivations}

> 公式の Nixpkgs パッケージリポジトリのソフトウェアは、ほとんどのユーザーのニーズを満たしています。 NixOS の学習初期段階では derivation の詳細を深く理解する必要はなく、概要を把握しておけば十分です。本書では後の [Nixソフトウェアパッケージング入門](../development/packaging-101.md) で関連内容を詳しく紹介しますが、ここでは簡単な紹介に留めます。

Derivationのビルド結果はStore Objectであり、パッケージのすべてのバイナリプログラム、設定ファイルなどが含まれます。Store Objectの保存パス形式は`/nix/store/<hash>-<name>`で、`<hash>`はビルド結果のハッシュ値、`<name>`はその名前です。パスのハッシュ値により、各ビルド結果が一意であることが保証され、複数バージョンの共存が可能になり、依存関係の競合も発生しません。

`/nix/store`はStoreと呼ばれる特殊なファイルパスで、すべてのStore Objectを保存します。このパスは読み取り専用に設定されており、システムの再現性を保証するためにNix自体のみがこのパスの内容を変更できます。

Derivationは実質的には属性セットであり、Nixの内部では組み込み関数`builtins.derivation`を使用してこの属性セットをStore Objectにビルドします。実際にDerivationを作成する際には、通常`stdenv.mkDerivation`を使用します。これは前述の組み込み関数`builtins.derivation`のNix言語ラッパーであり、内部の詳細を隠蔽し、使用法を簡素化します。

以下は、helloという名前のアプリケーションを宣言する簡単なDerivationです（[nixpkgs/pkgs/hello](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/pkgs/applications/misc/hello/default.nix)から抜粋）。

```nix
{ callPackage
, lib
, stdenv
, fetchurl
, nixos
, testers
, hello
}:

stdenv.mkDerivation (finalAttrs: {
  pname = "hello";
  version = "2.12.1";

  src = fetchurl {
    url = "mirror://gnu/hello/hello-${finalAttrs.version}.tar.gz";
    sha256 = "sha256-jZkUKv2SV28wsM18tCqNxoCZmLxdYH2Idh9RLibH2yA=";
  };

  doCheck = true;

  passthru.tests = {
    version = testers.testVersion { package = hello; };

    invariant-under-noXlibs =
      testers.testEqualDerivation
        "hello must not be rebuilt when environment.noXlibs is set."
        hello
        (nixos { environment.noXlibs = true; }).pkgs.hello;
  };

  passthru.tests.run = callPackage ./test.nix { hello = finalAttrs.finalPackage; };

  meta = with lib; {
    description = "A program that produces a familiar, friendly greeting";
    longDescription = ''
      GNU Hello is a program that prints "Hello, world!" when you run it.
      It is fully customizable.
    '';
    homepage = "https://www.gnu.org/software/hello/manual/";
    changelog = "https://git.savannah.gnu.org/cgit/hello.git/plain/NEWS?h=v${finalAttrs.version}";
    license = licenses.gpl3Plus;
    maintainers = [ maintainers.eelco ];
    platforms = platforms.all;
  };
})
```
