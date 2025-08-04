# Flakes について

Flakes は Nix にとって画期的な実験的機能です。Flakes は Nix 式同士の依存関係を管理するためのポリシーを導入し、Nix エコシステムにおける再現性、コンポーザビリティ、使いやすさを向上させることができます。Flakes はまだ実験的な機能ではありますが、Nix コミュニティで広く利用されています[^1]。Flakes は Nix プロジェクト史上、最も重要な変化のひとつです[^2]。

JavaScript/Go/Rust/Python などを使ったことがある方なら、`package.json`/`go.mod`/`Cargo.toml`/`pyproject.toml` のようなファイルに馴染みがあるでしょう。上記の言語では、これらのようなファイルを使ってソフトウェアパッケージ間の依存関係やプロジェクトのビルド方法を記述します。

同様に、これらの言語のパッケージマネージャでは `package-lock.json`/`go.sum`/`Cargo.lock`/`poetry.lock` のようなファイルで依存関係のバージョンを固定することでプロジェクトの再現性を担保しています。

Flakes はこれらのパッケージマネージャのアイデアを取り入れることで、Nix エコシステムの再現性・コンポーザビリティ・使いやすさを向上させています。

Flakes では、`flake.nix` というファイルを使い、`package.json` のように Nix パッケージ間の依存関係やビルド方法を記述します。また、`flake.lock` というファイルで `package-lock.json` のように依存関係のバージョンを固定し、プロジェクトの再現性を担保します。

一方で、実験的機能である Flakes は Nix 本来の設計をユーザーレベルで損なうものではありません。Flakes によって新たに導入された `flake.nix`/`flake.lock` の2つのファイルは、他の Nix 設定のラッパーに過ぎません。以降の章では、Flakes の機能によって Nix の元々の設計に基づきつつもより簡便な形で Nix 式間の依存関係を管理できるようになることを見ていきます。

## Flakes についての注意 <Badge type="danger" text="caution" />

Flakes を使うことにメリットがあることは明らかであり、NixOS コミュニティ全体で積極的に受け入れられています。現時点で半数以上のユーザーが Flakes を利用しており[^3]、Flakes が廃止されることはまずないでしょう。
:warning: ただし、**Flakes はまだ実験的な機能**であることに注意してください。いくつかの課題が残っており、安定化の過程で破壊的な変更が加わる可能性もあります。このような破壊的変更の内容はまだ未定です。

特にこの本は NixOS と Flakes を中心に取り扱っていることもあり、総合的には Flakes の利用を強く推奨しています。ただし、今後の破壊的変更によって起こりうる問題に備えておくことも重要です。

## Flakes はいつ安定化する？

Flakes について詳しく調べた結果は以下の通りです:

- [[RFC 0136] A Plan to Stabilize Flakes and the New CLI Incrementally](https://github.com/NixOS/rfcs/pull/136): Flakes と新 CLI を段階的に安定化する計画（マージ済み）
- [CLI stabilization effort](https://github.com/NixOS/nix/issues/7701): 新 CLI の安定化の進捗をトラックする Issue
- [Why Are Flakes Still Experimental? - NixOS Discourse](https://discourse.nixos.org/t/why-flakes-still-experimental/29317): Flakes が未だに実験段階と捉えられている理由を議論している投稿
- [Flakes Are Such an Obviously Good Thing - Graham Christensen](https://grahamc.com/blog/flakes-are-an-obviously-good-thing/): Flakes の利点を強調しつつ設計・開発面での改善点を述べた記事
- [ teaching Nix 3 CLI and Flakes #281 - nix.dev](https://github.com/NixOS/nix.dev/issues/281): nix.dev において Nix 3.0 の CLI と Flakes を扱うべきかという Issue で、結論としては nix.dev で不安定な機能を推奨すべきではないとしている

これらの情報を踏まえると、Flakes は今後2年以内に安定化される可能性もありますが、それには破壊的変更が伴うかもしれません。

## 新 CLI とこれまでの CLI

Nix では 2020 年に `nix-command` と `flakes` という2つの実験的機能が導入されました。これらは新しいコマンドラインインターフェース（新 CLI）や標準化された Nix パッケージの構造定義（Flakes）、そして `flake.lock`（cargo や npm におけるバージョンロックファイルのようなもの）などをもたらしました。2024年2月1日時点ではまだ実験段階ですが、これらが Nix の利便性を大きく高めることから Nix コミュニティで広く使われています。

現在の Nix の新 CLI（`nix-command` の実験的機能）は 同じく実験的な機能である Flakes と密接に結びついています。両者を明確に分離する取り組みも行われていますが、Flakes を使うには基本的に新 CLI の利用が必須です。本書は NixOS と Flakes の初心者向けガイドなので、Flakes が依存する新 CLI と従来の CLI の違いも紹介します。

ここでは、新 CLI と Flakes（`nix-command`, `flakes`）を使う上でもはや不要となった従来の Nix CLI とその関連概念をまとめています。調べる際は、対応する新 CLI コマンドに置き換えてください（ `nix-collect-garbage` だけは代替コマンドがないので例外とします）：

1. `nix-channel`: `nix-channel` は、nixpkgs のような input (訳註: Flakeが依存する外部の Flake のこと) のバージョンを管理するための仕組みで、これは stable や unstable といったチャネル[^4]を通じて行われます。これは apt や yum, pacman といったパッケージマネージャーがパッケージリストを管理する方法と似ています。Nix 言語において `<nixpkgs>` という特別なパスが利用できるのは、この `nix-channel` の仕組みによるものです。
   1. `nix-channel` が担っていた、対話的な CLI (e.g. `nix run nixpkgs#hello`) で使うための"特にバージョン指定していないシステム共通の nixpkgs" を提供する役割は、Flake Registry (`nix registry`) によって代替されます。`flake.nix` を使う場合、入力のバージョンは `flake.nix` そのもので管理されます。
   2. Flakes では nixpkgs や他の input のバージョンをグローバルな状態として管理するのではなく、`flake.nix` の `inputs` セクションで各 Flake ごとに管理します。
2. `nix-env`: `nix-env` は従来の Nix でユーザー環境のパッケージ管理の中核を担うコマンドです。
   1. `nix-channel` で追加したデータソースからパッケージをインストールするため、インストールされるパッケージのバージョンはチャンネルに依存します。`nix-env` でインストールしたパッケージは Nix の宣言的設定に自動では記録されず、Nix の設定の制御下から外れてしまうので、他のマシンで再現するのがとても困難になります。また `nix-env` でインストールしたパッケージについては attribute name が保存されないため、アップデートの際には nixpkgs の全てのパッケージをスキャンしなおす必要があり、処理に時間がかかります。また元の attribute name の変更によって予期せぬ結果になることもあります。そのため、このコマンドを直接利用するのは推奨しません。
   2. 新 CLI では対応するコマンドは `nix profile` ですが、個人的には初心者にはおすすめしません。
3. `nix-shell`: `nix-shell` では一時的なシェル環境を作成でき、開発やテストに便利です。
   1. 新 CLI では `nix develop`, `nix shell`, `nix run` の3つのサブコマンドに分かれています。これらについては [NixOS における開発環境](../development/intro.md) の章で詳しく解説します。
4. `nix-build`: `nix-build` は Nix パッケージをビルドし、成果物を `/nix/store` に配置しますが、その成果物は Nix の宣言的設定には記録されません。
   1. 新 CLI では `nix-build` は `nix build` に置き換えられています。
5. `nix-collect-garbage`: `/nix/store` 内の使われていないストアオブジェクトを掃除するガベージコレクションコマンドです。
   1. 新 CLI では `nix store gc --debug` という類似コマンドがありますが、プロファイル世代の掃除はできないため、完全な代替ではありません。
6. その他、あまり使われないコマンドはここでは割愛します。
   1. 詳細なコマンド比較リストは [Try to explain nix commands](https://qiita.com/Sumi-Sumi/items/6de9ee7aab10bc0dbead?_x_tr_sl=auto&_x_tr_tl=en&_x_tr_hl=en) を参照してください。

[^1]: [Flakes - NixOS Wiki](https://wiki.nixos.org/wiki/Flakes)

[^2]: [Flakes are such an obviously good thing](https://grahamc.com/blog/flakes-are-an-obviously-good-thing/)

[^3]: [Draft: 1 year roadmap - NixOS Foundation](https://web.archive.org/web/20250317120825/https://nixos-foundation.notion.site/1-year-roadmap-0dc5c2ec265a477ea65c549cd5e568a9)

[^4]: [Nix channels](https://nixos.wiki/wiki/Nix_channels): 訳者追加
