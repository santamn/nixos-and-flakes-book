![](./docs/public/nixos-and-flakes-book.webp)

# NixOS & Flakes Book :hammer_and_wrench: :heart:

これは ryan4yin 氏の [NixOS & Flakes Book](https://nixos-and-flakes.thiscute.world/) の日本語訳を行う進行中のプロジェクトです。オリジナルのリポジトリは [ryan4yin/nixos-and-flakes-book](https://github.com/ryan4yin/nixos-and-flakes-book) です。また、翻訳を行うにあたっては [GunmaRamens/nixos-and-flakes-book-ja](https://github.com/GunmaRamens/nixos-and-flakes-book-ja) を参考にさせていただきました。

本家のREADMEは [README-en.md](./README-en.md) にあります。

## サーバーのセットアップ

nix をインストールし、flakes を有効にした状態で以下のコマンドを実行してください。

```bash
$ nix develop
$ pnpm install
```

次を実行することで、ローカルサーバーを起動できます。

```bash
$ pnpm run docs:dev
```

## 貢献への参加

このプロジェクトでは、一度AIによって下訳を行ったものを人間が確認し修正する形で翻訳を行なっています。そのため全ての英語のファイルに対応する日本語訳のファイルがありますが、実際の翻訳の進捗は [進捗管理のissue](https://github.com/santamn/nixos-and-flakes-book/issues/1) で管理されています。もし翻訳に参加したい方は、新たな issue を立てて担当したい章(ディレクトリ)をお知らせください。ページ単位での貢献でも大歓迎です。

## 参考文献

- 表紙はアニメ「[ローリング☆ガールズ](https://ja.wikipedia.org/wiki/THE_ROLLING_GIRLS)」の画像を基にしています。
- NixOS のロゴは [NixOS](https://nixos.org/) のものです。

## ライセンス

[NixOS & Flakes Book](https://github.com/ryan4yin/nixos-and-flakes-book) © 2023 by Ryan Yin is licensed under [CC BY-SA 4.0](./LICENSE.md)
