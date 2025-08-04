# バイナリキャッシュサーバーの追加

前章では Nix Store とバイナリキャッシュの概念について説明しました。ここでは、複数のキャッシュサーバーを追加してパッケージのダウンロード速度を上げる方法を見ていきましょう。

## なぜキャッシュサーバーを追加するのか {#why-add-cache-servers}

Nix が提供する公式キャッシュサーバー <https://cache.nixos.org> は、ほとんどの一般的なソフトウェアパッケージのバイナリキャッシュを提供していますが、すべてのユーザーのニーズを満たすわけではありません。次のような場合には、追加のキャッシュサーバーが必要になります。

1.  nix-community のキャッシュサーバー <https://nix-community.cachix.org> のように、サードパーティプロジェクトのキャッシュサーバーを追加して、これらのプロジェクトのビルドを高速化する。
2.  ユーザーに最も近いキャッシュサーバーのミラーサイトを追加して、ダウンロードを高速化する。
3.  自前で構築したキャッシュサーバーを追加して、個人プロジェクトのビルド速度を上げる。

## キャッシュサーバーの追加方法 {#how-to-add-custom-cache-servers}

Nix では、以下のいくつかのオプションでキャッシュサーバーを設定します。

1.  [substituters](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-substituters):
    これは文字列の配列で、各文字列はキャッシュサーバーのアドレスです。Nix は配列の順序に従って、これらのサーバーからキャッシュを検索しようとします。
2.  [trusted-public-keys](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-trusted-public-keys):
    悪意のある攻撃を防ぐため、Nix はデフォルトで
    [require-sigs](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-require-sigs)
    機能を有効にしています。署名が付いており、その署名が `trusted-public-keys` 内のいずれかの公開鍵で検証できるキャッシュのみが Nix で使用されます。したがって、`substituters` に対応する公開鍵を `trusted-public-keys` に追加する必要があります。
    1.  国内のミラーソースはすべて公式キャッシュサーバーから直接同期されているため、その公開鍵は公式キャッシュサーバーの公開鍵と一致します。したがって、公式キャッシュサーバーの公開鍵を直接使用でき、追加の設定は不要です。
    2.  この公開鍵メカニズムに完全に依存する検証方法は、実際にはセキュリティの責任をユーザーに転嫁します。ユーザーがサードパーティのライブラリを使用したいが、そのサードパーティのキャッシュサーバーを使用してビルド速度を上げたい場合、ユーザーは対応するセキュリティリスクを負い、そのキャッシュサーバーの公開鍵を `trusted-public-keys` に追加するかどうかを自分で決定する必要があります。この信頼問題を完全に解決するために、Nix は実験的な機能
        [ca-derivations](https://wiki.nixos.org/wiki/Ca-derivations) を導入しました。これは `trusted-public-keys` に依存せずに署名検証を行うもので、興味のある方は各自で調べてみてください。

`substituters` と `trusted-public-keys` の2つのパラメータは、次のいくつかの方法で設定できます。

1.  `/etc/nix/nix.conf` で設定する。これはグローバル設定であり、すべてのユーザーに有効です。
    1.  任意の NixOS モジュールで `nix.settings.substituters` と `nix.settings.trusted-public-keys` を使用して、宣言的に `/etc/nix/nix.conf` を生成できます。
2.  flake プロジェクトの `flake.nix` で `nixConfig.substituters` を使用して設定する。この設定は現在の flake にのみ有効です。
3.  `nix` コマンドの `--option substituters="http://xxx"` パラメータを使用して一時的に設定する。この設定は現在のコマンドにのみ有効です。

上記3つの方法のうち、最初のグローバル設定を除き、他の2つは一時的な設定です。複数の方法を同時に使用した場合、後の設定が前の設定を直接上書きします。

しかし、`substituters` を一時的に設定することにはセキュリティリスクがあります。前述のとおり、`trusted-public-keys` に基づくセキュリティ検証メカニズムには欠陥があります。信頼できないキャッシュサーバーを substituters に追加すると、悪意のあるコンテンツを含むキャッシュが Nix Store にコピーされる可能性があります。そのため、Nix は substituters の一時的な設定に制限を設けており、2番目と3番目の方法で substituers を設定するには、次のいずれかの条件を満たす必要があります。

1.  [`/etc/nix/nix.conf` の `trusted-users`](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-trusted-users)
    パラメータリストに現在のユーザーが含まれている。
2.  [`/etc/nix/nix.conf` の `trusted-substituters`](https://nixos.org/manual/nix/stable/command-ref/conf-file#conf-trusted-substituters)
    パラメータリストに一時的に指定した substituters が含まれている。

上記の情報に基づき、以下に3つの設定方法の例を示します。

まず、`nix.settings` を使用してシステムレベルの substituters と trusted-public-keys を宣言的に設定します。次の設定を `/etc/nixos/configuration.nix` または他の任意の NixOS モジュールに追加します。

```nix{7-27}
{
  lib,
  ...
}: {

  # ...
  nix.settings = {
    # given the users in this list the right to specify additional substituters via:
    #    1. `nixConfig.substituters` in `flake.nix`
    #    2. command line args `--options substituters http://xxx`
    trusted-users = ["ryan"];

    substituters = [
      # cache mirror located in China
      # status: https://mirror.sjtu.edu.cn/
      "https://mirror.sjtu.edu.cn/nix-channels/store"
      # status: https://mirrors.ustc.edu.cn/status/
      # "https://mirrors.ustc.edu.cn/nix-channels/store"

      "https://cache.nixos.org"
    ];

    trusted-public-keys = [
      # the default public key of cache.nixos.org, it's built-in, no need to add it here
      "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
    ];
  };

}
```

2番目の方法は、`flake.nix` を介して substituters と trusted-public-keys を設定することです。次の設定を `flake.nix` に追加します。

> 前述のとおり、この設定では `nix.settings.trusted-users` も設定する必要があります。そうしないと、ここで設定した `substituters` は有効になりません。

```nix{5-23,43-47}
{
  description = "NixOS configuration of Ryan Yin";

  # the nixConfig here only affects the flake itself, not the system configuration!
  nixConfig = {
    # override the default substituters
    substituters = [
      # cache mirror located in China
      # status: https://mirror.sjtu.edu.cn/
      "https://mirror.sjtu.edu.cn/nix-channels/store"
      # status: https://mirrors.ustc.edu.cn/status/
      # "https://mirrors.ustc.edu.cn/nix-channels/store"

      "https://cache.nixos.org"

      # nix community's cache server
      "https://nix-community.cachix.org"
    ];
    trusted-public-keys = [
      # nix community's cache server public key
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";

    # 省略若干配置...
  };

  outputs = inputs@{
      self,
      nixpkgs,
      ...
  }: {
    nixosConfigurations = {
      my-nixos = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./hardware-configuration.nix
          ./configuration.nix

          {
            # given the users in this list the right to specify additional substituters via:
            #    1. `nixConfig.substituters` in `flake.nix`
            nix.settings.trusted-users = [ "ryan" ];
          }
          # 省略若干配置...
       ];
      };
    };
  };
}
```

そして3番目の方法は、次のコマンドを使用してデプロイ時に一時的に substituters と trusted-public-keys を指定することです。

```bash
sudo nixos-rebuild switch --option substituters "https://nix-community.cachix.org" --option trusted-public-keys "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
```

上記3つの方法のいずれかを選択して設定し、デプロイします。デプロイが成功すると、以降のすべてのパッケージは国内のミラーソースから優先的にキャッシュを検索します。

> システムのホスト名が `my-nixos` でない場合は、`flake.nix` で `nixosConfigurations` の名前を変更するか、`--flake /etc/nixos#my-nixos` を使用して設定名を指定する必要があります。

### Nix options パラメータの `extra-` プレフィックス

前述の3つの方法で設定された `substituters` は互いに上書きされますが、理想的な状況は次のようになるはずです。

1.  システムレベルの `/etc/nix/nix.conf` には、公式キャッシュサーバーや国内ミラーソースなど、最も一般的な substituters と trusted-public-keys のみを設定します。
2.  各 flake プロジェクトの `flake.nix` には、nix-community などの非公式キャッシュサーバーなど、そのプロジェクト固有の substituters と trusted-public-keys を設定します。
3.  flake プロジェクトをビルドする際には、`flake.nix` と `/etx/nix/nix.conf` で設定された substituters と trusted-public-keys を **マージ** して使用する必要があります。

Nix は、この **マージ** 機能を実現するために
[`extra-` プレフィックス](https://nixos.org/manual/nix/stable/command-ref/conf-file.html?highlight=extra#file-format)
を提供しています。

公式ドキュメントによると、`xxx` パラメータの値がリストの場合、`extra-xxx` パラメータの値は `xxx` パラメータの値の後ろに追加されます。

つまり、次のように使用できます。

```nix{7,13,37-60}
{
  description = "NixOS configuration of Ryan Yin";

  # the nixConfig here only affects the flake itself, not the system configuration!
  nixConfig = {
    # will be appended to the system-level substituters
    extra-substituters = [
      # nix community's cache server
      "https://nix-community.cachix.org"
    ];

    # will be appended to the system-level trusted-public-keys
    extra-trusted-public-keys = [
      # nix community's cache server public key
      "nix-community.cachix.org-1:mB9FSh9qf2dCimDSUo8Zy7bkq5CX+/rkCWyvRCYg3Fs="
    ];
  };

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";

    # 省略若干配置...
  };

  outputs = inputs@{
      self,
      nixpkgs,
      ...
  }: {
    nixosConfigurations = {
      my-nixos = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./hardware-configuration.nix
          ./configuration.nix

          {
            # given the users in this list the right to specify additional substituters via:
            #    1. `nixConfig.substituters` in `flake.nix`
            nix.settings.trusted-users = [ "ryan" ];

            # the system-level substituters & trusted-public-keys
            nix.settings = {
              substituters = [
                # cache mirror located in China
                # status: https://mirror.sjtu.edu.cn/
                "https://mirror.sjtu.edu.cn/nix-channels/store"
                # status: https://mirrors.ustc.edu.cn/status/
                # "https://mirrors.ustc.edu.cn/nix-channels/store"

                "https://cache.nixos.org"
              ];

              trusted-public-keys = [
                # the default public key of cache.nixos.org, it's built-in, no need to add it here
                "cache.nixos.org-1:6NCHdD59X431o0gWypbMrAURkbJ16ZPMQFGspcDShjY="
              ];
            };

          }
          # 省略若干配置...
       ];
      };
    };
  };
}
```

## プロキシによるパッケージダウンロードの高速化 {#accelerate-package-downloads-via-a-proxy-server}

> 参考: Issue:
> [roaming laptop: network proxy configuration - NixOS/nixpkgs](https://github.com/NixOS/nixpkgs/issues/27535#issuecomment-1178444327)

一部のユーザーは、HTTP/Socks5 プロキシを直接使用してパッケージのダウンロードを高速化したい場合があります。以下に設定方法を示します。

ターミナルで `export HTTPS_PROXY=http://127.0.0.1:7890` のような方法を使用しても効果はありません。なぜなら、nix の実際の作業は `nix-daemon` というバックグラウンドプロセスによって行われ、ターミナルで直接実行されるコマンドではないからです。

一時的にプロキシを使用する必要がある場合は、次のコマンドでプロキシ環境変数を設定できます。

```bash
sudo mkdir /run/systemd/system/nix-daemon.service.d/
cat << EOF >/run/systemd/system/nix-daemon.service.d/override.conf
[Service]
Environment="https_proxy=socks5h://localhost:7891"
EOF
sudo systemctl daemon-reload
sudo systemctl restart nix-daemon
```

この設定をデプロイした後、`sudo cat /proc/$(pidof nix-daemon)/environ | tr '\0' '
'` を使用して nix-daemon プロセスのすべての環境変数を表示し、環境変数の設定が有効になっていることを確認できます。

`/run/systemd/system/nix-daemon.service.d/override.conf` にある設定は、システムの再起動後に自動的に削除されます。または、手動で削除して nix-daemon サービスを再起動することで、元の設定に戻すことができます。

プロキシを永続的に設定したい場合は、上記のコマンドをシェルスクリプトとして保存し、システムの起動時に毎回実行することをお勧めします。または、バイパスゲートウェイや TUN などのグローバルプロキシソリューションを使用することもできます。

> コミュニティには、`systemd.services.nix-daemon.environment` を使用して nix-daemon のプロキシを宣言的に永続設定する人もいますが、この方法ではプロキシに問題が発生した場合に非常に面倒になります。nix-daemon が正常に動作しなくなり、ほとんどの nix コマンドが正常に実行されなくなります。また、systemd 自体の設定は読み取り専用に設定されているため、設定を簡単に変更してプロキシ設定を削除することはできません。したがって、この方法は推奨されません。

> 一部の商用プロキシまたは公共プロキシを使用している場合、GitHub からダウンロードする際に HTTP 403 エラーが発生することがあります
> （[nixos-and-flakes-book/issues/74](https://github.com/ryan4yin/nixos-and-flakes-book/issues/74)）。
> プロキシサーバーを変更するか、
> [access-tokens](https://github.com/NixOS/nix/issues/6536) を設定して解決してみてください。
