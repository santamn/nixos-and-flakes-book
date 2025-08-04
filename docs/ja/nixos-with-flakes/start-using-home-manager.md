# Home Manager のインストールと使用

前述の通り、NixOS 自体の設定ファイルはシステムレベルの設定しか管理できず、ユーザーレベルの設定は home-manager を使って管理する必要があります。

公式ドキュメント [Home Manager Manual](https://nix-community.github.io/home-manager/index.xhtml) によると、home-manager を NixOS モジュールとしてインストールするには、まず `/etc/nixos/home.nix` を作成する必要があります。設定方法は以下の通りです：

```nix
{ config, pkgs, ... }:

{
  # 注意：ここのユーザー名とユーザーディレクトリを変更してください
  home.username = "ryan";
  home.homeDirectory = "/home/ryan";

  # 現在のフォルダの設定ファイルを、Home ディレクトリの指定された場所に直接リンクします
  # home.file.".config/i3/wallpaper.jpg".source = ./wallpaper.jpg;

  # あるフォルダ内のファイルを再帰的に、Home ディレクトリの指定された場所にリンクします
  # home.file.".config/i3/scripts" = {
  #   source = ./scripts;
  #   recursive = true;   # フォルダ全体を再帰的に
  #   executable = true;  # その中のすべてのファイルに「実行」権限を追加
  # };

  # nix 設定ファイル内で、text としてファイル内容を直接ハードコーディングします
  # home.file.".xxx".text = ''
  #     xxx
  # '';

  # マウスカーソルのサイズとフォントの DPI を設定します（4K ディスプレイ向け）
  xresources.properties = {
    "Xcursor.size" = 16;
    "Xft.dpi" = 172;
  };

  # home.packages を使って、よく使うソフトウェアをインストールします
  # これらのソフトウェアは現在のユーザーでのみ利用可能で、システムレベルの設定には影響しません
  # すべての GUI ソフトウェア、および OS とあまり関係のない CLI ソフトウェアは、home.packages を通じてインストールすることをお勧めします
  home.packages = with pkgs;[
    # 以下は私がよく使うコマンドラインツールです。必要に応じて追加・削除してください
    neofetch
    nnn # terminal file manager

    # archives
    zip
    xz
    unzip
    p7zip

    # utils
    ripgrep # recursively searches directories for a regex pattern
    jq # A lightweight and flexible command-line JSON processor
    yq-go # yaml processor https://github.com/mikefarah/yq
    eza # A modern replacement for ‘ls’
    fzf # A command-line fuzzy finder

    # networking tools
    mtr # A network diagnostic tool
    iperf3
    dnsutils  # `dig` + `nslookup`
    ldns # replacement of `dig`, it provide the command `drill`
    aria2 # A lightweight multi-protocol & multi-source command-line download utility
    socat # replacement of openbsd-netcat
    nmap # A utility for network discovery and security auditing
    ipcalc  # it is a calculator for the IPv4/v6 addresses

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

    # nix related
    #
    # it provides the command `nom` works just like `nix`
    # with more details log output
    nix-output-monitor

    # productivity
    hugo # static site generator
    glow # markdown previewer in terminal

    btop  # replacement of htop/nmon
    iotop # io monitoring
    iftop # network monitoring

    # system call monitoring
    strace # system call monitoring
    ltrace # library call monitoring
    lsof # list open files

    # system tools
    sysstat
    lm_sensors # for `sensors` command
    ethtool
    pciutils # lspci
    usbutils # lsusb
  ];

  # git 関連の設定
  programs.git = {
    enable = true;
    userName = "Ryan Yin";
    userEmail = "xiaoyin_c@qq.com";
  };

  # starship を有効にします。これは美しいシェルプロンプトです
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

  # alacritty - GPU アクセラレーション機能付きのクロスプラットフォーム端末
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
    # TODO ここにカスタム bashrc の内容を追加してください
    bashrcExtra = ''
      export PATH="$PATH:$HOME/bin:$HOME/.local/bin:$HOME/go/bin"
    '';

    # TODO いくつかのエイリアスを設定して使いやすくします。必要に応じて追加・削除してください
    shellAliases = {
      k = "kubectl";
      urldecode = "python3 -c 'import sys, urllib.parse as ul; print(ul.unquote_plus(sys.stdin.read()))'";
      urlencode = "python3 -c 'import sys, urllib.parse as ul; print(ul.quote_plus(sys.stdin.read()))'";
    };
  };

  # This value determines the Home Manager release that your
  # configuration is compatible with. This helps avoid breakage
  # when a new Home Manager release introduces backwards
  # incompatible changes.
  #
  # You can update Home Manager without changing this value. See
  # the Home Manager release notes for a list of state version
  # changes in each release.
  home.stateVersion = "25.05";
}
```

`/etc/nixos/home.nix` を追加した後、それが有効になるように `/etc/nixos/flake.nix` でこの設定をインポートする必要があります。以下のコマンドを使用して、現在のフォルダに参照用のサンプル設定を生成できます：

```shell
nix flake new example -t github:nix-community/home-manager#nixos
```

パラメータを調整した後の `/etc/nixos/flake.nix` の内容の例は以下の通りです：

```nix
{
  description = "NixOS configuration";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-25.05";
    # home-manager, used for managing user configuration
    home-manager = {
      url = "github:nix-community/home-manager/release-25.05";
      # The `follows` keyword in inputs is used for inheritance.
      # Here, `inputs.nixpkgs` of home-manager is kept consistent with
      # the `inputs.nixpkgs` of the current flake,
      # to avoid problems caused by different versions of nixpkgs.
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs@{ nixpkgs, home-manager, ... }: {
    nixosConfigurations = {
      # ここの my-nixos をあなたのホスト名に置き換えてください
      my-nixos = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux";
        modules = [
          ./configuration.nix

          # home-manager を nixos のモジュールとして設定します
          # これにより、nixos-rebuild switch 時に home-manager の設定も自動的にデプロイされます
          home-manager.nixosModules.home-manager
          {
            home-manager.useGlobalPkgs = true;
            home-manager.useUserPackages = true;

            # ここの ryan もあなたのユーザー名に置き換えてください
            # ここの import 関数は前の Nix 構文で紹介したので、ここでは詳しく説明しません
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

次に `sudo nixos-rebuild switch` を実行して設定を適用し、home-manager のインストールを完了します。

> あなたのシステムのホスト名が `my-nixos` でない場合は、`flake.nix` の `nixosConfigurations` の名前を変更するか、`--flake /etc/nixos#my-nixos` を使って設定名を指定する必要があります。

インストールが完了すると、すべてのユーザーレベルのプログラム、設定は `/etc/nixos/home.nix` を通じて管理でき、`sudo nixos-rebuild switch` を実行すると home-manager の設定も自動的に適用されます。（**手動で `home-manager switch` コマンドを実行する必要はありません！**）

`home.nix` の Home Manager の設定項目は、以下の方法で検索できます：

- [Home Manager - Appendix A. Configuration Options](https://nix-community.github.io/home-manager/options.xhtml):
  すべての設定項目のリストが含まれており、キーワードで検索することをお勧めします。
  - [Home Manager Option Search](https://mipmip.github.io/home-manager-option-search/):
    より便利なオプション検索ツールです。
- [home-manager](https://github.com/nix-community/home-manager): 一部の設定項目は公式ドキュメントに記載されていないか、ドキュメントの説明が不十分な場合があります。この home-manager のソースコードで直接検索して対応するソースコードを読むことができます。

## Home Manager vs NixOS

多くのソフトウェアパッケージやソフトウェア設定は、NixOS Module (`configuration.nix`) または Home Manager (`home.nix`) のどちらでも設定できます。これは選択のジレンマをもたらします：**ソフトウェアパッケージや設定ファイルを NixOS Module と Home Manager のどちらに書くべきか、その違いは何で、どのように決定すべきか？**

まず違いを見てみましょう。NixOS Module でインストールされたソフトウェアパッケージと設定ファイルは、システム全体でグローバルです。グローバルな設定は通常 `/etc` に保存され、システム全体にインストールされたソフトウェアはどのユーザー環境でも使用できます。

対照的に、Home Manager を通じてインストールされた設定項目は、対応するユーザーのホームディレクトリにリンクされ、インストールされたソフトウェアも対応するユーザー環境でのみ利用可能です。他のユーザーに切り替えると、これらの設定とソフトウェアは使用できなくなります。

この特性に基づき、一般的な推奨される使い方は次のとおりです：

- NixOS Module: システムのコアコンポーネント、およびすべてのユーザーが必要とするその他のソフトウェアパッケージや設定をインストールします。
  - 例えば、root ユーザーに切り替えてもソフトウェアパッケージが正常に動作するようにしたい場合や、設定をシステム全体で有効にしたい場合は、NixOS Module を使用してインストールする必要があります。
- Home Manager: その他のすべての設定とソフトウェアは、Home Manager を使用してインストールすることをお勧めします。

このアプローチの利点は次のとおりです：

1. システムレベルでインストールされたソフトウェアとバックグラウンドサービスは、しばしば root 特権ユーザーとして実行されます。システムレベルで不要なソフトウェアのインストールを避けることで、システムのセキュリティリスクを軽減できます。
2. Home Manager の多くの設定は、NixOS、macOS、およびその他の Linux ディストリビューションで共通して使用できます。ソフトウェアのインストールとシステムの設定に Home Manager を選択することで、設定の移植性を向上させることができます。
3. 複数のユーザーが必要な場合、Home Manager を通じてインストールされたソフトウェアと設定は、異なるユーザーの環境をより良く隔離し、異なるユーザー間の設定とソフトウェアバージョンの競合を避けることができます。

## 特権ユーザーとして Home Manager でインストールしたソフトウェアパッケージを使用する方法は？

この問題に対して、最初に思いつくのは `root` ユーザーに切り替えることですが、ユーザーを切り替えると、現在のユーザーが `home.nix` を通じてインストールしたソフトウェアパッケージは利用できなくなります。`kubectl` を例に（`home.nix` を通じて事前にインストール済み）、これをデモします：

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

解決策は、`sudo` を使用してコマンドを実行することです。このコマンドは、現在のユーザーに特権ユーザー（`root`）としてコマンドを実行する権限を一時的に付与します：

```sh
› sudo kubectl
kubectl controls the Kubernetes cluster manager.
...
```
