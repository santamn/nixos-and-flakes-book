# Overriding

Nix では、`pkgs` ディレクトリ内の Nix パッケージを `override` 関数を使ってカスタマイズできます。この関数を使うことで独自のビルドパラメータを定義し、それらのパラメータを変更した新しい Derivation を生成できます。以下に具体例を示します:

```nix
pkgs.fcitx5-rime.override { rimeDataPkgs = [ ./rime-data-flypy ]; }
```

上記の例では、`fcitx5-rime` Derivation の `rimeDataPkgs` パラメータをカスタムパッケージ `rime-data-flypy` に置き換えています。これにより、`rimeDataPkgs` のみが変更された新しい Derivation が作成され、その他のパラメータは変更されずに保持されます。

特定のパッケージでどのパラメータが上書き可能か知りたい場合、いくつか方法があります:

1. たとえば [fcitx5-rime.nix](https://github.com/NixOS/nixpkgs/blob/e4246ae1e7f78b7087dce9c9da10d28d3725025f/pkgs/tools/inputmethods/fcitx5/fcitx5-rime.nix) のように、GitHub の Nixpkgs リポジトリでソースコードを直接確認する。この場合は `nixos-unstable` など、自分が使っている適切なブランチを選ぶようにしてください。
2. `nix repl -f '<nixpkgs>'` コマンドで Nix REPL を開き、`:e pkgs.fcitx5-rime` と入力する。こうすることで、デフォルトのエディタでパッケージのソースコードが表示され、すべてのパラメータを確認できます。`nix repl` の基本的な使い方を知りたい場合は、`:?` と入力してヘルプ情報を参照してください。

これらの方法を使うことで、パッケージの入力パラメータを確認し `override` 関数で変更可能なパラメータを特定することができます。

具体例として [pkgs.hello](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/pkgs/applications/misc/hello/default.nix) のソースコードを見てみましょう:

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

  # ...
})
```

この例では `pname`, `version`, `src`, `doCheck` はすべて `overrideAttrs` を使って上書きすることができます:

```nix
helloWithDebug = pkgs.hello.overrideAttrs (finalAttrs: previousAttrs: {
  doCheck = false;
});
```

上記のコードでは、`overrideAttrs` を使って `doCheck` のみを上書きし、他の attribute は変更しないようにしています。

`overrideAttrs` を使用すると、`stdenv.mkDerivation` で定義されているデフォルトの attribute の一部を上書きすることもできます:

```nix
helloWithDebug = pkgs.hello.overrideAttrs (finalAttrs: previousAttrs: {
  separateDebugInfo = true;
});
```

この例では、`hello` のソースコードではなく `stdenv.mkDerivation` で定義されている `separateDebugInfo` attribute をオーバーライドしています。

`stdenv.mkDerivation` で定義されているすべての attribute を確認するには、`nix repl -f '<nixpkgs>'` を実行して `:e stdenv.mkDerivation` と入力し、ソースコードを表示してください。

これにより、デフォルトのエディタでソースコードが開きます。`nix repl` にまだ慣れていない方は、`:?` と入力してヘルプ情報を確認してください。
