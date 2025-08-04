# Overriding

簡単に言えば、nixpkgs内のすべてのNixパッケージは`<pkg>.override {}`で一部のビルドパラメータをカスタマイズできます。これにより、指定したパラメータで新しいDerivationが生成されます。例：

```nix
pkgs.fcitx5-rime.override {rimeDataPkgs = [
    ./rime-data-flypy
];}
```

このNix式の実行結果は、`rimeDataPkgs`パラメータが`[./rime-data-flypy]`に上書きされた新しいDerivationです。他のパラメータは元の値が使われます。

`fcitx5-rime`パッケージでどのパラメータが上書き可能か知りたい場合、いくつか方法があります：

1. GitHubのnixpkgsソースで直接確認：[fcitx5-rime.nix](https://github.com/NixOS/nixpkgs/blob/e4246ae1e7f78b7087dce9c9da10d28d3725025f/pkgs/tools/inputmethods/fcitx5/fcitx5-rime.nix)
   1. 正しいブランチ（例：nixos-unstable）を選んで確認してください。
2. `nix repl`で対話的に調べる：`nix repl -f '<nixpkgs>'`を起動し、`:e pkgs.fcitx5-rime`と入力すると、エディタでそのパッケージのソースが開き、全パラメータが確認できます。

上記の方法で`fcitx5-rime`パッケージの入力パラメータが分かります。これらは`override`で上書き可能です：

```nix
{ lib, stdenv
, fetchFromGitHub
, pkg-config
, cmake
, extra-cmake-modules
, gettext
, fcitx5
, librime
, rime-data
, symlinkJoin
, rimeDataPkgs ? [ rime-data ]
}:

stdenv.mkDerivation rec {
  ...
}
```

パラメータの上書き以外にも、`overrideAttrs`で`stdenv.mkDerivation`で構築されたDerivationの属性を直接上書きできます。例として[pkgs.hello](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/pkgs/applications/misc/hello/default.nix)を見てみましょう。まずソースを確認：

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

  # ......
})
```

ここで`pname`や`version`、`src`、`doCheck`などの属性は`overrideAttrs`で上書きできます。例：

```nix
helloWithDebug = pkgs.hello.overrideAttrs (finalAttrs: previousAttrs: {
  doCheck = false;
});
```

この例では、`helloWithDebug`は`doCheck`が`false`に変更された新しいDerivationです。他のパラメータは元の値が使われます。

また、パッケージソースで定義されたパラメータ以外にも、`overrideAttrs`で`stdenv.mkDerivation`内部のデフォルトパラメータも上書きできます。例：

```nix
helloWithDebug = pkgs.hello.overrideAttrs (finalAttrs: previousAttrs: {
  separateDebugInfo = true;
});
```

内部パラメータの詳細は、`nix repl -f '<nixpkgs>'`で`:e stdenv.mkDerivation`と入力してソースを確認してください。

## 参考

- [Chapter 4. Overriding - nixpkgs Manual](https://nixos.org/manual/nixpkgs/stable/#chap-overrides)
