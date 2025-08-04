import { defineConfig } from "vitepress"

export const ja = defineConfig({
  lang: "ja-JP",
  description: "初心者のための非公式ガイドブック",

  themeConfig: {
    nav: [
      { text: "トップ", link: "/ja/" },
      { text: "はじめに", link: "/ja/preface.md" },
      { text: "スタートガイド", link: "/ja/introduction/index.md" },
      { text: "ベストプラクティス", link: "/ja/best-practices/intro.md" },
    ],
    sidebar: [
      {
        text: "はじめに",
        items: [{ text: "はじめに", link: "/ja/preface.md" }],
      },
      {
        text: "スタートガイド",
        items: [
          { text: "概要", link: "/ja/introduction/index.md" },
          {
            text: "メリットとデメリット",
            link: "/ja/introduction/advantages-and-disadvantages.md",
          },
          {
            text: "インストール",
            link: "/ja/introduction/installation.md",
          },
        ],
      },
      {
        text: "Nix 言語",
        items: [{ text: "速習ガイド", link: "/ja/the-nix-language/index.md" }],
      },
      {
        text: "NixOS と Flakes",
        items: [
          {
            text: "NixOS を始める",
            link: "/ja/nixos-with-flakes/get-started-with-nixos.md",
          },
          {
            text: "Flakes について",
            link: "/ja/nixos-with-flakes/introduction-to-flakes.md",
          },
          {
            text: "Flakes で NixOS を管理する",
            link: "/ja/nixos-with-flakes/nixos-with-flakes-enabled.md",
          },
          {
            text: "NixOS の flake.nix について",
            link: "/ja/nixos-with-flakes/nixos-flake-configuration-explained.md",
          },
          {
            text: "Flakes と Nixpkgs モジュールシステムを組み合わせる",
            link: "/ja/nixos-with-flakes/nixos-flake-and-module-system.md",
          },
          {
            text: "Home Manager を始める",
            link: "/ja/nixos-with-flakes/start-using-home-manager.md",
          },
          {
            text: "設定のモジュール化",
            link: "/ja/nixos-with-flakes/modularize-the-configuration.md",
          },
          {
            text: "システムのアップデート",
            link: "/ja/nixos-with-flakes/update-the-system.md",
          },
          {
            text: "パッケージのバージョン変更",
            link: "/ja/nixos-with-flakes/downgrade-or-upgrade-packages.md",
          },
          {
            text: "その他の便利なヒント",
            link: "/ja/nixos-with-flakes/other-useful-tips.md",
          },
        ],
      },
      {
        text: "Nixpkgs の発展的な使い方",
        items: [
          { text: "概要", link: "/ja/nixpkgs/intro.md" },
          { text: "callPackage", link: "/ja/nixpkgs/callpackage.md" },
          { text: "Overriding", link: "/ja/nixpkgs/overriding.md" },
          { text: "Overlays", link: "/ja/nixpkgs/overlays.md" },
          {
            text: "複数の Nixpkgs インスタンス",
            link: "/ja/nixpkgs/multiple-nixpkgs.md",
          },
        ],
      },
      {
        text: "Nix Store とバイナリキャッシュ",
        items: [
          { text: "概要", link: "/ja/nix-store/intro.md" },
          {
            text: "バイナリキャッシュサーバーの追加",
            link: "/ja/nix-store/add-binary-cache-servers.md",
          },
          {
            text: "バイナリキャッシュサーバーのホスティング",
            link: "/ja/nix-store/host-your-own-binary-cache-server.md",
          },
        ],
      },
      {
        text: "ベストプラクティス",
        items: [
          { text: "概要", link: "/ja/best-practices/intro.md" },
          {
            text: "ダウンロードしたバイナリを NixOS で実行",
            link: "/ja/best-practices/run-downloaded-binaries-on-nixos.md",
          },
          {
            text: "NixOS 関連コマンドの簡素化",
            link: "/ja/best-practices/simplify-nixos-related-commands.md",
          },
          {
            text: "Dotfiles デバッグの高速化",
            link: "/ja/best-practices/accelerating-dotfiles-debugging.md",
          },
          {
            text: "NIX_PATH と Flake レジストリのカスタマイズ",
            link: "/ja/best-practices/nix-path-and-flake-registry.md",
          },
          {
            text: "リモートデプロイ",
            link: "/ja/best-practices/remote-deployment.md",
          },
          {
            text: "Derivation と Nix 式のデバッグ",
            link: "/ja/best-practices/debugging.md",
          },
        ],
      },

      {
        text: "Flakes のその他の使い方",
        items: [
          { text: "概要", link: "/ja/other-usage-of-flakes/intro.md" },
          {
            text: "Flake Inputs",
            link: "/ja/other-usage-of-flakes/inputs.md",
          },
          {
            text: "Flake Outputs",
            link: "/ja/other-usage-of-flakes/outputs.md",
          },
          {
            text: "新世代の CLI",
            link: "/ja/other-usage-of-flakes/the-new-cli.md",
          },
          {
            text: "モジュールシステムとカスタムオプション",
            link: "/ja/other-usage-of-flakes/module-system.md",
          },
          {
            text: "[WIP]テスト",
            link: "/ja/other-usage-of-flakes/testing.md",
          },
        ],
      },
      {
        text: "NixOS における開発環境",
        items: [
          {
            text: "nix shell と nix develop と pkgs.runCommand",
            link: "/ja/development/intro.md",
          },
          {
            text: "言語ごとの開発環境",
            link: "/ja/development/dev-environments.md",
          },
          {
            text: "[WIP]パッケージング入門",
            link: "/ja/development/packaging-101.md",
          },
          {
            text: "クロスプラットフォームコンパイル",
            link: "/ja/development/cross-platform-compilation.md",
          },
          {
            text: "分散ビルド",
            link: "/ja/development/distributed-building.md",
          },
          {
            text: "[WIP]カーネル開発",
            link: "/ja/development/kernel-development.md",
          },
        ],
      },
      {
        text: "高度なトピック",
        items: [{ text: "高度なトピック", link: "/ja/advanced-topics/index.md" }],
      },
      {
        text: "よくある質問",
        items: [{ text: "よくある質問", link: "/ja/faq/index.md" }],
      },
    ],
  },
})
