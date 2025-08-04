# NixOSでの開発作業

NixOSは、その再現可能な特性により、開発環境の構築に非常に適しています。しかし、他のディストリビューションでの環境構築の経験をそのままNixOSで活かそうとすると、多くの問題に直面する可能性があります。なぜなら、NixOSには独自のロジックがあるからです。以下で、その点について少し説明します。

この章では、まずNix Flakes開発環境の実装原理を学び、後の章でユースケースに応じたより具体的な内容を紹介します。

## `nix shell`による開発環境の作成

NixOSで最も簡単に開発環境を作成する方法は`nix shell`を使用することです。これは、指定されたNixパッケージを含むシェル環境を作成します。

例：

```shell
# helloは存在しない
› hello
hello: command not found

# helloとcowsayを含むシェル環境に入る
# 複数のパッケージをスペースで区切って指定できる
› nix shell nixpkgs#hello nixpkgs#cowsay

# helloが使えるようになった
› hello
Hello, world!

# cowsayも使えるようになった
› cowsay "Hello, world!"
 _______
< hello >
 -------
        \   ^__^
         \  (oo)\_______
            (__)\       )\/\
                ||----w |
                ||     ||
```

`nix shell`は、一時的にいくつかのソフトウェアパッケージを試したり、クリーンな環境を素早く作成したりするのに非常に適しています。

## 開発環境の作成と使用

`nix shell`は非常にシンプルですが、柔軟性には欠けます。より複雑な開発環境の管理には、`pkgs.mkShell`と`nix develop`を使用する必要があります。

Nix Flakesでは、`pkgs.mkShell { ... }`を使ってプロジェクト環境を定義し、`nix develop`を使ってその開発環境のインタラクティブなBashシェルを開くことができます。

これら2つの機能をより良く使うために、まずはその原理を見てみましょう。

[`pkgs.mkShell`のソースコード](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/pkgs/build-support/mkshell/default.nix)は以下の通りです。

```nix
{ lib, stdenv, buildEnv }:

# A special kind of derivation that is only meant to be consumed by the
# nix-shell.
{ name ? "nix-shell"
, # a list of packages to add to the shell environment
  packages ? [ ]
, # propagate all the inputs from the given derivations
  inputsFrom ? [ ]
, buildInputs ? [ ]
, nativeBuildInputs ? [ ]
, propagatedBuildInputs ? [ ]
, propagatedNativeBuildInputs ? [ ]
, ...
}@attrs:
let
  mergeInputs = name:
    (attrs.${name} or [ ]) ++
    (lib.subtractLists inputsFrom (lib.flatten (lib.catAttrs name inputsFrom)));

  rest = builtins.removeAttrs attrs [
    "name"
    "packages"
    "inputsFrom"
    "buildInputs"
    "nativeBuildInputs"
    "propagatedBuildInputs"
    "propagatedNativeBuildInputs"
    "shellHook"
  ];
in

stdenv.mkDerivation ({
  inherit name;

  buildInputs = mergeInputs "buildInputs";
  nativeBuildInputs = packages ++ (mergeInputs "nativeBuildInputs");
  propagatedBuildInputs = mergeInputs "propagatedBuildInputs";
  propagatedNativeBuildInputs = mergeInputs "propagatedNativeBuildInputs";

  shellHook = lib.concatStringsSep "\n" (lib.catAttrs "shellHook"
    (lib.reverseList inputsFrom ++ [ attrs ]));

  phases = [ "buildPhase" ];

  # ......

  # when distributed building is enabled, prefer to build locally
  preferLocalBuild = true;
} // rest)
```

`pkgs.mkShell { ... }`は、本質的には特殊なDerivation（Nixパッケージ）であり、その`name`や`buildInputs`などのパラメータはカスタマイズ可能です。`shellHook`は特殊なパラメータで、`nix develop`でこの環境に入ったときに実行されます。

以下は、nodejs 18の開発環境を定義する`flake.nix`ファイルです。

```nix
{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
  };

  outputs = { self , nixpkgs ,... }: let
    # system should match the system you are running on
    # system = "x86_64-linux";
    system = "x86_64-darwin";
  in {
    devShells."${system}".default = let
      pkgs = import nixpkgs {
        inherit system;
      };
    in pkgs.mkShell {
      # create an environment with nodejs-18_x, pnpm, and yarn
      packages = with pkgs; [
        nodejs_18
        nodePackages.pnpm
        (yarn.override { nodejs = nodejs_18; })
      ];

      shellHook = ''
        echo "node `node --version`"
      '';
    };
  };
}
```

空のフォルダを作成し、上記の設定を`flake.nix`として保存してから`nix develop`（より正確には`nix develop .#default`）を実行すると、まず現在のnodejsのバージョンが表示され、その後`node`、`pnpm`、`yarn`などのコマンドが正常に使えるようになります。

## 開発環境でzsh/fishなどの他のシェルを使用する

`pkgs.mkShell`はデフォルトで`bash`を使用しますが、`shellHook`に`exec <your-shell>`を追加することで、`zsh`や`fish`などの他のシェルを使用することもできます。

例：

```nix
{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
  };

  outputs = { self , nixpkgs ,... }: let
    # system should match the system you are running on
    # system = "x86_64-linux";
    system = "x86_64-darwin";
  in {
    devShells."${system}".default = let
      pkgs = import nixpkgs {
        inherit system;
      };
    in pkgs.mkShell {
      # create an environment with nodejs_18, pnpm, and yarn
      packages = with pkgs; [
        nodejs_18
        nodePackages.pnpm
        (yarn.override { nodejs = nodejs_18; })
        nushell
      ];

      shellHook = ''
        echo "node `node --version`"
        exec nu
      '';
    };
  };
}
```

上記の`flake.nix`設定を使用すると、`nix develop`はnodejs 18の開発環境に入り、同時に`nushell`をインタラクティブシェルとして使用します。

## `pkgs.runCommand`による開発環境の作成

`pkgs.mkShell`で作成されたderivationは直接使用できず、`nix develop`でその環境に入る必要があります。

実際には、`pkgs.stdenv.mkDerivation`を使って、必要なソフトウェアパッケージを含むシェルラッパーを作成することもできます。これにより、そのラッパーを実行するだけで環境に入ることができます。

`mkDerivation`を直接使うのは少し面倒なので、Nixpkgsは`pkgs.runCommand`のような、この種のラッパーを作成するのに役立つ簡単な関数を提供しています。

例：

```nix
{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
  };

  outputs = { self , nixpkgs ,... }: let
    # system should match the system you are running on
    # system = "x86_64-linux";
    system = "x86_64-darwin";
  in {
    packages."${system}".dev = let
      pkgs = import nixpkgs {
        inherit system;
      };
      packages = with pkgs; [
          nodejs_20
          nodePackages.pnpm
          nushell
      ];
    in pkgs.runCommand "dev-shell" {
      # Dependencies that should exist in the runtime environment
      buildInputs = packages;
      # Dependencies that should only exist in the build environment
      nativeBuildInputs = [ pkgs.makeWrapper ];
    } ''
      mkdir -p $out/bin/
      ln -s ${pkgs.nushell}/bin/nu $out/bin/dev-shell
      wrapProgram $out/bin/dev-shell --prefix PATH : ${pkgs.lib.makeBinPath packages}
    '';
  };
}
```

そして`nix run .#dev`または`nix shell .#dev --command 'dev-shell'`を実行すると、nushellセッションに入り、その中で`node`や`pnpm`コマンドを正常に使用できます。

この方法で生成されたラッパーは実行可能ファイルであり、実際には`nix run`コマンドに依存しません。例えば、NixOSの`environment.systemPackages`を使ってこのラッパーをインストールし、直接実行することができます。

```nix
{pkgs, lib, ...}:{

  environment.systemPackages = [
    # dev-shellをシステム環境にインストールする
    (let
      packages = with pkgs; [
          nodejs_20
          nodePackages.pnpm
          nushell
      ];
    in pkgs.runCommand "dev-shell" {
      # Dependencies that should exist in the runtime environment
      buildInputs = packages;
      # Dependencies that should only exist in the build environment
      nativeBuildInputs = [ pkgs.makeWrapper ];
    } ''
      mkdir -p $out/bin/
      ln -s ${pkgs.nushell}/bin/nu $out/bin/dev-shell
      wrapProgram $out/bin/dev-shell --prefix PATH : ${pkgs.lib.makeBinPath packages}
    '')
  ];
}
```

上記の設定をいずれかのNixOSモジュールに追加し、`sudo nixos-rebuild switch`でデプロイすると、`dev-shell`コマンドで直接その開発環境に入ることができます。これが`pkgs.runCommand`が`pkgs.mkShell`と比べて特別な点です。

関連ソースコード：

- [pkgs/build-support/trivial-builders/default.nix - runCommand](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/pkgs/build-support/trivial-builders/default.nix#L21-L49)
- [pkgs/build-support/setup-hooks/make-wrapper.sh](https://github.com/NixOS/nixpkgs/blob/nixos-25.05/pkgs/build-support/setup-hooks/make-wrapper.sh)

## 任意のNixパッケージのビルド環境に入る

次に`nix develop`を見てみましょう。まず`nix develop --help`が出力するヘルプドキュメントを読んでみます。

```
Name
    nix develop - run a bash shell that provides the build environment of a derivation

Synopsis
    nix develop [option...] installable
# ......
```

`nix develop`が受け入れる引数は`installable`であることがわかります。これは、`pkgs.mkShell`で作成された環境だけでなく、任意のinstallableなNixパッケージの開発環境に入ることができることを意味します。

デフォルトでは、`nix develop`コマンドはflake outputsの以下の属性を試します：

- `devShells.<system>.default`
- `packages.<system>.default`

もし`nix develop /path/to/flake#<name>`のようにflakeパッケージのアドレスとflake output nameを指定した場合、`nix develop`コマンドはflake outputsの以下の属性を試します：

- `devShells.<system>.<name>`
- `packages.<system>.<name>`
- `legacyPackages.<system>.<name>`

それでは試してみましょう。まず、現在の環境に`c++`や`g++`といったコンパイル関連のコマンドがないことを確認します。

```shell
ryan in 🌐 aquamarine in ~
› c++
c++: command not found

ryan in 🌐 aquamarine in ~
› g++
g++: command not found
```

次に`nix develop`で`hello`のビルド環境に入り、再度テストしてみます。

```shell
# login to the build environment of the package `hello`
ryan in 🌐 aquamarine in ~
› nix develop nixpkgs#hello

ryan in 🌐 aquamarine in ~ via ❄️  impure (hello-2.12.1-env)
› env | grep CXX
CXX=g++

ryan in 🌐 aquamarine in ~ via ❄️  impure (hello-2.12.1-env)
› c++ --version
g++ (GCC) 12.3.0
Copyright (C) 2022 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

ryan in 🌐 aquamarine in ~ via ❄️  impure (hello-2.12.1-env)
› g++ --version
g++ (GCC) 12.3.0
Copyright (C) 2022 Free Software Foundation, Inc.
This is free software; see the source for copying conditions.  There is NO
warranty; not even for MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
```

`CXX`や`CXXCPP`環境変数が設定され、`c++`や`g++`などのコマンドも正常に使えるようになっていることがわかります。

さらに、`hello`というNixパッケージの各ビルドフェーズのコマンドも正常に呼び出せます。

> 事前に説明しておくと、Nixパッケージのすべてのビルドフェーズとそのデフォルトの実行順序は次のとおりです：`$prePhases unpackPhase patchPhase $preConfigurePhases configurePhase $preBuildPhases buildPhase checkPhase $preInstallPhases installPhase fixupPhase installCheckPhase $preDistPhases distPhase $postPhases`

```shell
# ソースアーカイブを展開する
ryan in 🌐 aquamarine in /tmp/xxx via ❄️  impure (hello-2.12.1-env)
› unpackPhase
unpacking source archive /nix/store/pa10z4ngm0g83kx9mssrqzz30s84vq7k-hello-2.12.1.tar.gz
source root is hello-2.12.1
setting SOURCE_DATE_EPOCH to timestamp 1653865426 of file hello-2.12.1/ChangeLog

ryan in 🌐 aquamarine in /tmp/xxx via ❄️  impure (hello-2.12.1-env)
› ls
hello-2.12.1

ryan in 🌐 aquamarine in /tmp/xxx via ❄️  impure (hello-2.12.1-env)
› cd hello-2.12.1/

# Makefileを生成する
ryan in 🌐 aquamarine in /tmp/xxx/hello-2.12.1 via ❄️  impure (hello-2.12.1-env)
› configurePhase
configure flags: --prefix=/tmp/xxx/outputs/out --prefix=/tmp/xxx/outputs/out
checking for a BSD-compatible install... /nix/store/02dr9ymdqpkb75vf0v1z2l91z2q3izy9-coreutils-9.3/bin/install -c
checking whether build environment is sane... yes
checking for a thread-safe mkdir -p... /nix/store/02dr9ymdqpkb75vf0v1z2l91z2q3izy9-coreutils-9.3/bin/mkdir -p
checking for gawk... gawk
checking whether make sets $(MAKE)... yes
checking whether make supports nested variables... yes
checking for gcc... gcc
# ......
checking that generated files are newer than configure... done
configure: creating ./config.status
config.status: creating Makefile
config.status: creating po/Makefile.in
config.status: creating config.h
config.status: config.h is unchanged
config.status: executing depfiles commands
config.status: executing po-directories commands
config.status: creating po/POTFILES
config.status: creating po/Makefile

# パッケージをビルドする
ryan in 🌐 aquamarine in /tmp/xxx/hello-2.12.1 via C v12.3.0-gcc via ❄️  impure (hello-2.12.1-env) took 2s
› buildPhase
build flags: SHELL=/run/current-system/sw/bin/bash
make  all-recursive
make[1]: Entering directory '/tmp/xxx/hello-2.12.1'
# ......
ranlib lib/libhello.a
gcc  -g -O2   -o hello src/hello.o  ./lib/libhello.a
make[2]: Leaving directory '/tmp/xxx/hello-2.12.1'
make[1]: Leaving directory '/tmp/xxx/hello-2.12.1'

# ビルドされたプログラムを実行する
ryan in 🌐 aquamarine in /tmp/xxx/hello-2.12.1 via C v12.3.0-gcc via ❄️  impure (hello-2.12.1-env)
› ./hello
Hello, world!
```

この使い方の主な応用シーンは、あるNixパッケージのビルドプロセスをデバッグしたり、そのビルド環境でいくつかのコマンドを実行したりすることです。

## `nix build`

`nix build`はソフトウェアパッケージをビルドし、カレントディレクトリに`result`という名前のシンボリックリンクを作成して、そのビルド結果にリンクします。

例：

```bash
# `nixpkgs` flakeの `ponysay` パッケージをビルドする
nix build "nixpkgs#ponysay"
# ビルドされたponysayコマンドを使用する
› ./result/bin/ponysay 'hey buddy!'
 ____________
< hey buddy! >
 ------------
     \
      \
       \
       ▄▄  ▄▄ ▄ ▄
    ▀▄▄▄█▄▄▄▄▄█▄▄▄
   ▀▄███▄▄██▄██▄▄██
  ▄██▄███▄▄██▄▄▄█▄██
 █▄█▄██▄█████████▄██
  ▄▄█▄█▄▄▄▄▄████████
 ▀▀▀▄█▄█▄█▄▄▄▄▄█████         ▄   ▄
    ▀▄████▄▄▄█▄█▄▄██       ▄▄▄▄▄█▄▄▄
    █▄██▄▄▄▄███▄▄▄██    ▄▄▄▄▄▄▄▄▄█▄▄
    ▀▄▄██████▄▄▄████    █████████████
       ▀▀▀▀▀█████▄▄ ▄▄▄▄▄▄▄▄▄▄██▄█▄▄▀
            ██▄███▄▄▄▄█▄▄▀  ███▄█▄▄▄█▀
            █▄██▄▄▄▄▄████   ███████▄██
            █▄███▄▄█████    ▀███▄█████▄
            ██████▀▄▄▄█▄█    █▄██▄▄█▄█▄
           ███████ ███████   ▀████▄████
           ▀▀█▄▄▄▀ ▀▀█▄▄▄▀     ▀██▄▄██▀█
                                ▀  ▀▀█
```

## `nix profile`を使用して日常のエンターテイメント環境と開発環境を別々に管理する

`nix profile`はNixOSでユーザー環境を管理するためのツールで、複数のユーザー環境を作成・管理し、必要に応じて異なる環境に切り替えることができます。

`nix develop`とは異なり、`nix profile`はユーザーレベルのシステム環境を管理するものであり、一時的に作成されるシェル環境ではありません。そのため、Jetbrains IDEやVSCodeなどのIDEとの互換性がはるかに良く、IDE内で設定した開発環境が使えないという状況にはなりません。

TODO 未完

## その他のコマンド

他にも`nix flake init`などのコマンドがありますが、詳細は[New Nix Commands][New Nix Commands]を参照して学習・研究してください。ここでは詳しく説明しません。

## 参考文献

- [pkgs.mkShell - nixpkgs manual](https://nixos.org/manual/nixpkgs/stable/#sec-pkgs-mkShell)
- [A minimal nix-shell](https://fzakaria.com/2021/08/02/a-minimal-nix-shell.html)
- [Wrapping packages - NixOS Cookbook](https://wiki.nixos.org/wiki/Nix_Cookbook#Wrapping_packages)
- [One too many shell, Clearing up with nix' shells nix shell and nix-shell - Yannik Sander](https://blog.ysndr.de/posts/guides/2021-12-01-nix-shells/)
- [Shell Scripts - NixOS Wiki](https://wiki.nixos.org/wiki/Shell_Scripts)

[New Nix Commands]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix.html
