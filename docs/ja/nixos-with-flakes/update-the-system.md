# システムを更新する {#update-nixos-system}

Flakesを使うと、システムの更新がとても簡単になります。`/etc/nixos`や、設定ファイルを置いている他のディレクトリで、次のコマンドを実行するだけです：

> **注意**：`/etc/nixos`ディレクトリは`root`によって所有されており、`root`のみが書き込み可能です。そのため、もしあなたのFlakeがこのディレクトリにある場合、設定ファイルを更新するには`sudo`を使う必要があります。

```shell
# flake.lockを更新する
nix flake update

# または、home-managerのような特定のinputのみを更新する：
nix flake update home-manager

# 新しい設定をデプロイする（設定がデフォルトの/etc/nixosにある場合、後ろの --flake . は省略できます）
sudo nixos-rebuild switch --flake .

# または、一つのコマンドでflake.lockの更新と新しい設定のデプロイを同時に行う（これは "nix flake update" を先に実行するのと同じです）
sudo nixos-rebuild switch --recreate-lock-file --flake .
```

`nixos-rebuild switch`の実行中に`sha256 mismatch`のようなエラーが発生することがありますが、通常は`nix flake update`を実行して`flake.lock`を更新することで解決できます。
