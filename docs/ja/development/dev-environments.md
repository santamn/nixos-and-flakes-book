# 開発環境

NixOSでは、開発環境をインストールする方法が多数あります。理想的な方法は、各プロジェクトの開発環境を完全に独自の`flake.nix`で定義することですが、実際に使用する上では少々面倒です。毎回`flake.nix`を作成して`nix develop`を実行する必要があり、一時的なプロジェクトや単にコードを少し確認したい場合には、これは明らかに過剰です。

妥協案として、開発環境を3つのレベルに分ける方法があります。

1.  **グローバル環境**: 通常、これはhome-managerによって管理されるユーザー環境を指します。
    - 汎用的な開発ツール: `git`、`vim`、`emacs`、`tmux`など。
    - 一般的な言語のSDKとパッケージマネージャー: `rust`、`openjdk`、`python`、`go`など。
2.  **IDE環境**:
    - neovimを例にとると、home-managerはneovim自身の依存関係をその環境にカプセル化するためのラッパーを作成し、グローバル環境の汚染を防ぎます。
    - `programs.neovim.extraPackages`パラメータを使用して、neovimのプラグイン依存関係をneovimの環境に追加し、IDE自体の正常な動作を保証できます。
    - しかし、複数のIDE（emacsとneovimなど）を使用している場合、それらはしばしば多くの同じプログラム（lsp、tree-sitter、debugger、formatterなど）に依存します。管理を容易にするために、これらの共有依存関係をグローバルに配置することができます。ただし、グローバル環境の他のプログラムとの依存関係の競合（特にpythonパッケージは競合しやすい）に注意する必要があります。
3.  **プロジェクト環境**: 各プロジェクトは`flake.nix`を介して独自の開発環境（`devShells`）を定義できます。
    - 簡単にするために、よく使う言語用の汎用的な`flake.nix`テンプレートを事前に作成しておき、必要なときにテンプレートをコピーして変更するだけで使用できます。
    - プロジェクト環境の優先順位は最も高く（PATHの先頭に追加されます）、その中の依存関係はグローバル環境の同名の依存プログラムを上書きします。したがって、プロジェクトの`flake.nix`を使用してプロジェクトの依存バージョンを制御でき、グローバル環境の影響を受けません。

## 開発環境の構成テンプレート

これまでに開発環境の構築原理を学びましたが、毎回繰り返し性の高い`flake.nix`を自分で書くのは少し面倒です。

幸いなことに、コミュニティの誰かがすでにこの作業を行ってくれています。以下のリポジトリには、ほとんどのプログラミング言語の開発環境テンプレートが含まれており、コピー＆ペーストするだけで使用できます。

- [MordragT/nix-templates](https://github.com/MordragT/nix-templates)
- [the-nix-way/dev-templates](https://github.com/the-nix-way/dev-templates)

`flake.nix`の構造がまだ複雑すぎると感じ、もっと簡単な方法を望む場合は、以下のプロジェクトを検討することもできます。これはNixをより徹底的にカプセル化し、ユーザーにより簡単な定義を提供します。

- [cachix/devenv](https://github.com/cachix/devenv)

もしnixコードを一行も書きたくなく、最小限のコストで再現可能な開発環境を手に入れたい場合は、あなたのニーズに合うかもしれないツールがここにあります。

- [jetpack-io/devbox](https://github.com/jetpack-io/devbox)

## Python開発環境

Pythonの開発環境は、Java/Goなどの言語よりもはるかに面倒です。なぜなら、デフォルトでグローバル環境にソフトウェアをインストールし、現在のプロジェクトにインストールするには、まず仮想環境を作成する必要があるからです（JS/Goなどの言語には仮想環境のような面倒なものはありません）。これはNixにとって非常に非友好的な振る舞いです。

Pythonのpipはデフォルトでソフトウェアをグローバルにインストールしますが、NixOSでは`pip install`は直接エラーになります。

```shell
› pip install -r requirements.txt
error: externally-managed-environment

× This environment is externally managed
╰─> This command has been disabled as it tries to modify the immutable
    `/nix/store` filesystem.

    To use Python with Nix and nixpkgs, have a look at the online documentation:
    <https://nixos.org/manual/nixpkgs/stable/#python>.

note: If you believe this is a mistake, please contact your Python installation or OS distribution provider. You can override this, at the risk of breaking your Python installation or OS, by passing --break-system-packages.
hint: See PEP 668 for the detailed specification.
```

エラーメッセージによると、`pip install`はNixOSによって直接無効にされています。`pip install --user`を試しても同様に無効にされています。環境の再現性を向上させるために、Nixはそれらをすべて無効にしました。`mkShell`などの方法で新しい環境を作成しても、これらのコマンドは同様にエラーになります（Nixpkgsのpipコマンド自体が変更されており、`install`などの変更コマンドを実行するとすぐに終了するようになっていると推測されます）。

しかし、多くのプロジェクトのインストールスクリプトはpipに基づいているため、これらのスクリプトは直接使用できません。また、nixpkgsの内容は限られており、pypiの多くのパッケージが含まれていないため、自分でパッケージ化する必要があり、比較的面倒でユーザーの精神的負担も増えます。

解決策の1つは、`venv`仮想環境を使用することです。仮想環境内では、もちろんpipなどのコマンドを正常に使用できます。

```shell
python -m venv ./env
source ./env/bin/activate
```

または、サードパーティツールの`virtualenv`を使用することもできますが、欠点はこれを別途インストールする必要があることです。

このようにpythonで直接作成されたvenvは、一部の人にとってはまだ安心感がないかもしれません。この仮想環境も`/nix/store`に入れて不変にし、nixを介して`requirements.txt`や`poetry.toml`の依存関係を直接インストールしたいと考えるかもしれません。これはもちろん可能であり、この作業を行うための既存のNixラッパーツールがあります。

> 注意：これらの環境でも、`pip install`などのインストールコマンドを直接実行すると失敗します。Pythonの依存関係をインストールするには`flake.nix`を使用する必要があります！データはまだ`/nix/store`にあり、この種の変更コマンドはNixのビルド段階でしか実行できないためです...

- [python venv demo](https://github.com/MordragT/nix-templates/blob/master/python-venv/flake.nix)
- [poetry2nix](https://github.com/nix-community/poetry2nix)

これらのツールの利点は、Nix Flakesのロックメカニズムを利用して再現性を向上させることができる点です。欠点は、カプセル化の層が追加され、基盤がより複雑になることです。

最後に、より複雑なプロジェクトでは、上記の2つの解決策がどちらもうまくいかない場合があります。その場合、最善の解決策はコンテナ（Docker、Podmanなど）を使用することです。コンテナの制限はNixほど厳しくなく、最高の互換性を提供できます。

## Go開発環境

Goは静的リンクであり、自然と多くの問題が少なくなります。基本的にNixOS上で問題なく使用でき、追加の処理は必要ありません。

## その他の開発環境

TODO
