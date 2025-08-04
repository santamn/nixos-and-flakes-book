# 高度なトピック {#advanced-topics}

## コミュニティ

- [Nixコミュニティ公式ページ](https://nixos.org/community/): 公式コミュニティ、フォーラム、RFC、公式チームの構成、コミュニケーションや貢献のためのチャネルなどの情報が含まれています。
- [Nix Channel Status](https://status.nixos.org/): 各Nix Channelの現在のビルド状況。
- [nix-community/NUR](https://github.com/nix-community/NUR): Nixpkgsには多数のソフトウェアパッケージが含まれていますが、レビューの速度やライセンスの問題などにより、一部のパッケージはタイムリーに収録されていません。NURは分散型のNixパッケージリポジトリであり、誰でも自分のプライベートリポジトリを作成してNURに追加し、他の人が利用できるようにすることができます。Nixpkgsにないパッケージを使いたい場合は、ここで探してみてください。自分で作成したNixパッケージを他の人と共有したい場合は、NURのREADMEに従って自分のプライベートNixリポジトリを作成・共有できます。

日本語コミュニティ：

- [NixOS-JP](https://nixos.jp/): NixOSの日本語コミュニティのウェブサイトで、素晴らしいコンテンツがいくつかあります。

また、日本語コミュニティのNixOSグループに参加して議論することもできます：

- Discord: <https://discord.gg/nixos-jp>

## ドキュメントとビデオ

Nixのツールチェーンに慣れてきたら、Nixの3つのマニュアルや他のコミュニティドキュメントをさらに読んで、より多くの使い方を探求することができます：

- [Eelco Dolstra - The Purely Functional Software Deployment Model - 2006](https://edolstra.github.io/pubs/phd-thesis.pdf): Eelco Dolstraの画期的な博士論文で、Nixパッケージマネージャの設計思想を紹介しています。
- [Nix Reference Manual](https://nixos.org/manual/nix/stable/package-management/profiles.html): Nixパッケージマネージャの使用マニュアルで、主にNixパッケージマネージャの設計とコマンドラインの使用方法について説明しています。
- [nixpkgs Manual](https://nixos.org/manual/nixpkgs/unstable/): 主にNixpkgsのパラメータ、Nixパッケージの使用、変更、パッケージング方法について紹介しています。
- [NixOS Manual](https://nixos.org/manual/nixos/unstable/): NixOSシステムの使用マニュアルで、主にWayland/X11、GPUなどのシステムレベルの設定について説明しています。
- [nix-pills](https://nixos.org/guides/nix-pills): Nix Pillsは、Nixを使用してソフトウェアパッケージをビルドする方法について深く解説しており、公式ドキュメントよりも明確で分かりやすく、十分に深いため、一読の価値があります。
- [nixos-in-production](https://github.com/Gabriella439/nixos-in-production): 本番環境でNixOSを使用する方法を紹介する書籍で、現在執筆中ですが、すでに素晴らしい内容がいくつか含まれています。

また、Youtubeの[NixOS Foundation](https://www.youtube.com/@NixOS-Foundation)と[NixCon](https://www.youtube.com/@NixCon)の2つのチャンネルには、多くの公式ビデオがあり、内容が豊富です。以下のいくつかのビデオは特にお勧めです：

- [Summer of Nix 2022 — Public Lecture Series](https://www.youtube.com/playlist?list=PLt4-_lkyRrOMWyp5G-m_d1wtTcbBaOxZk): NixOS Foundationが主催する一連の公開講座で、Eelco Dolstra、Armijn HemelなどのNixコミュニティのコアメンバーが講師を務め、Nixの発展の歴史、NixOSの歴史、Nixの未来など、多岐にわたる内容が満載です。
- [Summer of Nix 2023 — Nix Developer Dialogues](https://www.youtube.com/playlist?list=PLt4-_lkyRrOPcBuz_tjm6ZQb-6rJjU3cf): 2023年のSummer of Nixでは、Nixコミュニティのコアメンバーによる一連の対話が行われ、Nixpkgsの進化とアーキテクチャの課題、Nixのモジュールシステムの探求、Nixエコシステムの議論、NixpkgsにおけるAIの応用、商業分野でのNixの応用とオープンソース経済学などが含まれています。

また、@NickCaoが2021年に行ったNixパッケージマネージャに関する詳細な講演も一見の価値があります：

- [金枪鱼之夜：Nix - 从构建系统到配置管理](https://www.bilibili.com/video/BV13Y411p7DS/) (Tuna Night: Nix - From Build System to Configuration Management)

## 高度な技術とコミュニティプロジェクト

Nix Flakesにかなり慣れてきたら、Flakesの高度な使い方を試すことができます。以下は人気のあるコミュニティプロジェクトです：

- [flake-parts](https://github.com/hercules-ci/flake-parts): Moduleシステムを通じて設定の記述とメンテナンスを簡素化します。
- [flake-utils-plus](https://github.com/gytis-ivaskevicius/flake-utils-plus): 同じくFlake設定を簡素化するためのサードパーティパッケージですが、より強力なようです。
- ......

その他にも多くの実用的なコミュニティプロジェクトを探求できます：

- [nix-output-monitor](https://github.com/maralorn/nix-output-monitor): `nix build`コマンドの出力ログを美しくし、より詳細なログ情報やビルドタイマーなどの追加情報を表示します。強くお勧めします！
- [agenix](https://github.com/ryantm/agenix): secrets管理ツール。
- [nixos-generator](https://github.com/nix-community/nixos-generators): イメージ生成ツール。nixos設定からiso/qcow2などの形式のイメージを生成します。
- [lanzaboote](https://github.com/nix-community/lanzaboote): secure bootを有効にします。
- [impermanence](https://github.com/nix-community/impermanence): ステートレスシステムを設定するために使用します。指定したファイルやフォルダを永続化し、同時に/homeディレクトリをtmpfsとしてマウントするか、起動のたびにツールで消去することができます。これにより、impermanenceによって管理されていないすべてのデータは一時的なデータとなり、問題が発生した場合はシステムを再起動するだけで、これらのデータはすべて初期状態に戻ります！
- [colmena](https://github.com/zhaofengli/colmena): NixOSホスト展開ツール。
- [devbox](https://github.com/jetpack-io/devbox): Nixベースの軽量な開発環境管理ツールで、earthlyに似ています。開発環境とデプロイ環境を統一し、一貫性を保つことを目指しています。
- [nixpak](https://github.com/nixpak/nixpak): サンドボックスを使用して任意のNixアプリケーション（GUIアプリケーションを含む）を実行するツールで、システムのセキュリティを向上させます。
- [nixpacks](https://github.com/railwayapp/nixpacks): 任意のコードを自動的にOCIコンテナイメージにパッケージングするツールで、buildpacksに似ています。
- ...

さらに詳しく知りたい場合は、[awesome-nix](https://github.com/nix-community/awesome-nix)をご覧ください。
