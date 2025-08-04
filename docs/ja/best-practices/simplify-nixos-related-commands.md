# NixOS関連コマンドの簡素化

# NixOS 関連コマンドの簡素化

NixOS 関連のコマンドを簡単にするために、わたしは [just](https://github.com/casey/just) を使っています。これはとても便利です。

もちろん、 Makefile や [cargo-make](https://github.com/sagiegurari/cargo-make) など、似たようなツールを使っても構いません。ここでは、わたしのやり方を参考として紹介します。

以下は、わたしの Justfile の例です：

> 最新の Justfile は [ryan4yin/nix-config/Justfile](https://github.com/ryan4yin/nix-config/blob/main/Justfile) で公開しています。

````Makefile
# just はコマンドランナーで、 Justfile は Makefile に似ていますが、よりシンプルです。

############################################################################
#
#  ローカルマシン向け Nix コマンド
#
############################################################################

```Makefile
# just is a command runner, Justfile is very similar to Makefile, but simpler.

############################################################################
#
#  Nix commands related to the local machine
#
############################################################################

deploy:
  nixos-rebuild switch --flake . --use-remote-sudo

debug:
  nixos-rebuild switch --flake . --use-remote-sudo --show-trace --verbose

up:
  nix flake update

# Update specific input
# usage: make upp i=home-manager
upp:
  nix flake update $(i)

history:
  nix profile history --profile /nix/var/nix/profiles/system

repl:
  nix repl -f flake:nixpkgs

clean:
  # remove all generations older than 7 days
  sudo nix profile wipe-history --profile /nix/var/nix/profiles/system  --older-than 7d

gc:
  # garbage collect all unused nix store entries
  sudo nix store gc --debug
  sudo nix-collect-garbage --delete-old

############################################################################
#
#  Idols, Commands related to my remote distributed building cluster
#
############################################################################

add-idols-ssh-key:
  ssh-add ~/.ssh/ai-idols

aqua: add-idols-ssh-key
  nixos-rebuild --flake .#aquamarine --target-host aquamarine --build-host aquamarine switch --use-remote-sudo

aqua-debug: add-idols-ssh-key
  nixos-rebuild --flake .#aquamarine --target-host aquamarine --build-host aquamarine switch --use-remote-sudo --show-trace --verbose

ruby: add-idols-ssh-key
  nixos-rebuild --flake .#ruby --target-host ruby --build-host ruby switch --use-remote-sudo

ruby-debug: add-idols-ssh-key
  nixos-rebuild --flake .#ruby --target-host ruby --build-host ruby switch --use-remote-sudo --show-trace --verbose

kana: add-idols-ssh-key
  nixos-rebuild --flake .#kana --target-host kana --build-host kana switch --use-remote-sudo

kana-debug: add-idols-ssh-key
  nixos-rebuild --flake .#kana --target-host kana --build-host kana switch --use-remote-sudo --show-trace --verbose

idols: aqua ruby kana

idols-debug: aqua-debug ruby-debug kana-debug
````

上記の `Justfile` ファイルを NixOS 設定のルートディレクトリに保存すると、`just` コマンドを使用して関連するコマンドを実行できます。たとえば、ここでは `just deploy` は NixOS 設定をローカルホストにデプロイし、`just idols` は私のリモートホストクラスターにデプロイします。

この`Justfile`をNix flakeのルートディレクトリに保存してください。その後、
`just deploy`を使用してローカルマシンに設定をデプロイし、`just idols`を
使用してすべてのリモートサーバーに設定をデプロイできます。

このアプローチは、Justfileのターゲット名の背後にNixOSコマンドを抽象化することで
NixOSコマンドの実行を簡素化し、よりユーザーフレンドリーで便利な体験を提供します。
