# 新世代Nixコマンドラインツールの使い方 {#flake-commands-usage}

`nix-command`と`flakes`機能を有効にすると、Nixが提供する新世代のコマンドラインツール[New Nix Commands][New Nix Commands]が利用できます。ここでは主に`nix shell`と`nix run`の2つのコマンドを紹介します。他の重要なコマンド（`nix shell`や`nix build`など）は「NixOSで開発作業を行う」章で詳しく解説します。

## `nix shell`

`nix shell`は、指定したNixパッケージを含む環境に入り、そのための対話型シェルを起動するコマンドです：

```shell
# helloが存在しない場合
› hello
hello: command not found

# helloとcowsayを含むシェル環境に入る
› nix shell nixpkgs#hello nixpkgs#cowsay

# helloが使えるようになる
› hello
Hello, world!

# cowsayも使える
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

`nix shell`は一時的にソフトウェアを試したい場合や、クリーンな環境を素早く作りたい場合に便利です。

## `nix run`

`nix run`は、指定したNixパッケージを含む環境を作成し、その中でパッケージを即座に実行するコマンドです（システムにインストールはされません）：

```shell
# helloが存在しない場合
› hello
hello: command not found

# helloを含む環境を作り、即座に実行
› nix run nixpkgs#hello
Hello, world!
```

`nix run`は、Derivationの`meta.mainProgram`、`pname`、`name`属性の順で実行するプログラムを決定します。

たとえば、上記のhelloパッケージでは`nix run`は`$out/bin/hello`を実行します。

他にも例を挙げます：

```bash
# このコマンドの意味：
#   `nixpkgs#ponysay`はnixpkgs Flake内のponysayパッケージを指す
#   `nixpkgs`はflake registry idで、<https://github.com/NixOS/flake-registry/blob/master/flake-registry.json>で解決される
#   このコマンドは新しい環境を作り、nixpkgsのponysayパッケージを実行する
#   （nixパッケージはflake outputsの一種）
echo "Hello Nix" | nix run "nixpkgs#ponysay"

# 完全なflake URIを使った例
#   registry idではなく、githubのURLで指定
echo "Hello Nix" | nix run "github:NixOS/nixpkgs/nixos-unstable#ponysay"
```

## `nix run`と`nix shell`の主な用途

これらは一時的なコマンド実行や、たとえば新しいNixOSマシンでgitが未インストールの状態で設定リポジトリをクローンしたい場合などに便利です：

```bash
nix run nixpkgs#git clone git@github.com:ryan4yin/nix-config.git
```

または：

```bash
nix shell nixpkgs#git
git clone git@github.com:ryan4yin/nix-config.git
```

[New Nix Commands]: https://nixos.org/manual/nix/stable/command-ref/new-cli/nix.html
