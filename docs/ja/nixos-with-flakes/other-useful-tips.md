# NixOS のその他の実用的なヒント

## 詳細なエラー情報の表示

設定をデプロイする際にエラーが発生した場合は、`nixos-rebuild` コマンドに `--show-trace --print-build-logs --verbose` パラメータを追加して、詳細なエラー情報を取得してみてください。以下に例を示します：

```bash
cd /etc/nixos
sudo nixos-rebuild switch --flake .#myhost --show-trace --print-build-logs --verbose

# より簡潔なバージョン
sudo nixos-rebuild switch --flake .#myhost --show-trace -L -v
```

## Git を使用して NixOS 設定を管理する {#git-manage-nixos-config}

NixOS の設定ファイルはプレーンテキストなので、通常の dotfiles と同様に Git で管理できます。これにより、履歴バージョンへのロールバックや、複数のマシンでの設定の同期が容易になります。

> 注意：Git を使用すると、Git で追跡されていないすべてのファイルは Nix に無視されます。特定のファイルが見つからないという Nix のエラーが発生した場合、それは `git add` していないことが原因かもしれません。

また、Nix Flakes の設定は必ずしも `/etc/nixos` ディレクトリに置く必要はなく、任意のディレクトリに配置できます。デプロイ時に正しいパスを指定するだけです。

> 前の第3節のコードコメントで説明したように、`sudo nixos-rebuild switch --flake .#xxx` の `--flake` パラメータで Flakes 設定のフォルダパスを指定し、`#` の後の値で outputs 名を指定できます。

例えば、私は Nix Flakes の設定を `~/nixos-config` ディレクトリに置き、`/etc/nixos` ディレクトリにシンボリックリンクを作成しています：

```shell
sudo mv /etc/nixos /etc/nixos.bak  # 元の設定をバックアップ
sudo ln -s ~/nixos-config/ /etc/nixos
```

これで、`~/nixos-config` ディレクトリで Git を使って設定を管理できます。設定は通常のユーザー権限で使用でき、所有者が root である必要はありません。

別の方法は、`/etc/nixos` を直接削除し、デプロイのたびに設定ファイルのパスを指定することです：

```shell
sudo mv /etc/nixos /etc/nixos.bak  # 元の設定をバックアップ
cd ~/nixos-config

# --flake .#my-nixos パラメータで現在のフォルダの flake.nix を使用し、
# 使用する nixosConfiguraitons 名は my-nixos
sudo nixos-rebuild switch --flake .#my-nixos
```

どちらの方法でも構いません。個人の好みによります。設定が完了すれば、システムのロールバックも非常に簡単になります。前のコミットに切り替えるだけです：

```shell
cd ~/nixos-config
# 前のコミットにロールバック
git checkout HEAD^1
# デプロイ
sudo nixos-rebuild switch --flake .#my-nixos
```

Git の詳細な操作についてはここでは説明しませんが、通常の場合、ロールバックは Git で直接完了できます。システムが完全にクラッシュした場合にのみ、再起動して grub に入り、前の履歴バージョンからシステムを起動する必要があります。

## 履歴データの表示とクリーンアップ {#view-and-delete-history}

前述のように、NixOS の各デプロイは新しいバージョンを生成し、すべてのバージョンはシステムの起動エントリに追加されます。コンピュータを再起動する以外に、次のコマンドで現在利用可能なすべての履歴バージョンを照会できます：

```shell
nix profile history --profile /nix/var/nix/profiles/system
```

また、履歴バージョンをクリーンアップしてストレージスペースを解放するコマンドは次のとおりです：

```shell
# 7 日より古いすべての履歴バージョンをクリーンアップ
sudo nix profile wipe-history --older-than 7d --profile /nix/var/nix/profiles/system
# 履歴バージョンをクリーンアップしてもデータは削除されません。未使用のパッケージをすべて削除するには、root として gc コマンドを実行する必要があります
sudo nix-collect-garbage --delete-old

# 以下の issue のため、home-manager の履歴バージョンとパッケージを削除するには、現在のユーザーとして gc コマンドを実行する必要があります
# https://github.com/NixOS/nix/issues/8508
nix-collect-garbage --delete-old
```

## なぜ特定のパッケージがインストールされたのかを調べる {#why-some-packages-are-installed}

なぜ特定のパッケージがインストールされたのか、現在の環境で誰がそれに依存しているのかを調べるには：

1. `nix-tree` と `rg` を含むシェルに入る：`nix shell nixpkgs#nix-tree nixpkgs#ripgrep`
2. ` nix-store --gc --print-roots | rg -v '/proc/' | rg -Po '(?<= -> ).*' | xargs -o nix-tree`
3. `/<package-name>` で調べたいパッケージを検索
4. `w` を入力して、誰がそれに依存しているか（`why depends`）、および完全な依存関係チェーンを確認します。

## ストレージスペースの節約

以下の設定は、NixOS のディスク使用量を削減するのに役立ちます。NixOS の設定に追加することを検討してください：

```nix
{ lib, pkgs, ... }:

{
  # ......

  # あまり多くの世代を保持する必要はありません
  boot.loader.systemd-boot.configurationLimit = 10;
  # boot.loader.grub.configurationLimit = 10;

  # ディスク使用量を低く保つために週に一度ガベージコレクションを実行
  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 1w";
  };

  # ストレージを最適化
  # 手動でストアを最適化することもできます：
  #    nix-store --optimise
  # https://nixos.org/manual/nix/stable/command-ref/conf-file.html#conf-auto-optimise-store
  nix.settings.auto-optimise-store = true;
}
```
