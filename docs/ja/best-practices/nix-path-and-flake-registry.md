# Custom NIX_PATH と Flake Registry

## NIX_PATH の概要 {#nix-path-introduction}

Nix の検索パスは環境変数 `NIX_PATH` で制御されます。これは Linux の `PATH` と同じく、コロン区切りで複数のパスを指定できます。

Nix 式で `<name>` のような記法を使うと、 `NIX_PATH` 内の `name` という名前のパスが解決されます。

ただし Flakes 機能を使う場合、この方法は推奨されません。なぜなら Flake のビルドが可変な `NIX_PATH` に依存し、再現性が損なわれるからです。

それでも、たとえば `nix repl '<nixpkgs>'` のようなコマンドでは `NIX_PATH` が必要になる場面もあります。

## Flakes Registry の概要 {#flakes-registry-introduction}

Flake Registry は Flake の登録センターで、 `nix run` や `nix shell` などで長いリポジトリアドレスの代わりに短い ID を使えるようにします。

デフォルトでは、 Nix は <https://github.com/NixOS/flake-registry/blob/master/flake-registry.json> から ID に対応する GitHub リポジトリを検索します。

たとえば `nix run nixpkgs#ponysay hello` を実行すると、 Nix は自動的に上記の JSON から `nixpkgs` のリポジトリを取得し、 `flake.nix` を探して `ponysay` パッケージを実行します。

## Custom NIX_PATH と Flake Registry {#custom-nix-path-and-flake-registry-1}

> **注意：初心者はこのセクションをスキップしてください！ `nix-channel` を誤って無効化するとトラブルの元です。**

`NIX_PATH` と Flake Registry の役割は上記の通りです。普段は `nix repl '<nixpkgs>'` や `nix run nixpkgs#ponysay hello` などで使う `nixpkgs` がシステムのものと一致してほしいはずです。これは [NixOS 24.05][automatic flake registry] 以降デフォルトで実現されています。また、 flakes を使えば `nix-channel` は不要なので、無効化しても問題ありません。

[automatic flake registry]: https://github.com/NixOS/nixpkgs/pull/254405

NixOS の設定例：

```nix
{ nixpkgs, ... }: {
  nix.channel.enable = false; # nix-channel 関連のツールや設定を削除し flakes を使う

  # 通常は nixpkgs.lib.nixosSystem で自動設定されますが、使っていない場合は明示的に指定してください：
  # nixpkgs.flake.source = nixpkgs;
}
```

## 参考

- [Chapter 15. Nix Search Paths - Nix Pills](https://nixos.org/guides/nix-pills/nix-search-paths.html)
