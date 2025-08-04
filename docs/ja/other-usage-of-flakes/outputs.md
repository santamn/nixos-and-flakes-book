# Flakeのoutputs {#flake-outputs}

`flake.nix`の`outputs`はattribute setで、Flake全体のビルド結果を定義します。各Flakeはさまざまなoutputsを持つことができます。

特定の名前のoutputsには特別な用途があり、Nixコマンドで自動的に認識されます。例：

- Nix packages: `apps.<system>.<name>`、`packages.<system>.<name>`、`legacyPackages.<system>.<name>`などはNixパッケージとして扱われ、`nix build .#name`でビルドできます。
- Nix Helper Functions: `lib`という名前のoutputsはFlakeの関数ライブラリとして他のFlakeからimportできます。
- Nix development environments: `devShells`は開発環境用outputsで、`nix develop`で利用できます。
- NixOS configurations: `nixosConfigurations.<hostname>`はNixOSシステム設定で、`nixos-rebuild switch .#<hostname>`でデプロイできます。
- Nix templates: `templates`はFlakeテンプレートで、`nix flake init --template <reference>`で利用できます。
- その他、ユーザー定義のoutputsもNix関連ツールで利用されることがあります。

詳細は公式ドキュメント [Flakes Check - Nix Manual] を参照してください。

NixOS Wikiの例：

```nix
{
  inputs = {
    # ......
  };

  outputs = { self, ... }@inputs: {
    # `nix flake check`で実行
    checks."<system>"."<name>" = derivation;
    # `nix build .#<name>`で実行
    packages."<system>"."<name>" = derivation;
    # `nix build .`で実行
    packages."<system>".default = derivation;
    # `nix run .#<name>`で実行
    apps."<system>"."<name>" = {
      type = "app";
      program = "<store-path>";
    };
    # `nix run . -- <args?>`で実行
    apps."<system>".default = { type = "app"; program = "..."; };
    # フォーマッタ
    formatter."<system>" = derivation;
    # 旧式パッケージ
    legacyPackages."<system>"."<name>" = derivation;
    # Overlay
    overlays."<name>" = final: prev: { };
    overlays.default = {};
    # NixOSモジュール
    nixosModules."<name>" = { config }: { options = {}; config = {}; };
    nixosModules.default = {};
    # NixOS構成
    nixosConfigurations."<hostname>" = {};
    # 開発シェル
    devShells."<system>"."<name>" = derivation;
    devShells."<system>".default = derivation;
    # Hydraビルドジョブ
    hydraJobs."<attr>"."<system>" = derivation;
    # テンプレート
    templates."<name>" = {
      path = "<store-path>";
      description = "template description goes here?";
    };
    templates.default = { path = "<store-path>"; description = ""; };
  };
}
```
