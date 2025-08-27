# システムのアップデート {#update-nixos-system}

Flakes を使うとシステムの更新がとても簡単になります。単に次のコマンドを、`/etc/nixos` または設定を保存している他のディレクトリで実行するだけです。

> **注意**: `/etc/nixos` ディレクトリは `root` によって所有されており、`root` のみが書き込み可能です。そのため、もしあなたの flake がこのディレクトリにある場合、設定ファイルを更新するには `sudo` を使う必要があります。

```shell
# flake.lockを更新する
nix flake update

# または、home-manager のような特定の input のみを更新する
nix flake update home-manager

# 更新を適用する（設定がデフォルトの /etc/nixos にある場合は、後ろの --flake . は省略可能です）
sudo nixos-rebuild switch --flake .

# または、一つのコマンドで flake.lock の更新と新しい設定のデプロイを同時に行う（これは "nix flake update" を先に実行するのと同じです）
sudo nixos-rebuild switch --recreate-lock-file --flake .
```

`nixos-rebuild switch` の実行中に `sha256 mismatch` のようなエラーが発生することがありますが、通常は `nix flake update` を実行して `flake.lock` を更新することで解決できます。
