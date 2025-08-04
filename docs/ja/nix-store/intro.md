# Nix Storeとバイナリキャッシュ

ここでは、Nix Store、Nixバイナリキャッシュ、およびその他の関連概念について簡単に紹介しますが、具体的な設定や使用方法については触れません。これらは後の章で詳しく説明します。

## Nix Store

Nix StoreはNixパッケージマネージャーの中核をなす概念の一つで、不変性という特性を必要とするすべてのファイルを保存するための読み取り専用のファイルシステムです。これには、パッケージのビルド結果、パッケージのメタデータ、パッケージのすべてのビルド入力などが含まれます。

Nixパッケージマネージャーは、Nix関数型言語を使用してパッケージとその依存関係を記述します。各パッケージは純粋関数の出力と見なされ、パッケージのビルド結果はNix Storeに保存されます。

Nix Store内のデータは固定のパス形式を持っています：

```
/nix/store/b6gvzjyb2pg0kjfwrjmg1vfhh54ad73z-firefox-33.1
|--------| |------------------------------| |----------|
store directory         digest                  name
```

ご覧のとおり、Nix Storeのパスはハッシュ値（digest）で始まり、その後にパッケージ名とバージョン番号が続きます。このハッシュ値は、パッケージのすべての入力情報（ビルドパラメータ、依存関係、依存バージョンなど）に基づいて計算され、ビルドパラメータや依存関係が変更されるとハッシュ値も変更されるため、各パッケージパスの一意性が保証されます。さらに、Nix Storeは読み取り専用のファイルシステムであるため、パッケージの不変性が保証されます。つまり、パッケージが一度ビルドされると、二度と変更されることはありません。

ビルド結果の保存パスはビルドプロセスのすべての入力情報に基づいて計算されるため、**同じ入力情報は同じ保存パスになります**。この設計は入力アドレスモデル（_Input-addressed Model_）とも呼ばれます。

### NixOSはNix Storeをどのように使用するか

NixOSの宣言的設定は、どのパッケージをインストールする必要があるかを計算し、それらのパッケージのNix Store内の保存パスを`/run/current-system`にソフトリンクします。次に、`PATH`などの環境変数を変更して`/run/current-system`内の対応するフォルダを指すようにすることで、パッケージのインストールを実現します。デプロイのたびに、NixOSは新しいシステム設定を計算し、古いソフトリンクを削除して新しいソフトリンクを再作成し、システム環境が宣言的設定と一致するようにします。

home-managerも同様で、ユーザーが設定したパッケージを`/etc/profiles/per-user/your-username`パスにソフトリンクし、`PATH`などの環境変数を変更してこのパスを指すようにすることで、ユーザーパッケージのインストールを実現します。

```bash
# 環境内のbashがどのパスから来ているかを確認（NixOSでインストール）
› which bash
╭───┬─────────┬─────────────────────────────────┬──────────╮
│ # │ command │              path               │   type   │
├───┼─────────┼─────────────────────────────────┼──────────┤
│ 0 │ bash    │ /run/current-system/sw/bin/bash │ external │
╰───┴─────────┴─────────────────────────────────┴──────────╯

› ls -al /run/current-system/sw/bin/bash
lrwxrwxrwx 15 root root 76 1970年 1月 1日 /run/current-system/sw/bin/bash -> /nix/store/1zslabm02hi75anb2w8zjrqwzgs0vrs3-bash-interactive-5.2p26/bin/bash

# 環境内のcowsayがどのパスから来ているかを確認（home-managerでインストール）
› which cowsay
╭───┬─────────┬────────────────────────────────────────┬──────────╮
│ # │ command │                  path                  │   type   │
├───┼─────────┼────────────────────────────────────────┼──────────┤
│ 0 │ cowsay  │ /etc/profiles/per-user/ryan/bin/cowsay │ external │
╰───┴─────────┴────────────────────────────────────────┴──────────╯

› ls -al /etc/profiles/per-user/ryan/bin/cowsay
lrwxrwxrwx 2 root root 72 1970年 1月 1日 /etc/profiles/per-user/ryan/bin/cowsay -> /nix/store/w2czyf82gxz4vy9kzsdhr88112bmc0c1-home-manager-path/bin/cowsay
```

一方、`nix develop`コマンドは、パッケージの保存パスを`PATH`や`LD_LIBRARY_PATH`などの環境変数に直接追加し、新しく作成されたシェル環境でこれらのパッケージやライブラリを直接使用できるようにします。

本書のソースコードリポジトリ[ryan4yin/nixos-and-flakes-book](https://github.com/ryan4yin/nixos-and-flakes-book)を例にとると、このリポジトリで`nix develop`コマンドを実行し、`PATH`環境変数の内容を確認します。

```bash
› nix develop
node v20.9.0

› env | egrep '^PATH'
PATH=/nix/store/h13fnmpm8m28qypsba2xysi8a90crphj-pre-commit-3.6.0/bin:/nix/store/2mqyvwp96d4jynsnzgacdk5rg1kx2a9a-node2nix-1.11.0/bin:/nix/store/a1hckfqzyys4rfgbdy5kmb5w0zdr55i5-nodejs-20.9.0/bin:/nix/store/gjrfcl2bhv7kbj883k7b18n2aprgv4rf-pnpm-8.10.2/bin:/nix/store/z6jfxqyj1wq62iv1gn5b5d9ms6qigkg0-yarn-1.22.19/bin:/nix/store/2k5irl2cfw5m37r3ibmpq4f7jndb41a8-prettier-3.0.3/bin:/nix/store/zrs710jpfn7ngy5z4c6rrwwjq33b2a0y-git-2.42.0/bin:/nix/store/dkmyyrkyl0racnhsaiyf7rxf43yxhx92-typos-1.16.23/bin:/nix/store/imli2in1nr1h8qh7zh62knygpl2zj66l-alejandra-3.0.0/bin:/nix/store/85jldj870vzcl72yz03labc93bwvqayx-patchelf-0.15.0/bin:/nix/store/90h6k8ylkgn81k10190v5c9ldyjpzgl9-gcc-wrapper-12.3.0/bin:/nix/store/hf2gy3km07d5m0p1lwmja0rg9wlnmyr7-gcc-12.3.0/bin:/nix/store/cx01qk0qyylvkgisbwc7d3pk8sliccgh-glibc-2.38-27-bin/bin:/nix/store/bblyj5b3ii8n6v4ra0nb37cmi3lf8rz9-coreutils-9.3/bin:/nix/store/1alqjnr40dsk7cl15l5sn5y2zdxidc1v-binutils-wrapper-2.40/bin:/nix/store/1fn92b0783crypjcxvdv6ycmvi27by0j-binutils-2.40/bin:/nix/store/bblyj5b3ii8n6v4ra0nb37cmi3lf8rz9-coreutils-9.3/bin:/nix/store/l974pi8a5yqjrjlzmg6apk0jwjv81yqw-findutils-4.9.0/bin:/nix/store/8q25nyfirzsng6p57yp8hsaldqqbc7dg-diffutils-3.10/bin:/nix/store/9c5qm297qnvwcf7j0gm01qrslbiqz8rs-gnused-4.9/bin:/nix/store/rx2wig5yhpbwhnqxdy4z7qivj9ln7fab-gnugrep-3.11/bin:/nix/store/7wfya2k95zib8jl0jk5hnbn856sqcgfk-gawk-5.2.2/bin:/nix/store/xpidksbd07in3nd4sjx79ybwwy81b338-gnutar-1.35/bin:/nix/store/202iqv4bd7lh6f7fpy48p7q4d96lqdp7-gzip-1.13/bin:/nix/store/ik7jardq92dxw3fnz3vmlcgi9c8dwwdq-bzip2-1.0.8-bin/bin:/nix/store/v4iswb5kwj33l46dyh2zqh0nkxxlr3mz-gnumake-4.4.1/bin:/nix/store/q1c2flcykgr4wwg5a6h450hxbk4ch589-bash-5.2-p15/bin:/nix/store/cbj1ph7zi009m53hxs90idl1f5i9i941-patch-2.7.6/bin:/nix/store/76z4cjs7jj45ixk12yy6k5z2q2djk2jb-xz-5.4.4-bin/bin:/nix/store/qmfxld7qhk8qxlkx1cm4bkplg1gh6jgj-file-5.45/bin:/home/ryan/.local/bin:/home/ryan/go/bin:/home/ryan/.config/emacs/bin:/home/ryan/.local/bin:/home/ryan/go/bin:/home/ryan/.config/emacs/bin:/nix/store/jsc6jydv5zjpb3dvh0lxw2dzxmv3im9l-kitty-0.32.1/bin:/nix/store/ihpdcszhj8bdmyr0ygvalqw9zagn0jjz-imagemagick-7.1.1-28/bin:/nix/store/2bm2yd5jqlwf6nghlyp7z88g28j9n8r0-ncurses-6.4-dev/bin:/run/wrappers/bin:/guix/current/bin:/home/ryan/.guix-home/profile/bin:/home/ryan/.guix-profile/bin:/home/ryan/.nix-profile/bin:/nix/profile/bin:/home/ryan/.local/state/nix/profile/bin:/etc/profiles/per-user/ryan/bin:/nix/var/nix/profiles/default/bin:/run/current-system/sw/bin:/nix/store/c53f8hagyblvx52zylsnqcc0b3nxbrcl-binutils-wrapper-2.40/bin:/nix/store/fpagbmzdplgky01grwhxcsazvhynv1nz-pciutils-3.10.0/bin:/nix/store/4cjqvbp1jbkps185wl8qnbjpf8bdy8j9-gcc-wrapper-13.2.0/bin
```

明らかに、`nix develop`は多くのパッケージの保存パスを`PATH`環境変数に直接追加しています。

## Nix Storeのガベージコレクション

Nix Storeは中央集権的なストレージシステムであり、すべてのパッケージのビルド入力と出力がここに保存されます。システムの使用に伴い、Nix Store内のパッケージはますます増え、占有するディスクスペースもますます大きくなります。

Nix Storeが無限に増え続けるのを防ぐため、NixパッケージマネージャーはローカルのNix Storeにガベージコレクションメカニズムを提供し、`/nix/store`内の古いデータをクリーンアップしてストレージスペースを回収します。

[Chapter 11. The Garbage Collector - nix pills](https://nixos.org/guides/nix-pills/garbage-collector)によると、`nix-store --gc`コマンドはガベージコレクション操作を実行し、`/nix/var/nix/gcroots/`ディレクトリ内のすべてのソフトリンクを再帰的にたどり、参照されているすべてのパッケージを見つけ出し、参照されなくなったパッケージを削除します。一方、`nix-collect-garbage --delete-old`はさらに一歩進んで、まずすべての古い[profiles](https://nixos.org/manual/nix/stable/command-ref/files/profiles)を削除してから、`nix-store --gc`コマンドを実行して参照されなくなったパッケージをクリーンアップします。

注意すべきは、`nix build`や`nix develop`などのコマンドのビルド結果は自動的に`/nix/var/nix/gcroots/`ディレクトリに追加されないため、これらのビルド結果はガベージコレクションメカニズムによってクリーンアップされてしまうことです。これを回避するには、`nix-instantiate`コマンドでビルド結果をインスタンス化し、`result`という名前のソフトリンクを現在のディレクトリに作成します。このソフトリンクはガベージコレクションのルートとして機能し、ビルド結果がクリーンアップされるのを防ぎます。

## バイナリキャッシュ

NixとNix Storeの設計は、パッケージの不変性を保証し、ビルド結果を複数のマシン間で直接共有することを可能にします。これらのマシンが同じ入力情報を使用してパッケージをビルドする限り、同じ出力パスが得られ、Nixはパッケージを再ビルドする代わりに他のマシンからのビルド結果を再利用でき、パッケージのインストールを高速化します。

Nixバイナリキャッシュはこの機能に基づいて設計されています。これは、データをローカルではなくリモートサーバーに保存するNix Storeの実装です。必要に応じて、Nixパッケージマネージャーはリモートサーバーから対応するビルド結果をローカルの`/nix/store`にダウンロードし、時間のかかるローカルビルドプロセスを回避します。

Nixは<https://cache.nixos.org>で公式のバイナリキャッシュサーバーを提供しており、一般的なCPUアーキテクチャ向けのnixpkgs内のほとんどのパッケージのビルド結果をキャッシュしています。ローカルマシンでNixビルドコマンドを実行すると、Nixはまずキャッシュサーバーで対応するバイナリキャッシュを見つけようとします。見つかった場合、時間のかかるローカルコンパイルをバイパスしてキャッシュファイルを直接ダウンロードし、ビルドプロセスを大幅に高速化します。

## Nixバイナリキャッシュの信頼モデル

**入力アドレスモデル**は、同じ入力が同じ出力パスを生成することのみを保証しますが、出力内容の一意性は保証しません。これは、同じ入力情報であっても、同じパッケージの複数のビルドが異なる出力内容を生成する可能性があることを意味します。

Nixはビルド環境でのネットワークアクセスの無効化や固定タイムスタンプの使用など、不確実性を最小限に抑える措置を講じていますが、ビルドプロセスに影響を与えて異なる出力内容を生成する可能性のある制御不可能な要因がまだ存在します。出力内容のこれらの違いは通常、パッケージの機能に影響を与えませんが、バイナリキャッシュの安全な共有に課題をもたらします。出力内容の不確実性により、キャッシュサーバーからダウンロードされたバイナリキャッシュが実際に宣言された入力情報でビルドされたかどうか、悪意のあるコンテンツが含まれているかどうかを判断することが困難になります。

これに対処するため、Nixパッケージマネージャーは公開鍵と秘密鍵の署名メカニズムを使用してバイナリキャッシュの出所と完全性を検証します。これにより、セキュリティの責任はユーザーに委ねられます。ビルドプロセスを高速化するために非公式のキャッシュサーバーを使用したい場合は、そのサーバーの公開鍵を`trusted-public-keys`に追加し、関連するセキュリティリスクを受け入れる必要があります。キャッシュサーバーが悪意のあるコンテンツを含むキャッシュデータを提供する可能性があります。

### コンテンツアドレスモデル

[RFC062 - content-addressed store paths](https://github.com/NixOS/rfcs/blob/master/rfcs/0062-content-addressed-paths.md)は、ビルド結果の一貫性を改善するためのコミュニティの試みです。これは、入力情報（inputs）ではなくビルド結果（outputs）に基づいて保存パスを計算する新しい方法を提案しています。この設計はビルド結果の一貫性を保証します。ビルド結果が異なる場合、保存パスも異なるため、入力アドレスモデルに固有の出力内容の不確実性を回避します。

しかし、このアプローチはまだ実験段階にあり、広く採用されていません。

## 参考文献

- [Nix Store - Nix Manual](https://nixos.org/manual/nix/stable/store/)
- [Binary Cache - NixOS Wiki](https://wiki.nixos.org/wiki/Binary_Cache)
- [Chapter 11. The Garbage Collector - nix pills](https://nixos.org/guides/nix-pills/garbage-collector)
- [RFC 0062 - content-addressed store paths](https://github.com/NixOS/rfcs/blob/master/rfcs/0062-content-addressed-paths.md)
- [Nix's cache is a massive security risk](https://blog.aofei.org/posts/2023-02-20-nix-cache-is-a-massive-security-risk.html)
- [Trustix: a distributed trust model for Nix](https://discourse.nixos.org/t/trustix-a-distributed-trust-model-for-nix/10459)
