# クロスプラットフォームコンパイル

どのLinuxプラットフォームでも、クロスプラットフォームビルドには2つの方法があります。x86_64アーキテクチャでaarch64アーキテクチャのプログラムをビルドする場合を例に、2つのビルド方法を以下に説明します。

1. QEMUを使用してaarch64アーキテクチャをエミュレートし、エミュレータ内でプログラムをコンパイルする
   1. 欠点：命令セットのエミュレーションによりパフォーマンスが低い
   2. 利点：NixOSのバイナリキャッシュを利用でき、すべてを自分でコンパイルする必要がない
2. クロスコンパイラを使用してaarch64アーキテクチャのプログラムをコンパイルする
   1. 欠点：NixOSのバイナリキャッシュを利用できず、すべてを自分でコンパイルする必要がある（クロスコンパイルにもキャッシュはあるが、中身はほとんどない）
   2. 利点：命令セットのエミュレーションが不要で、パフォーマンスが高い

方法1を使用する場合、ビルドマシンのNixOS設定でaarch64アーキテクチャのbinfmt_miscを有効にする必要があります。

方法2を使用する場合、binfmt_miscを有効にする必要はありませんが、クロスコンパイルツールチェーンを使用してコンパイルを実行する必要があります。

## クロスコンパイル

nixpkgsには、`pkgsCross`という名前の一連の定義済みクロスコンパイルツールチェーンが含まれています。まず、`nix repl`を使用して、利用可能なツールチェーンを確認してみましょう。

```shell
› nix repl '<nixpkgs>'
warning: future versions of Nix will require using `--file` to load a file
Welcome to Nix 2.13.3. Type :? for help.

Loading installable ''...
Added 19273 variables.
nix-repl> pkgsCross.<TAB>
pkgsCross.aarch64-android             pkgsCross.msp430
pkgsCross.aarch64-android-prebuilt    pkgsCross.musl-power
pkgsCross.aarch64-darwin              pkgsCross.musl32
pkgsCross.aarch64-embedded            pkgsCross.musl64
pkgsCross.aarch64-multiplatform       pkgsCross.muslpi
pkgsCross.aarch64-multiplatform-musl  pkgsCross.or1k
pkgsCross.aarch64be-embedded          pkgsCross.pogoplug4
pkgsCross.arm-embedded                pkgsCross.powernv
pkgsCross.armhf-embedded              pkgsCross.ppc-embedded
pkgsCross.armv7a-android-prebuilt     pkgsCross.ppc64
pkgsCross.armv7l-hf-multiplatform     pkgsCross.ppc64-musl
pkgsCross.avr                         pkgsCross.ppcle-embedded
pkgsCross.ben-nanonote                pkgsCross.raspberryPi
pkgsCross.fuloongminipc               pkgsCross.remarkable1
pkgsCross.ghcjs                       pkgsCross.remarkable2
pkgsCross.gnu32                       pkgsCross.riscv32
pkgsCross.gnu64                       pkgsCross.riscv32-embedded
pkgsCross.i686-embedded               pkgsCross.riscv64
pkgsCross.iphone32                    pkgsCross.riscv64-embedded
pkgsCross.iphone32-simulator          pkgsCross.rx-embedded
pkgsCross.iphone64                    pkgsCross.s390
pkgsCross.iphone64-simulator          pkgsCross.s390x
pkgsCross.loongarch64-linux           pkgsCross.sheevaplug
pkgsCross.m68k                        pkgsCross.vc4
pkgsCross.mingw32                     pkgsCross.wasi32
pkgsCross.mingwW64                    pkgsCross.x86_64-darwin
pkgsCross.mips-linux-gnu              pkgsCross.x86_64-embedded
pkgsCross.mips64-linux-gnuabi64       pkgsCross.x86_64-freebsd
pkgsCross.mips64-linux-gnuabin32      pkgsCross.x86_64-netbsd
pkgsCross.mips64el-linux-gnuabi64     pkgsCross.x86_64-netbsd-llvm
pkgsCross.mips64el-linux-gnuabin32    pkgsCross.x86_64-unknown-redox
pkgsCross.mipsel-linux-gnu
pkgsCross.mmix
```

flake全体の`pkgs`をクロスコンパイルツールチェーンに設定したい場合は、`flake.nix`にモジュールを追加するだけです。以下に例を示します。

```nix{14-20}
{
  description = "NixOS running on LicheePi 4A";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
  };

  outputs = inputs@{ self, nixpkgs, ... }: {
    nixosConfigurations.lp4a = nixpkgs.lib.nixosSystem {
      # native platform
      system = "x86_64-linux";
      modules = [

        # add this module, to enable cross-compilation.
        {
          nixpkgs.crossSystem = {
            # target platform
            system = "riscv64-linux";
          };
        }

        # ...... other modules
      ];
    };
  };
}
```

モジュール内の`nixpkgs.crossSystem`パラメータは、`pkgs`をクロスコンパイルツールチェーンに設定するために使用され、これによりビルドされるすべてのコンテンツは`riscv64-linux`アーキテクチャになります。

## エミュレーションによるクロスプラットフォームコンパイル

2番目の方法は、エミュレーションによるクロスプラットフォームコンパイルです。この方法では、クロスコンパイルツールチェーンは必要ありません。

この方法を使用するには、まずビルドマシンの設定でbinfmt_miscモジュールを有効にする必要があります。ビルドマシンがNixOSの場合、以下の設定をNixOSモジュールに追加することで、`aarch64-linux`と`riscv64-linux`の2つのアーキテクチャのエミュレートされたビルドシステムを有効にできます。

```nix{6}
{ ... }:
{
  # ......

  # Enable binfmt emulation.
  boot.binfmt.emulatedSystems = [ "aarch64-linux" "riscv64-linux" ];

  # ......
}
```

`flake.nix`の設定は非常に簡単で、前のクロスコンパイルの設定よりもさらに簡単です。以下に例を示します。

```nix{11}
{
  description = "NixOS running on LicheePi 4A";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
  };

  outputs = inputs@{ self, nixpkgs, ... }: {
    nixosConfigurations.lp4a = nixpkgs.lib.nixosSystem {
      # native platform
      system = "riscv64-linux";
      modules = [
        # ...... other modules
      ];
    };
  };
}
```

ご覧のとおり、追加のモジュールは一切追加せず、単に`system`を`riscv64-linux`に指定しただけです。Nixはビルド時に現在のシステムが`riscv64-linux`であるかどうかを自動的に検出し、そうでない場合はQEMUを介して自動的にエミュレーションビルドを実行します。ユーザーにとって、これらの低レベルの操作は完全に透過的です。

## Linux binfmt_misc

これまでは使い方について説明してきましたが、より低レベルの詳細に興味がある場合は、ここで簡単に紹介します。

binfmt_miscは、Linuxカーネルの機能で、正式名称は「Kernel Support for miscellaneous Binary Formats」（雑多なバイナリフォーマットのカーネルサポート）です。これにより、LinuxはX86_64、ARM64、RISCV64など、ほぼすべてのCPUアーキテクチャのプログラムを実行できるようになります。

binfmt_miscが任意のフォーマットのプログラムを実行できるようにするには、少なくとも2つのことが必要です。特定のフォーマットのバイナリプログラムを識別する方法と、それに対応するインタプリタの場所です。binfmt_miscは強力に聞こえますが、その実装方法は意外と理解しやすいです。bashインタプリタがスクリプトファイルの最初の行（例：`#!/usr/bin/python3`）から、そのファイルをどのインタプリタで実行すべきかを知るのと同様に、binfmt_miscも一連のルールを事前に設定しています。例えば、バイナリファイルのヘッダの特定の位置にあるマジックナンバーを読み取ったり、ファイル拡張子（例：.exe、.py）に基づいて実行可能ファイルのフォーマットを判断したりして、対応するインタプリタを呼び出してプログラムを実行します。Linuxのデフォルトの実行可能ファイルフォーマットはELFですが、binfmt_miscの登場により、Linuxの実行制限が広がり、さまざまなバイナリファイルがそれぞれのインタプリタを選択して実行できるようになりました。

あるフォーマットのバイナリプログラムを登録するには、`:name:type:offset:magic:mask:interpreter:flags`というフォーマットの文字列を`/proc/sys/fs/binfmt_misc/register`に書き込む必要があります。フォーマットの詳細な説明はここでは省略します。

上記のbinfmt_miscの登録情報を手動で書き込むのは面倒なため、コミュニティは自動的に登録を支援するコンテナを提供しています。このコンテナがbinfmtです。このコンテナを実行するだけで、さまざまなフォーマットのbinfmt_miscエミュレータをインストールできます。例を挙げます。

```shell
# すべてのアーキテクチャを登録
podman run --privileged --rm tonistiigi/binfmt:latest --install all

# 一般的なarm/riscvアーキテクチャのみを登録
docker run --privileged --rm tonistiigi/binfmt --install arm64,riscv64,arm
```

binfmt_miscモジュールはLinux 2.6.12-rc2で導入され、その後何度か機能がわずかに変更されました。Linux 4.8では、「F」（fix binary）フラグが追加され、mount名前空間の変更やchroot後の環境でもインタプリタを正常に呼び出してバイナリプログラムを実行できるようになりました。マルチアーキテクチャコンテナをビルドする必要があるため、「F」フラグを使用してbinfmt_miscがコンテナ内で正常に動作するようにするには、カーネルバージョンが4.8以上である必要があります。

全体として、非ネイティブアーキテクチャのプログラムを実行するために明示的にインタプリタを呼び出す一般的なケースと比較して、binfmt_miscがもたらす重要な意味は透明性です。binfmt_miscを使用すると、ユーザーはプログラムを実行する際にどのインタプリタを使用するかを気にする必要がなくなり、あたかもどのアーキテクチャのプログラムでも直接実行できるかのように見えます。また、設定可能な「F」フラグはさらに優れており、インタプリタプログラムがインストールされるとすぐにメモリにロードされ、その後の環境の変更が実行プロセスに影響を与えることはありません。

## カスタムビルドツールチェーン

カスタムのツールチェーンを使用してビルドする必要がある場合があります。たとえば、自分でコンパイルしたgccを使用したり、自分でコンパイルしたmusl libcを使用したりするなどです。このような変更は、overlaysを使用して実現できます。

例として、異なるgccバージョンを使用してみましょう。`nix repl`を使用してテストします。

```shell
› nix repl -f '<nixpkgs>'
Welcome to Nix 2.13.3. Type :? for help.

Loading installable ''...
Added 17755 variables.

# overlaysを使用してgccを置き換える
nix-repl> a = import <nixpkgs> { crossSystem = { config = "riscv64-unknown-linux-gnu"; }; overlays = [ (self: super: { gcc = self.gcc12; }) ]; }

# gccのバージョンを確認すると、確かに12.2に変更されている
nix-repl> a.pkgsCross.riscv64.stdenv.cc
«derivation /nix/store/jjvvwnf3hzk71p65x1n8bah3hrs08bpf-riscv64-unknown-linux-gnu-stage-final-gcc-wrapper-12.2.0.drv»

# 変更されていないgccのバージョンを確認すると、まだ11.3
nix-repl> pkgs.pkgsCross.riscv64.stdenv.cc
«derivation /nix/store/pq3g0wq3yfc4hqrikr03ixmhqxbh35q7-riscv64-unknown-linux-gnu-stage-final-gcc-wrapper-11.3.0.drv»
```

では、Flakesでこの方法を使用するにはどうすればよいでしょうか？`flake.nix`の例を以下に示します。

```nix{13-20}
{
  description = "NixOS running on LicheePi 4A";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05-small";
  };

  outputs = { self, nixpkgs, ... }:
  {
    nixosConfigurations.lp4a = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      modules = [
        {
          nixpkgs.crossSystem = {
            config = "riscv64-unknown-linux-gnu";
          };

          # gcc12に切り替える
          nixpkgs.overlays = [ (self: super: { gcc = self.gcc12; }) ];
        }

        # other modules ......
      ];
    };
  };
}
```

上記の方法は、グローバルな`pkgs.gcc`を置き換えるため、多くのキャッシュが無効になり、ローカルで非常に多くのNixパッケージをビルドする必要が生じる可能性があります。

この問題を回避するためには、新しい`pkgs`インスタンスを作成し、変更したいパッケージをビルドするときにのみこのインスタンスを使用する方が良い方法です。`flake.nix`の例を以下に示します。

```nix{10-19,34-37}
{
  description = "NixOS running on LicheePi 4A";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05-small";
  };

  outputs = { self, nixpkgs, ... }: let
    # 新しいpkgsインスタンスをカスタムし、gcc12を使用する
    pkgs-gcc12 = import nixpkgs {
      localSystem = "x86_64-linux";
      crossSystem = {
        config = "riscv64-unknown-linux-gnu";
      };

      overlays = [
        (self: super: { gcc = self.gcc12; })
      ];
    };
  in {
    nixosConfigurations.lp4a = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux";
      specialArgs = {
        # 新しいpkgsインスタンスをモジュールに渡す
        inherit pkgs-gcc12;
      };
      modules = [
        {
          nixpkgs.crossSystem = {
            config = "riscv64-unknown-linux-gnu";
          };
        }

        ({pkgs-gcc12, ...}: {
          # pkgs-gcc12インスタンスを使用する
          environment.systemPackages = [ pkgs-gcc12.hello ];
        })

        # other modules ......
      ];
    };
  };
}
```

上記の方法を使用すると、他のソフトウェアパッケージのビルドに影響を与えることなく、一部のソフトウェアパッケージのビルドツールチェーンを簡単にカスタマイズできます。

## 参考文献

- [Cross compilation - nix.dev](https://nix.dev/tutorials/cross-compilation)
- [容器镜像多架构支持介绍](https://www.cnblogs.com/frankming/p/16870285.html)
