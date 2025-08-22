# Home Manager 入門

前述の通り、NixOS 自体の設定ファイルはシステムレベルの設定しか管理できず、ユーザーレベルの設定は Home Manager を使って管理する必要があります。

公式ドキュメント [Home Manager Manual](https://nix-community.github.io/home-manager/index.xhtml) によると、Home Manager を NixOS モジュールとしてインストールするには、まず `/etc/nixos/home.nix` を作成する必要があります。設定方法は以下の通りです:

```nix
{ config, pkgs, ... }:

{
  # 注意: ユーザー名とホームディレクトリは自分のものに変更してください
  home.username = "ryan";
  home.homeDirectory = "/home/ryan";

  # 任意のファイルへのシンボリックリンクをホームディレクトリの指定された場所に配置する
  # 訳注: 正確には、指定したファイルを Nix store に取り込んだうえで
  # 訳注: そこへのシンボリックリンクをホームディレクトリに作成する
  # home.file.".config/i3/wallpaper.jpg".source = ./wallpaper.jpg;

  # あるフォルダ配下のファイルを再帰的にホームディレクトリの指定された場所にリンクする
  # home.file.".config/i3/scripts" = {
  #   source = ./scripts;
  #   recursive = true;   # フォルダ全体を再帰的に
  #   executable = true;  # すべてのファイルを実行可能に
  # };

  # ファイルの中身をそのまま nix ファイルに埋め込んで作成する
  # home.file.".xxx".text = ''
  #     xxx
  # '';

  # 4K ディスプレイ向けにマウスカーソルのサイズとフォントの DPI を設定する
  xresources.properties = {
    "Xcursor.size" = 16;
    "Xft.dpi" = 172;
  };

  # home.packages を使ってよく使うソフトウェアをインストールする
  # これらのソフトウェアは現在のユーザーのみ利用可能でシステムレベルの設定には影響しません
  # すべての GUI ソフトウェアおよび OS とあまり関係のない CLI ソフトウェアは
  # home.packages を通じてインストールすることをお勧めします
  home.packages = with pkgs; [
    # 以下は私がよく使うコマンドラインツールです
    # 必要に応じて追加・削除してください

    neofetch
    nnn # ターミナルファイルマネージャー

    # archives
    zip
    xz
    unzip
    p7zip

    # utils
    ripgrep # ディレクトリ内を正規表現で再帰的に検索
    pattern
    jq      # 軽量で柔軟なコマンドライン用 JSON 処理ツール
    yq-go   # yaml processor https://github.com/mikefarah/yq
    eza     # ‘ls’ のモダンな代替
    fzf     # 曖昧検索用コマンド

    # networking tools
    mtr       # ネットワーク診断ツール
    iperf3
    dnsutils  # `dig` + `nslookup`
    ldns      # `dig` の代替で、`drill` コマンドを提供
    aria2     # 軽量なマルチプロトコル・マルチソース CLI ダウンロードツール
    socat     # openbsd-netcat の代替
    nmap      # ネットワーク探索とセキュリティ監査ツール
    ipcalc    # IPv4/v6 アドレスの計算ツール

    # misc
    cowsay
    file
    which
    tree
    gnused
    gnutar
    gawk
    zstd
    gnupg

    # nix 関連
    #
    # nix と同様に動作し、より詳細なログ出力を提供する `nom` コマンドを提供する
    nix-output-monitor

    # productivity
    hugo # 静的サイトジェネレーター
    glow # ターミナルでの Markdown プレビュー

    btop  # htop/nmon の代替
    iotop # IO 監視ツール
    iftop # ネットワーク監視ツール

    # system call monitoring
    strace # システムコール監視ツール
    ltrace # ライブラリコール監視ツール
    lsof   # 開いているファイルのリスト

    # system tools
    sysstat
    lm_sensors # `sensors` コマンド用
    ethtool
    pciutils   # lspci
    usbutils   # lsusb
  ];

  # git の基本設定
  # 自分用に変更してください
  programs.git = {
    enable = true;
    userName = "Ryan Yin";
    userEmail = "xiaoyin_c@qq.com";
  };

  # starship - どのシェルでも使えるカスタマイズ可能なプロンプト
  programs.starship = {
    enable = true;
    # カスタム設定
    settings = {
      add_newline = false;
      aws.disabled = true;
      gcloud.disabled = true;
      line_break.disabled = true;
    };
  };

  # alacritty
  # GPU アクセラレーション機能付きクロスプラットフォームターミナルエミュレータ
  programs.alacritty = {
    enable = true;
    # カスタム設定
    settings = {
      env.TERM = "xterm-256color";
      font = {
        size = 12;
        draw_bold_text_with_bright_colors = true;
      };
      scrolling.multiplier = 5;
      selection.save_to_clipboard = true;
    };
  };

  programs.bash = {
    enable = true;
    enableCompletion = true;
    # TODO: ここに自分の bashrc の内容を追加してください
    bashrcExtra = ''
      export PATH="$PATH:$HOME/bin:$HOME/.local/bin:$HOME/go/bin"
    '';

    # いくつかのエイリアスを設定して使いやすくします
    # 必要に応じて追加・削除してください
    shellAliases = {
      k = "kubectl";
      urldecode = "python3 -c 'import sys, urllib.parse as ul; print(ul.unquote_plus(sys.stdin.read()))'";
      urlencode = "python3 -c 'import sys, urllib.parse as ul; print(ul.quote_plus(sys.stdin.read()))'";
    };
  };

  # この値はあなたの設定ファイルが互換性を持つ Home Manager のバージョン (state version) を示します
  # この設定をすることで新しい Home Manager に後方互換性のない変更が入っても
  # 設定の破損を避けることができます
  #
  # この値を変えなくても Home Manager 本体を更新することができます
  # 各リリースでの state version の変更については
  # Home Manager のリリースノートを参照してください
  home.stateVersion = "25.05";
}
```

`/etc/nixos/home.nix` を作成した後、この新しい設定を有効化するには `/etc/nixos/flake.nix` でこの設定をインポートする必要があります。以下のコマンドを使えば、現在のフォルダに参考例となる設定を生成できます:

```shell
nix flake new example -t github:nix-community/home-manager#nixos
```

パラメータを調整した後の `/etc/nixos/flake.nix` の内容は以下の通りです:

```nix
{
  description = "NixOS configuration";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    # home-manager: ユーザー設定の管理に使われる
    home-manager = {
      url = "github:nix-community/home-manager/release-25.05";
      # inputs の `follows` キーワードは依存関係を継承するために使われます
      # ここでは home-manager 側の `inputs.nixpkgs` を
      # この flake の `inputs.nixpkgs` と同じものに揃えることで
      # 異なる nixpkgs を混在させないようにし、バージョンの差異に起因する不具合を防ぎます
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ nixpkgs, home-manager, ... }: {
    nixosConfigurations = {
      # この my-nixos はあなたのホスト名に置き換えてください
      my-nixos = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./configuration.nix

          # home-manager を nixos のモジュールとして設定します
          # これにより、`nixos-rebuild switch` を実行したとき
          # home-manager の設定も自動的にデプロイされます
          home-manager.nixosModules.home-manager
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;

            # ここの ryan もあなたのユーザー名に置き換えてください
            home-manager.users.ryan = import ./home.nix;

            # home-manager.extraSpecialArgs を使って ./home.nix に渡すパラメータをカスタマイズします
            # 下の行のコメントを外すと、home.nix で flake のすべての inputs パラメータを使用できるようになります
            # home-manager.extraSpecialArgs = inputs;
          }
        ];
      };
    };
  };
}
```

そして `sudo nixos-rebuild switch` を実行して設定を適用すれば、home-manager が自動的にインストールされます。

> あなたのシステムのホスト名が `my-nixos` でない場合は、`flake.nix` の `nixosConfigurations` の名前を変更するか、`--flake /etc/nixos#my-nixos` を使って設定名を指定する必要があります。

インストールを完了すると、すべてのユーザーレベルのパッケージや設定は `/etc/nixos/home.nix` を通じて管理でき、`sudo nixos-rebuild switch` を実行することで home-manager の設定も自動的に適用されることになります（**手動で `home-manager switch` コマンドを実行する必要はありません！**）。

`home.nix` で利用できる設定項目については、以下のドキュメントを参考にしてください:

- [Home Manager - Appendix A. Configuration Options](https://nix-community.github.io/home-manager/options.xhtml):
  すべての設定項目が網羅されており、キーワードでの検索がお勧めです
  - [Home Manager Option Search](https://mipmip.github.io/home-manager-option-search/):
    より便利なオプション検索ツールです
- [home-manager](https://github.com/nix-community/home-manager): 一部の設定項目は公式ドキュメントに記載されていないか、ドキュメントの説明が不十分な場合があります。この home-manager のリポジトリで直接検索して対応するソースコードを確認することもできます。

## Home Manager vs NixOS

多くのソフトウェアパッケージや設定は、NixOS Module (`configuration.nix`) または Home Manager (`home.nix`) のどちらでも設定できます。これは次のような選択のジレンマをもたらします: **ソフトウェアパッケージや設定ファイルを NixOS Module と Home Manager のどちらに置くべきか、またそれをどのように決めるべきか？**

まず違いを見てみましょう。NixOS Module でインストールされたソフトウェアパッケージや設定ファイルは、システム全体に適用されます。グローバルな設定は通常 `/etc` に保存され、システム全体にインストールされたソフトウェアはどのユーザー環境でも使用できます。

対照的に、Home Manager を通じてインストールされた設定項目は、対応するユーザーのホームディレクトリにリンクされ、インストールされたソフトウェアも対応するユーザー環境でのみ利用可能です。他のユーザーに切り替えると、これらの設定とソフトウェアは使用できなくなります。

これらの特徴に基づき、一般的に推奨される使い方は次のとおりです:

- NixOS Module: システムのコアコンポーネントや、すべてのユーザーが必要とするソフトウェアパッケージ・設定のインストール
  - 例えば、root ユーザーに切り替えてもソフトウェアパッケージが正常に動作するようにしたい場合や、設定をシステム全体で有効にしたい場合は、NixOS Module を使用してインストールする必要があります
- Home Manager: その他のすべてのソフトウェア・設定のインストール

このアプローチの利点は次のとおりです:

1. システムレベルでインストールされたソフトウェアやバックグラウンドサービスは、しばしば root 権限のもとで実行されます。システムレベルでインストールされるソフトウェアを必要最低限にすることで、システムのセキュリティリスクを軽減することができます。
2. Home Manager の設定の多くは、NixOS、macOS、およびその他の Linux ディストリビューションで共通して利用できます。ソフトウェアのインストールとシステムの設定に Home Manager を使うことで、設定の移植性を高めることができます。
3. 複数のユーザーがシステムを利用する場合、Home Manager を通じてソフトウェアや設定をインストールすることでユーザーたちの環境をうまく隔離し、ユーザー間で設定やソフトウェアバージョンの競合を避けることができます。

## Home Manager でインストールされたソフトウェアパッケージを特権ユーザーとして使うには？

この問題について最初に思いつくのは `root` ユーザーに切り替えることですが、ユーザーを切り替えると、現在のユーザーが `home.nix` を通じてインストールしたソフトウェアパッケージは利用できなくなります。`kubectl` を例に（`home.nix` を通じて事前にインストール済み）、この問題を見てみましょう:

```sh
# 1. kubectl が現在利用可能
› kubectl | head
kubectl controls the Kubernetes cluster manager.

 Find more information at: https://kubernetes.io/docs/reference/kubectl/
......

# 2. `root` ユーザーに切り替える
› sudo su

# 3. kubectl が利用できなくなり、見つからないというエラーが表示される
> kubectl
Error: nu::shell::external_command

  × External command failed
   ╭─[entry #1:1:1]
 1 │ kubectl
   · ───┬───
   ·    ╰── executable was not found
   ╰────
  help: No such file or directory (os error 2)


/home/ryan/nix-config> exit
```

解決策は、`sudo` を使用してコマンドを実行することです。このコマンドは、現在のユーザーに特権ユーザー（`root`）としてコマンドを実行する権限を一時的に付与します:

```sh
› sudo kubectl
kubectl controls the Kubernetes cluster manager.
...
```
