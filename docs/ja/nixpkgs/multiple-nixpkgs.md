# 複数nixpkgsインスタンスの活用

前章「[パッケージのダウングレード・アップグレード](../nixos-with-flakes/downgrade-or-upgrade-packages.md)」で、`import nixpkgs {...}`のようにして複数の異なるnixpkgsインスタンスを生成し、`specialArgs`で各サブモジュールに渡す方法を紹介しました。これは様々な用途で役立ちます。よくある例は：

1. 異なるcommit idのnixpkgsインスタンスを生成し、異なるバージョンのパッケージをインストールする（前章参照）。
2. overlaysを使いたいが、デフォルトのnixpkgsインスタンスには影響させたくない場合、新たなnixpkgsインスタンスを生成し、その上でoverlaysを適用する。
   - 前章のOverlaysで紹介した`nixpkgs.overlays = [...];`はグローバルなnixpkgsインスタンスを直接変更します。深いレベルのパッケージを変更すると他のモジュールにも影響し、大量のローカルビルドやパッケージの不具合を招くことがあります。
3. クロスコンパイルやQEMUエミュレーションを使う場合、複数のnixpkgsインスタンスを使い分けて異なるビルド設定やgccパラメータを適用できます。

このように、複数のnixpkgsインスタンスを使い分けるのは非常に有用です。

## `nixpkgs`のインスタンス化

グローバルではないnixpkgsインスタンスを生成するには、以下のような構文がよく使われます：

```nix
{
  # シンプルな例
  pkgs-xxx = import nixpkgs {
    system = "x86_64-linux";
  };

  # カスタムoverlays付きnixpkgs
  pkgs-yyy = import nixpkgs {
    system = "x86_64-linux";
    overlays = [
      (self: super: {
        google-chrome = super.google-chrome.override {
          commandLineArgs =
            "--proxy-server='https=127.0.0.1:3128;http=127.0.0.1:3128'";
        };
        # ...他のoverlays
      })
    ];
  };

  # より複雑な例（クロスコンパイル）
  pkgs-zzz = import nixpkgs {
    localSystem = "x86_64-linux";
    crossSystem = {
      config = "riscv64-unknown-linux-gnu";
      gcc.arch = "rv64gc";
      gcc.abi = "lp64d";
    };
    overlays = [
      (self: super: {
        google-chrome = super.google-chrome.override {
          commandLineArgs =
            "--proxy-server='https=127.0.0.1:3128;http=127.0.0.1:3128'";
        };
        # ...他のoverlays
      })
    ];
  };
}
```

Nix言語の`import`式は、他のNixファイルのパスを引数に取り、その実行結果を返します。パスがディレクトリの場合は、その中の`default.nix`を実行します。

nixpkgsはGitリポジトリで、ルートに`default.nix`があるため、`import nixpkgs`は[nixpkgs/default.nix](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/default.nix)の実行結果を返します。ここから辿ると、実装は[pkgs/top-level/impure.nix](https://github.com/NixOS/nixpkgs/blob/nixos-23.05/pkgs/top-level/impure.nix)にあります。

## 注意点

複数nixpkgsインスタンスを作る際の注意点をいくつか挙げます：

1. [1000 instances of nixpkgs](https://discourse.nixos.org/t/1000-instances-of-nixpkgs/17347)の記事にもある通り、サブモジュールやサブflakesで`import`を多用すると、毎回新しいnixpkgsインスタンスが生成され、ビルド時間やメモリ消費が増大します。`flake.nix`でまとめてインスタンスを作るのが推奨されます。
2. QEMUエミュレーションやクロスコンパイルを混在させる場合、パッケージが何度もビルドされることがあるので注意が必要です。
