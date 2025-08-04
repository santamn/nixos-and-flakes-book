# Running Downloaded Binaries on NixOS

NixOS は FHS (Filesystem Hierarchy Standard) に厳密には従っていないため、インターネットからダウンロードしたバイナリはそのままでは動かないことが多いです。しかし、いくつかの方法でこれらを動かすことができます。

詳しくは [Different methods to run a non-nixos executable on Nixos](https://unix.stackexchange.com/questions/522822/different-methods-to-run-a-non-nixos-executable-on-nixos) を参照してください。また [nix-alien](https://github.com/thiagokokada/nix-alien) も便利です。 Docker に慣れているなら、 Docker コンテナで動かすのも良い選択です。

わたしがよく使うのは FHS 環境を作ってバイナリを動かす方法です。簡単で便利です。

やり方： Nix モジュールに次のように追加します。

```nix
{ config, pkgs, lib, ... }:

{
  # ......

  environment.systemPackages = with pkgs; [
    # ......

    # コマンド `fhs` で FHS 環境を作成し、 NixOS で非 NixOS パッケージを実行できるようにします！
    (let base = pkgs.appimageTools.defaultFhsEnvArgs; in
      pkgs.buildFHSUserEnv (base // {
      name = "fhs";
      targetPkgs = pkgs:
        # buildFHSUserEnv は最小限の FHS 環境しか提供しません。
        # 多くのソフトで必要なパッケージは自分で追加しましょう。
        (base.targetPkgs pkgs) ++ (with pkgs; [
          pkg-config
          ncurses
          # 必要に応じて追加
        ]
      );
      profile = "export FHS=1";
      runScript = "bash";
      extraOutputsToInstall = ["dev"];
    }))
  ];

  # ......
}
```

設定を反映したら `fhs` コマンドで FHS 環境に入り、ダウンロードしたバイナリを実行できます。例：

```shell
# FHS 環境に入ると、普通の Linux のようなシェルになります
$ fhs
# /usr/bin などを確認
(fhs) $ ls /usr/bin
# 非 NixOS バイナリを実行
(fhs) $ ./bin/code
```

Discourse][Tips&Tricks for NixOS Desktop - NixOS Discourse]: Just as the title says, it
is a collection of tips and tricks for NixOS desktop.

- [nix-alien](https://github.com/thiagokokada/nix-alien): Run unpatched binaries on
  Nix/NixOS
- [nix-ld](https://github.com/Mic92/nix-ld): Run unpatched dynamic binaries on NixOS.
- [用 Nix 打包闭源软件 - Lan Tian @ Blog](https://lantian.pub/article/modify-computer/nixos-packaging.lantian/#%E5%AE%9A%E4%BD%8D%E5%88%B6%E5%BD%A2%E5%BC%8F%E5%88%86%E5%8F%91%E7%9A%84%E8%BD%AF%E4%BB%B6)

[Tips&Tricks for NixOS Desktop - NixOS Discourse]: https://discourse.nixos.org/t/tips-tricks-for-nixos-desktop/28488
