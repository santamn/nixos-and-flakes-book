# リモートデプロイメント

Nix はその設計上、リモートデプロイメントに非常に適しており、Nix コミュニティは [NixOps](https://github.com/NixOS/nixops) や [colmena](https://github.com/zhaofengli/colmena) など、この目的のためのいくつかのツールを提供しています。さらに、私たちがよく使う公式ツール `nixos-rebuild` も、いくつかのリモートデプロイメント機能を備えています。

さらに、マルチアーキテクチャのシナリオでは、リモートデプロイメントは Nix のマルチアーキテクチャサポートを最大限に活用できます。たとえば、x86_64 ホスト上で aarch64/riscv64 の NixOS システムをクロスコンパイルし、SSH 経由で対応するホストにリモートデプロイできます。

最近、私はローカルマシンで RISC-V 64 SBC 用の NixOS システムイメージをクロスコンパイルするという状況に遭遇しました。その結果、このシステムをローカルでビルドするためのコンパイルキャッシュはすべて揃っていました。しかし、RISC-V 64 アーキテクチャの公式バイナリキャッシュが不足していたため、開発ボード上で未インストールのプログラムを直接実行すると（例：`nix run nixpkgs#cowsay hello`）、大規模なコンパイルが発生しました。このプロセスには数時間かかり、非常に耐え難いものでした。

リモートデプロイメントを採用することで、ローカルの高性能 CPU の計算能力と豊富なコンパイルキャッシュを最大限に活用できました。この切り替えにより、エクスペリエンスが大幅に向上し、以前の時間のかかるコンパイルの問題が大幅に軽減されました。

`colmena` または `nixos-rebuild` を使用したリモートデプロイメントの方法を簡単にガイドします。

## 前提条件

リモートデプロイメントを開始する前に、いくつかの準備手順が必要です。

1.  リモートホストでの sudo パスワード検証の失敗を防ぐため、以下のいずれかの方法を選択してください。
    1.  リモートホストの `root` ユーザーとしてデプロイする。
    2.  リモートホストの設定に `security.sudo.wheelNeedsPassword = false;` を追加し、事前に一度手動でデプロイして、ユーザーにパスワードなしの sudo 権限を付与する。
        1.  **これにより、ユーザーレベルのプログラムが警告なしに sudo 権限を取得できるようになり、セキュリティリスクが生じます！** したがって、この方法を選択する場合は、通常のユーザーアカウントではなく、リモートデプロイメント専用のユーザーを作成することをお勧めします！
2.  リモートホストの SSH 公開鍵認証を設定する。
    1.  このタスクを完了するには `users.users.<name>.openssh.authorizedKeys.keys` オプションを使用します。
3.  リモートホストの Known Hosts レコードをローカルマシンに追加する。そうしないと、colmena/nixos-rebuild はリモートホストの身元を検証できず、デプロイに失敗します。
    1.  `programs.ssh.knownHosts` オプションを使用して、リモートホストの公開鍵を Known Hosts レコードに追加します。
4.  `ssh root@<you-host>` コマンドを手動で使用してリモートホストにログインできることを確認する。
    1.  問題が発生した場合は、続行する前に解決してください。

デプロイメントには `root` ユーザーを使用することをお勧めします。より便利で、sudo 権限の複雑さを回避できます。

root ユーザーを使用してリモートデプロイすることを前提として、最初のステップはリモートホストで root ユーザーの SSH 公開鍵認証を設定することです。これを実現するには、リモートホストの Nix 設定（例：`configuration.nix`）の任意の NixOS モジュールに以下の内容を追加し、システムをリビルドします。

```nix{6-9}
# configuration.nix
{

  # ...

  users.users.root.openssh.authorizedKeys.keys = [
    # TODO 自分の SSH 公開鍵に置き換えてください。
    "ssh-ed25519 AAAAC3Nxxxxx ryan@xxx"
  ];

  # ...
}
```

さらに、リモートデプロイメント中の認証のために、ローカルマシンの SSH エージェントに SSH 秘密鍵を追加する必要があります。

```bash
ssh-add ~/.ssh/your-private-key
```

## `colmena` を介したデプロイ

`colmena` は、私たちが慣れ親しんでいる `nixosConfigurations.xxx` をリモートデプロイメントに直接使用しません。代わりに、`colmena` という名前の flake output をカスタマイズします。その構造は `nixosConfigurations.xxx` に似ていますが、同一ではありません。

システムの `flake.nix` で、`colmena` という名前の新しい output を追加します。簡単な例を以下に示します。

```nix{11-34}
{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";

    # ...
  };
  outputs = { self, nixpkgs }: {
    # ...

    # この output を追加すると、colmena がリモートデプロイメントのためにその内容を読み取ります
    colmena = {
      meta = {
        nixpkgs = import nixpkgs { system = "x86_64-linux"; };

        # このパラメータは `nixosConfigurations.xxx` の `specialArgs` と同様に機能し、
        # すべてのサブモジュールにカスタム引数を渡すために使用されます。
        specialArgs = {
          inherit nixpkgs;
        };
      };

      # ホスト名 = "my-nixos"
      "my-nixos" = { name, nodes, ... }: {
        # リモートデプロイメントに関連するパラメータ
        deployment.targetHost = "192.168.5.42"; # リモートホストの IP アドレス
        deployment.targetUser = "root";  # リモートホストのユーザー名

        # このパラメータは `nixosConfigurations.xxx` の `modules` と同様に機能し、
        # すべてのサブモジュールをインポートするために使用されます。
        imports = [
          ./configuration.nix
        ];
      };
    };
  };
}
```

これで、設定をデバイスにデプロイできます。

```bash
nix run nixpkgs#colmena apply
```

より高度な使用法については、colmena の公式ドキュメント <https://colmena.cli.rs/unstable/introduction.html> を参照してください。

## `nixos-rebuild` を介したデプロイ

`nixos-rebuild` を使用したリモートデプロイメントには、ローカルホストへのデプロイに似ているという利点があります。リモートホストの IP アドレス、ユーザー名、その他の詳細を指定するために、いくつかの追加パラメータが必要になるだけです。

たとえば、flake の `nixosConfigurations.my-nixos` で定義された設定をリモートホストにデプロイするには、次のコマンドを使用します。

```bash
nixos-rebuild switch --flake .#my-nixos
  --target-host root@192.168.4.1 --build-host localhost --verbose
```

上記のコマンドは、IP `192.168.4.1` を持つサーバーに `my-nixos` の設定をビルドしてデプロイします。システムビルドプロセスはローカルで実行されます。

リモートホストで設定をビルドしたい場合は、`--build-host localhost` を `--build-host root@192.168.4.1` に置き換えてください。

IP アドレスを繰り返し使用することを避けるため、ローカルマシンの `~/.ssh/config` または `/etc/ssh/ssh_config` でホストエイリアスを定義できます。例：

> Nix 設定を通じて SSH 設定を完全に生成することは可能で、このタスクはあなたに委ねられています。

```bash
› cat ~/.ssh/config

# ......

Host aquamarine
  HostName 192.168.4.1
  Port 22

# ......
```

この設定により、デプロイメントでホストエイリアスを使用できます。

```bash
nixos-rebuild switch --flake .#my-nixos --target-host root@aquamarine --build-host root@aquamarine --verbose
```

これにより、定義されたホストエイリアスを使用してデプロイする、より便利な方法が提供されます。
