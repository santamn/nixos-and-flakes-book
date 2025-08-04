# 独自の Nix バイナリキャッシュサーバーを構築する

## はじめに

Nix バイナリキャッシュは Nix Store の実装の一つで、データをローカルに保存するのではなく、リモートサーバーに保存することで、バイナリキャッシュの複数マシン間での共有を容易にします。

Nix 公式のバイナリキャッシュサーバーは、標準パラメータでビルドされたバイナリキャッシュのみを提供します。ビルドパラメータをカスタマイズした場合や、Nixpkgs 以外のソフトウェアパッケージを使用した場合、Nix は対応するバイナリキャッシュを見つけられず、ローカルでのビルドプロセスが実行されます。

ローカルの Nix Store `/nix/store` にのみ依存していると、各マシンでこれらのカスタマイズされたソフトウェアパッケージをすべて再ビルドする必要があり、かなりの時間がかかり、ビルドプロセスで大量のメモリを消費する可能性があるため、非常に苦痛になることがあります。Raspberry Pi などの低性能プラットフォームで Nix を使用する場合、この状況はさらに悪化します。

このドキュメントでは、S3 サービス（MinIO など）を使用して独自の Nix バイナリキャッシュサーバーを構築し、複数のマシン間でビルド結果を共有することで、上記の問題を解決する方法を紹介します。

## 準備

1.  NixOS ホスト 1台
2.  MinIO サーバーのデプロイ
    1.  まだの場合は、MinIO の[公式デプロイガイド](https://min.io/docs/minio/linux/operations/installation.html) を参照してデプロイしてください。
3.  MinIO サーバーには、有効な TLS デジタル証明書が必要です。パブリック証明書でもプライベート証明書でもかまいません。このドキュメントでは、`https://minio.homelab.local` とプライベート証明書を例として使用します。
4.  `minio-client` のインストール

## パスワードの生成

```bash
nix run nixpkgs#pwgen -- -c -n -y -s -B 32 1
# => oenu1Yuch3rohz2ahveid0koo4giecho
```

## MinIO クライアントの設定

MinIO コマンドラインクライアント `mc` をインストールします。

```nix
{ pkgs, ... }:

{
  environment.systemPackages = with pkgs; [
    minio-client # ファイルシステムとオブジェクトストレージ用の ls、cp、mkdir、diff、rsync コマンドの代替
  ];
}
```

`~/.mc/config.json` を作成し、内容は以下の形式にします（重要なパラメータを自分のものに置き換えることを忘れないでください）：

```json
{
  "version": "10",
  "aliases": {
    "s3": {
      "url": "https://s3.homelab.local",
      "accessKey": "minio",
      "secretKey": "oenu1Yuch3rohz2ahveid0koo4giecho",
      "api": "s3v4",
      "path": "auto"
    }
  }
}
```

Nix は S3 ストレージバケットと直接やり取りするため、Nix バイナリキャッシュにアクセスする必要があるすべてのマシンに対応する S3 認証情報を設定する必要があります。`~/.aws/credentials` を作成し、内容は以下のとおりです（`<nixbuildersecret>` を前の `pwgen` コマンドで生成したパスワードに置き換えることを忘れないでください）。

```conf
[nixbuilder]
aws_access_key_id=nixbuilder
aws_secret_access_key=<nixbuildersecret>
```

## S3 ストレージバケットをバイナリキャッシュとして設定する

まず、minio クライアントを使用して `nix-cache` ストレージバケットを作成します。

```bash
mc mb s3/nix-cache
```

`nixbuilder` という MinIO ユーザーを作成し、パスワードを割り当てます。

```bash
mc admin user add s3 nixbuilder <PASSWORD>
```

現在の作業ディレクトリに `nix-cache-write.json` という名前のファイルを作成し、内容は以下のとおりです。

```json
{
  "Id": "AuthenticatedWrite",
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AuthenticatedWrite",
      "Action": [
        "s3:AbortMultipartUpload",
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:ListMultipartUploadParts",
        "s3:PutObject"
      ],
      "Effect": "Allow",
      "Resource": ["arn:aws:s3:::nix-cache", "arn:aws:s3:::nix-cache/*"],
      "Principal": "nixbuilder"
    }
  ]
}
```

次に、先ほど作成した `nix-cache-write.json` ファイルを使用して、S3 にファイルをアップロードするためのポリシーを作成します。

```bash
mc admin policy add s3 nix-cache-write nix-cache-write.json
```

上記で作成した S3 ポリシーを `nixbuilder` ユーザーに関連付けます。

```bash
mc admin policy set s3 nix-cache-write user=nixbuilder
```

次に、匿名ユーザーが認証なしでファイルをダウンロードできるようにします。これにより、すべての Nix サーバーがこの S3 キャッシュから直接データを取得できるようになります。

```bash
mc anonymous set download s3/nix-cache
```

最後に、`nix-cache-info` ファイルを S3 バケットのルートディレクトリに追加します。Nix はこのファイルを使用して、バイナリキャッシュ関連の情報を記録します。

```bash
cat > nix-cache-info <<EOF
StoreDir: /nix/store
WantMassQuery: 1
Priority: 40
EOF

# `nix-cache-info` を S3 バケットにコピーします
mc cp ./nix-cache-info s3/nix-cache/nix-cache-info
```

## 署名キーペアの生成

前述のとおり、Nix バイナリキャッシュは公開鍵署名メカニズムを使用してデータの出所と完全性を検証するため、Nix ビルドマシン用にバイナリキャッシュの署名検証に使用するキーペアを生成する必要があります。

キー名は任意ですが、NixOS 開発者は、キャッシュのドメイン名の後に整数を付けることを強く推奨しています。これにより、キーを失効または再生成する必要がある場合に、末尾の整数をインクリメントできます。

```bash
nix key generate-secret --key-name s3.homelab.local-1 > ~/.config/nix/secret.key
nix key convert-secret-to-public < ~/.config/nix/secret.key > ~/.config/nix/public.key
cat ~/.config/nix/public.key
# => s3.homelab.local-1:m0J/oDlLEuG6ezc6MzmpLCN2MYjssO3NMIlr9JdxkTs=
```

## `flake.nix` で S3 バイナリキャッシュを使用する

以下の内容を `configuration.nix` または任意のカスタム NixOS モジュールに追加します。

```nix
{
  nix = {
    settings = {
      extra-substituters = [
        "https://s3.homelab.local/nix-cache/"
      ];
      extra-trusted-public-keys = [
        "s3.homelab.local-1:m0J/oDlLEuG6ezc6MzmpLCN2MYjssO3NMIlr9JdxkTs="
      ];
    };
  };
}
```

システムを再ビルドすると、作成した S3 バイナリキャッシュを使用できるようになります。

```bash
sudo nixos-rebuild switch --upgrade --flake .#<HOST>
```

## ストアパスをバイナリキャッシュにプッシュする

ローカルストア内の一部のパスに署名します。

```bash
nix store sign --recursive --key-file ~/.config/nix/secret.key /run/current-system
```

これらのパスをキャッシュにコピーします。

```bash
nix copy --to 's3://nix-cache?profile=nixbuilder&endpoint=s3.homelab.local' /run/current-system
```

## 自動オブジェクト有効期限ポリシーの追加

```bash
mc ilm rule add s3/nix-cache --expire-days "DAYS"
# 例：mc ilm rule add s3/nix-cache --expire-days "7"
```

## 参考

- [Blog post by Jeff on Nix binary caches](https://jcollie.github.io/nixos/2022/04/27/nixos-binary-cache-2022.html)
- [Binary cache in the NixOS wiki](https://wiki.nixos.org/wiki/Binary_Cache)
- [Serving a Nox store via S3 in the NixOS manual](https://nixos.org/manual/nix/stable/package-management/s3-substituter.html)
- [Serving a Nix store via HTTP in the NixOS manual](https://nixos.org/manual/nix/stable/package-management/binary-cache-substituter.html)
