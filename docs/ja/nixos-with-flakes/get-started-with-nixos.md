# NixOS を始める

Nix 言語の基本的な使い方を理解したら、Nix 言語を使って NixOS システムを設定し始めることができます。NixOS の標準設定ファイルは `/etc/nixos/configuration.nix` にあり、タイムゾーン、言語、キーボードレイアウト、ネットワーク、ユーザー、ファイルシステム、起動項目、デスクトップ環境など、システムのすべての宣言的設定が含まれています。

システムの変更を再現可能な方法で行いたい場合（これが最も推奨される方法です）、`/etc/nixos/configuration.nix` ファイルを手動で変更し、`sudo nixos-rebuild switch` コマンドを実行して設定を適用する必要があります。このコマンドは、設定ファイルに基づいて新しいシステム環境を生成し、その新しい環境をデフォルトの環境として設定します。同時に、前のシステム環境は保持され、grub の起動項目に追加されるため、新しい環境が起動できなくてもいつでも古い環境にロールバックできます。

`/etc/nixos/configuration.nix` は従来の Nix の設定方法である一方で、`nix-channel` で設定されたデータソースに依存し、バージョンロックの仕組みがないため、実際にはシステムの再現性を保証できません。Flakes を使えばシステムの再現性が保証され、システムの設定を簡単に管理できるので、こちらの方がより良いでしょう。

以下では、まず NixOS のデフォルトの設定方法でシステムを管理する方法を紹介し、その後より高度な Flakes に移ります。

## `/etc/nixos/configuration.nix` でシステムを設定する {#configuration-nix}

`/etc/nixos/configuration.nix` は、NixOS を設定するためのデフォルトかつ古典的な方法です。Flakes のような高度な機能はありませんが、今でも広く使われており、柔軟なシステム設定が可能です。

ここでは、ssh を有効にし、ユーザー `ryan` を追加する例を紹介します。`/etc/nixos/configuration.nix` に次の内容を追加してください：

```nix{14-38}
# この設定ファイルを編集して、システムにインストールするものを定義します。
# ヘルプは configuration.nix(5) の man ページと
# NixOS マニュアル（`nixos-help` を実行してアクセス可能）で利用できます。
{ config, pkgs, ... }:

{
  imports =
    [ # ハードウェアスキャンの結果を含めます。
      ./hardware-configuration.nix
    ];

  # 前の設定を省略...

  # 新しいユーザー ryan を追加
  users.users.ryan = {
    isNormalUser = true;
    description = "ryan";
    extraGroups = [ "networkmanager" "wheel" ];
    openssh.authorizedKeys.keys = [
        # 自分の公開鍵に置き換えてください
        "ssh-ed25519 <some-public-key> ryan@ryan-pc"
    ];
    packages = with pkgs; [
      firefox
    #  thunderbird
    ];
  };

  # OpenSSH バックグラウンドサービスを有効にする
  services.openssh = {
    enable = true;
    settings = {
      X11Forwarding = true;
      PermitRootLogin = "no"; # rootログインを無効にする
      PasswordAuthentication = false; # パスワードログインを無効にする
    };
    openFirewall = true;
  };

  # その他の設定を省略...
}
```

この設定では、openssh サービスを有効化し、ユーザー `ryan` に SSH 公開鍵を追加し、パスワードログインを無効にしています。

設定を反映させるには、`sudo nixos-rebuild switch` を実行してください。このコマンドで変更が適用され、新しいシステム環境が生成されてデフォルトとして設定されます。以降は SSH キーでログインできるようになります。

> デプロイ時にエラーが発生した場合は、`nixos-rebuild` コマンドに `--show-trace --print-build-logs --verbose` を付けて詳細なエラー内容を確認してください。

このように、`/etc/nixos/configuration.nix` を編集し、`sudo nixos-rebuild switch` で反映することで、システムの状態を再現可能な形で管理できます。

設定項目やドキュメントを探すには、次の方法が便利です:

- Googleなどの検索エンジンを使って例えば「Chrome NixOS」と検索すると、Chrome に関する NixOS 関連の情報を見つけられます
- [NixOS Options Search](https://search.nixos.org/options) でキーワード検索ができます
- システム全体の設定は [NixOS Manual の Configuration セクション](https://nixos.org/manual/nixos/unstable/index.html#ch-configuration) も参考になります
- GitHubの [nixpkgs](https://github.com/NixOS/nixpkgs) リポジトリで直接キーワード検索し、該当するソースコードを読むのも有効です

## 参考

- [Overview of the NixOS Linux distribution](https://wiki.nixos.org/wiki/Overview_of_the_NixOS_Linux_distribution)
