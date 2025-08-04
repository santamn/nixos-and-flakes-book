# Nix 言語速習ガイド

Nix 言語は Nix パッケージマネージャの基礎となる言語です。NixOS や Flakes を十分使いこなすには、この言語を理解することが不可欠です。

Nix 言語はシンプルな関数型言語です。ある程度プログラミング経験があれば、基礎を身につけるのに2時間もかからないでしょう。

コミュニティにはすでに良質な Nix 言語のチュートリアルが多数あるため、ここで一から解説はしません。まずは以下のリソースを読んで、Nix 言語の概要を素早くつかむことをおすすめします：

1. [**Nix Language Basics - nix.dev**](https://nix.dev/tutorials/first-steps/nix-language):
   Nix 言語の基礎を広く学べる初心者向けチュートリアル
2. [**A tour of Nix**](https://nixcloud.io/tour/?id=introduction/nix):
   Nix の言語構造やアルゴリズムの利用法が体験できる対話的なチュートリアル
3. [**Nix Language - Nix Reference Manual**](https://nixos.org/manual/nix/stable/language/):
   Nix 言語の公式ドキュメント
   > nix.dev などの入門チュートリアルはあくまで導入用であり、**Nix の全文法を網羅しているわけではありません**。見たことのない文法に出会ったら、この公式ドキュメントを参照してください。
4. <https://noogle.dev/>: 必要な関数やその使い方を素早く見つけられる Nix 関数ライブラリの検索エンジン

今は文法の大まかな雰囲気をつかむだけで十分です。分からないことが出てきたときは、そのときまた戻ってきて文法を確認すれば問題ありません。
