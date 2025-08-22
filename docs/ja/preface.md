# まえがき

## NixOS 初心者の悩み - ドキュメンテーションと Flakes

NixOS は、Nix パッケージマネージャーのもとに構築された非常に特徴的な Linux ディストリビューションであり、Ubuntu、CentOS、Arch Linux などの従来のディストリビューションとは大きく異なる設計思想を持っています。

他のディストリビューションと比較したときの NixOS の最大の利点は、宣言的な設定方法と再現性が高さにあります。これにより、複数のマシンを跨いで一貫した環境を作成することができます。

しかし、NixOS は確かに強力な一方で、この強力さが複雑さを増大させ、新しく NixOS を使い始める人にとっての大きな障害となっています。その中でも特に大きな問題の一つは、他の Linux ディストリビューションで培った経験の多くが NixOS では通用しないことです。また、公式やコミュニティのドキュメントが分散していたり古くなっていたりすることがあります。これらの問題によって多くの NixOS 初心者が悩まされてきました。

それ以外にも、Nix パッケージマネージャーの実験的な機能である Flakes に関連したトラブルも見られます。Flakes は npm や cargo といったパッケージマネージャーの設計思想を参考に生み出されたもので、`flake.nix` にすべての外部依存関係を記録し、`flake.lock` ですべての依存関係のバージョンを固定します。これにより、Nix パッケージマネージャーと NixOS の再現性とコンポーザビリティが飛躍的に向上しました。

Flakes がもたらす恩恵は非常に大きく、コミュニティで広く使われるようになりました。公式の調査によれば、現在 GitHub で新たに作成される Nix リポジトリの半数以上が Flakes を採用しており、もはや従来の設定方式が主流とは言えなくなっています。

しかしその一方で、Flakes はあくまで実験的な機能であるため、不確定な要素も抱えています。そのため公式ドキュメントは、安定性を重視して Flakes に関する内容をほとんど含んでいません。これにより、多くの Nix/NixOS ユーザーが混乱しています。みんなが Flakes を使っているのを見て自分も学びたいと思うものの、どこから始めればよいかわからず、しばしば散在する情報をつなぎ合わせたり、Nixpkgs のソースコードを検索したり、より経験豊富なユーザーに助けを求めなければならない状況に陥っています。

## この本の原点

この本は、私が NixOS にのめり込んでいた時に書いたばらばらな勉強メモから生まれました。

私が今年（2023年）4月に NixOS の世界に足を踏み入れたとき、その設計思想に深く魅了されました。同時に、友人の勧めで Nix の実験的機能である Flakes についても知りました。

Flakes と従来の NixOS の設定方式を比較した結果、Flakes を利用した NixOS こそが私の求めているものだと気づきました。その結果、従来の Nix の設定方式を完全に無視し、最初の段階から直接 Flakes を使って自分の NixOS システムを構成することにしたのです。

勉強を進めていく中で、初心者向けの Flakes の資料がとても少ないことがわかりました。多くのドキュメントは従来の Nix の設定手法に焦点を当てており、私は [NixOS Wiki](https://nixos.wiki/)、[Zero to Nix](https://zero-to-nix.com/)、[Nixpkgs Reference Manual](https://nixos.org/manual/nixpkgs/stable/)、Nixpkgs ソースコードなどから、Flakes と関係のない内容を無視しつつ必要な情報だけを取り出していく必要がありました。この学習の道のりは非常に回りくどく、骨の折れるものでした。後で再び同じ轍を踏まないように、作業を進めながら断片的なメモを数多く作成しました。

いくらかの経験を積んだ今年（2023年）5月初旬、私はメイン PC を NixOS に切り替えました。そして、半月以上かけて書きためた NixOS 入門者向けのメモを整理・推敲して自分のブログ[^1]で公開し、中国の NixOS コミュニティで共有しました。そこでの好意的な反応とアドバイスをもとに、その記事を英語に翻訳して Reddit で共有したところ、大きな反響[^2]がありました。

これらのノートが好評だったことが大きな励みとなり、さらに内容を充実させたいという気持ちが高まりました。更新を続けるうちに内容は増え続け、気づけば2万字を超えるまでになっていました。ある読者から「読書体験があまり良くない」とのフィードバックを受けたので、その方の提案にしたがってコンテンツを GitHub リポジトリに移行し、専用のドキュメントサイトを立ち上げました。これにより誰もが読みやすく、また貢献しやすくなりました。同時に、表現を調整し個人的すぎる部分を削って、気ままな自分用メモではなく、より初心者向けガイドのスタイルに近づけました。

そして、多言語対応のオープンソースの本が誕生しました。私はそれを "<NixOS & Flakes Book>" と命名し、中国語版のタイトルは "NixOS & Flakes 新手指南"（"NixOS & Flakes 初心者ガイド"）としました。

このオープンソースの本の内容は、私が NixOS を使い、また読者の方たちと交流するなかで少しずつに進化していきました。読んでくださる方々からポジティブな感想をもらって達成感を感じることが、このドキュメントを更新する上で最大のモチベーションとなりました。一部の読者からのフィードバックがこの本の「進化」において非常に役立ちました。最初はただ NixOS での体験を気軽に共有したかっただけでしたが、なんとオープンソースの本にまで成長しました。海外の読者の数は自国のそれを上回り、予想だにしなかった数多くの star をいただきました。

この本に貢献や提案をしてくださった全ての友人に感謝を申し上げます。さらに、支援と励ましをくださった全ての読者に深く感謝します。彼らがいなければこの本の内容は私の個人ブログに留まり、現在の形になることはなかったでしょう。

## この本の特徴

1. 従来の Nix 設定アプローチを排した Flakes 中心の NixOS 解説
2. Linux やプログラミングの経験がある NixOS 初心者の目線で解説した、初心者向けの説明
3. ステップバイステップで段階的に学習できる構成
4. 各章の最後には参考資料へのリンクがあり、内容を深く掘り下げたり信頼性を評価したりすることが容易
5. 一貫性を持って全体が体系的に整理されており、通読して学ぶことも、必要な箇所だけをすぐに見つけることも可能

## 寄付

もしこの本があなたのお役に立てたなら、さらなる更新と維持のために寄付をしていただけると幸いです。

- GitHub: <https://github.com/sponsors/ryan4yin>
- Patreon: <https://patreon.com/ryan4yin>
- Buy me a coffee: <https://buymeacoffee.com/ryan4yin>
- 爱发电: <https://afdian.com/a/ryan4yin>
- Ethereum: `0xB74Aa43C280cDc8d8236952400bF6427E4390855`

## フィードバックと議論

私は NixOS の専門家ではなく、2024年2月現在 NixOS を使い始めてまだ9ヶ月足らずしか経っていないため、本書には誤解やこんがらがった記述が含まれると思います。間違いを見つけた方や質問・提案がある方は、issue を開いたり [GitHub Discussions](https://github.com/ryan4yin/nixos-and-flakes-book/discussions)での議論に参加したりして、お知らせください。今後もこの本を改善し続けたいと考えています。

私がこのささやかな本を書いた理由は至ってシンプルで、初心者だった頃の私が心から必要としていたものを、誰も作ってくれていなかったからです。先ほども述べたように、コミュニティのドキュメントはあまりに混沌としていました。だからこそ「ないなら、自分で作るしかない」と、自ら筆を執ることにしたのです。間違いを犯す可能性があったとしても、何もしないよりは遥かに良いことだと思ったのです。

この本が一人でも多くの人の助けとなり、皆さんが NixOS の奥深い楽しさに触れるきっかけになることを願っています。気に入っていただけたら幸いです。

## この本に関する過去のフィードバックと議論

英語でのフィードバックと関連議論：

- [[2023-05-11] NixOS & Nix Flakes - A Guide for Beginners - Reddit](https://www.reddit.com/r/NixOS/comments/13dxw9d/nixos_nix_flakes_a_guide_for_beginners/)
- [[2023-06-22] Updates: NixOS & Nix Flakes - A Guide for Beginners - Reddit](https://www.reddit.com/r/NixOS/comments/14fvz1q/updates_nixos_nix_flakes_a_guide_for_beginners/)
- [[2023-06-24] An unofficial NixOS & Flakes book for beginners - Discourse](https://discourse.nixos.org/t/an-unofficial-nixos-flakes-book-for-beginners/29561)
- [[2023-07-06] This isn't an issue but it has to be said: - Discussions](https://github.com/ryan4yin/nixos-and-flakes-book/discussions/43)

中国語でのフィードバックと議論：

- [[2023-05-09] NixOS 与 Nix Flakes 新手入门 - v2ex 社区](https://www.v2ex.com/t/938569#reply45)
- [[2023-06-24] NixOS 与 Flakes | 一份非官方的新手指南 - v2ex 社区](https://www.v2ex.com/t/951190#reply9)
- [[2023-06-24] NixOS 与 Flakes | 一份非官方的新手指南 - 0xffff 社区](https://0xffff.one/d/1547-nixos-yu-flakes-yi-fen-fei-guan)

[^1]: [NixOS & Nix Flakes - A Guide for Beginners - This Cute World](https://thiscute.world/en/posts/nixos-and-flake-basics/)

[^2]: [NixOS & Nix Flakes - A Guide for Beginners - Reddit](https://www.reddit.com/r/NixOS/comments/13dxw9d/nixos_nix_flakes_a_guide_for_beginners/)

[^3]: [Updates: NixOS & Nix Flakes - A Guide for Beginners - Reddit](https://www.reddit.com/r/NixOS/comments/14fvz1q/comment/jp4xhj3/?context=3)
