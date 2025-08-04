# Flakeのinputs {#flake-inputs}

`flake.nix`の`inputs`はattribute setで、現在のFlakeが依存するものを指定します。inputsにはさまざまな種類があり、例を挙げます：

> 詳しい例は公式ドキュメント [Flakes Check - Nix Manual] を参照してください。

```nix
{
  inputs = {
    # GitHubリポジトリをデータソースとし、masterブランチを使う。最も一般的なinput形式
    nixpkgs.url = "github:Mic92/nixpkgs/master";
    # 任意のhttps/sshプロトコルのGitリポジトリ
    git-example.url = "git+https://git.somehost.tld/user/path?ref=branch";
    # タグ指定のGitリポジトリ
    git-example-tag.url = "git+https://git.somehost.tld/user/path?tag=x.y.x";
    # プルリクエスト指定のGitHubリポジトリ
    git-pr.url = "github:NixOS/nixpkgs?ref=pull/349351/head";
    # サブモジュール付きGitリポジトリ
    git-example-submodule.url = "git+https://git.somehost.tld/user/path?submodules=1";
    # アーカイブファイルURL（LFS利用時など）
    git-example-lfs.url = "https://codeberg.org/solver-orgz/treedome/archive/master.tar.gz";
    # nix 2.27以降、LFS対応のinput
    treedome.url = "git+https://codeberg.org/solver-orgz/treedome?ref=master&lfs=1";
    # sshプロトコル+鍵認証+shallow clone
    ssh-git-example.url = "git+ssh://git@github.com/ryan4yin/nix-secrets.git?shallow=1";
    # ローカルのgitリポジトリ
    git-directory-example.url = "git+file:/path/to/repo?shallow=1";
    # サブディレクトリ指定
    nixpkgs.url = "github:foo/bar?dir=shu";
    # ローカルディレクトリ（絶対パスなら'path:'は省略可）
    directory-example.url = "path:/path/to/repo";

    # データソースがflakeでない場合はflake=falseを指定
    bar = {
      url = "github:foo/bar/branch";
      flake = false;
    };

    sops-nix = {
      url = "github:Mic92/sops-nix";
      # `follows`はinputs内の継承構文
      # ここではsops-nixの`inputs.nixpkgs`を現在のflakeのinputs.nixpkgsと一致させる
      inputs.nixpkgs.follows = "nixpkgs";
    };

    # commit固定
    nix-doom-emacs = {
      url = "github:vlaci/nix-doom-emacs?rev=238b18d7b2c8239f676358634bfb32693d3706f3";
      flake = false;
    };
  };

  outputs = { self, ... }@inputs: { ... };
}
```

## 参考

- [Flakes Check - Nix Manual]

[Flakes Check - Nix Manual]: https://nix.dev/manual/nix/stable/command-ref/new-cli/nix3-flake-check
