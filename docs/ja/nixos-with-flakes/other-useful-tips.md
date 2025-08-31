# その他の便利なヒント

## 詳細なエラーメッセージを表示する {#show-detailed-error-messages}

デプロイ中にエラーが発生した場合、`nixos-rebuild` コマンドに `--show-trace --print-build-logs --verbose` オプションを追加することで、詳細なエラーメッセージを取得できます:

```bash
cd /etc/nixos
sudo nixos-rebuild switch --flake .#myhost --show-trace --print-build-logs --verbose

# より簡潔なバージョン
sudo nixos-rebuild switch --flake .#myhost --show-trace -L -v
```

## Git を使って設定を管理する {#git-manage-nixos-config}

NixOS の設定はテキストファイルの集合体であるため、Git によるバージョン管理に非常に適しています。また Git で管理することで、問題が発生した場合でも簡単に以前のバージョンに戻すことができます。

> 注意：Git を使用すると、Git で追跡されていないすべてのファイルは Nix に無視されます。特定のファイルが見つからないという Nix のエラーが発生した場合、それを `git add` していないことが原因かもしれません。

また、NixOS ではデフォルトで設定ファイルが `/etc/nixos` に配置されますが、この場所にあるファイルを変更するには root 権限が必要なため、日常的に使うには不便です。幸いなことに、Flakes を使えばどこでも好きな場所に flake を配置できるため、この問題を解決できます。

例えば、以下のように flake を `~/nixos-config` ディレクトリに配置し、`/etc/nixos` にシンボリックリンクを作成するという方法があります:

```shell
sudo mv /etc/nixos /etc/nixos.bak  # 元の設定をバックアップ
sudo ln -s ~/nixos-config/ /etc/nixos

# デフォルトの場所 （ /etc/nixos ） にある flake.nix をデプロイ
sudo nixos-rebuild switch
```

こうすることで `~/nixos-config` ディレクトリにある設定ファイルを Git で管理できます。設定ファイルは通常のユーザー権限で編集でき、root 権限は必要ありません。

また別の方法として、`/etc/nixos` を削除してしまい、デプロイのたびに設定ファイルのパスを指定することもできます:

```shell
sudo mv /etc/nixos /etc/nixos.bak  # 元の設定をバックアップ
cd ~/nixos-config

# --flake .#my-nixos と引数を指定することで、カレントディレクトリにある
# flake.nix の my-nixos という名前の nixosConfiguration をデプロイ
sudo nixos-rebuild switch --flake .#my-nixos
```

ご自分にとって最適な方を選んでください。一度設定を行えば、システムのロールバックはとっても簡単です。前のコミットに切り替えてデプロイするだけです:

```shell
cd ~/nixos-config
# 前のコミットに切り替える
git checkout HEAD^1
# デプロイ
sudo nixos-rebuild switch --flake .#my-nixos
```

高度な Git の操作についてここで説明はしませんが、通常の場合、ロールバックは Git の操作のみで完結します。システムが完全にクラッシュした場合にのみ、ブートローダーに切り替えて過去の履歴からシステムを起動する必要があります。

## 過去のデータの確認と削除 {#view-and-delete-history}

前述のように、NixOS ではデプロイごとに新しいバージョンが作成され、すべてのバージョンがシステムのブートオプションに追加されます。コンピュータを再起動する方法に加えて、次のコマンドでも現在利用可能なすべての過去のバージョンを確認することができます:

```shell
nix profile history --profile /nix/var/nix/profiles/system
```

また、過去のバージョンを削除してストレージ容量を解放するコマンドは次のとおりです:

```shell
# 7日より前のすべてのバージョンを削除
sudo nix profile wipe-history --older-than 7d --profile /nix/var/nix/profiles/system
# 履歴を消去しても未使用パッケージはガベージコレクトされないので
# root 権限で gc コマンドを実行する必要があります
sudo nix-collect-garbage --delete-old

# 以下の issue のため、home-manager の過去のデータを削除するには
# ユーザーごとに gc コマンドを実行する必要があります
# https://github.com/NixOS/nix/issues/8508
nix-collect-garbage --delete-old
```

## なぜ特定のパッケージがインストールされたのかを調べる {#why-some-packages-are-installed}

なぜ特定のパッケージがインストールされたのかを調べるには:

1. `nix-tree` と `ripgrep` (`rg`) が実行可能なシェル環境に入る: `nix shell nixpkgs#nix-tree nixpkgs#ripgrep`
2. ` nix-store --gc --print-roots | rg -v '/proc/' | rg -Po '(?<= -> ).*' | xargs -o nix-tree`
3. `/<package-name>` で調べたいパッケージを検索
4. `w` を入力すると、調べたいパッケージが依存しているパッケージと、完全な依存関係が表示される

## ディスク使用量の削減

以下の設定は、NixOS のディスク使用量を削減するのに役立ちます:

```nix
{ lib, pkgs, ... }:

{
  # ......

  # 残しておく世代数を制限
  boot.loader.systemd-boot.configurationLimit = 10;
  # boot.loader.grub.configurationLimit = 10;

  # ディスク使用量を少なく保つために週一でガベージコレクションを実行
  nix.gc = {
    automatic = true;
    dates = "weekly";
    options = "--delete-older-than 1w";
  };

  # ストレージを最適化
  # 手動でストアを最適化することもできます: nix-store --optimise
  # https://nixos.org/manual/nix/stable/command-ref/conf-file.html#conf-auto-optimise-store
  nix.settings.auto-optimise-store = true;
}
```
