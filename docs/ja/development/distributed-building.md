# 分散ビルド

分散ビルドは、複数のマシンでローカルのコンパイル負荷を分担し、ビルド速度を向上させることができます。

NixOS公式のcache.nixos.orgは、ほとんどのX86_64アーキテクチャのキャッシュを提供しているため、通常のX86_64ユーザーは通常、分散ビルドを必要としません。

分散ビルドは、キャッシュが利用できない場合にのみ大きな価値を持ちます。主な応用シーンは以下の通りです。

1.  RISC-VまたはARM64アーキテクチャのユーザー（特にRISC-V）。公式キャッシュリポジトリにはこれらのアーキテクチャのキャッシュが少ないため、頻繁に大量のローカルコンパイルが必要になります。
2.  システムを大幅にカスタマイズするユーザー。公式キャッシュリポジトリのパッケージはすべてデフォルト設定であるため、ビルドパラメータを変更すると公式キャッシュは適用できなくなり、ローカルコンパイルが必要になります。
    1.  例えば、組み込みのシーンでは、下位のカーネルやドライバなどにカスタマイズの要求があるため、ローカルコンパイルが必要になることがあります。

## 分散ビルドの設定

公式には詳細なドキュメントがありません。記事の最後にいくつか推奨される参考ドキュメントをリストアップしました。また、以下は私の分散ビルド設定（NixOSモジュール）です。

```nix
{ ... }: {

  ####################################################################
  #
  #  NixOS's Configuration for Remote Building / Distributed Building
  #
  ####################################################################

  # set local's max-job to 0 to force remote building(disable local building)
  # nix.settings.max-jobs = 0;
  nix.distributedBuilds = true;
  nix.buildMachines =
    let
      sshUser = "ryan";
      # ssh key's path on local machine
      sshKey = "/home/ryan/.ssh/ai-idols";
      systems = [
        # native arch
        "x86_64-linux"

        # emulated arch using binfmt_misc and qemu-user
        "aarch64-linux"
        "riscv64-linux"
      ];
      # all available system features are poorly documentd here:
      #  https://github.com/NixOS/nix/blob/e503ead/src/libstore/globals.hh#L673-L687
      supportedFeatures = [
        "benchmark"
        "big-parallel"
        "kvm"
      ];
    in
      [
        # Nix seems always give priority to trying to build remotely
        # to make use of the local machine's high-performance CPU, do not set remote builder's maxJobs too high.
        {
          # some of my remote builders are running NixOS
          # and has the same sshUser, sshKey, systems, etc.
          inherit sshUser sshKey systems supportedFeatures;

          # the hostName should be:
          #   1. a hostname that can be resolved by DNS
          #   2. the ip address of the remote builder
          #   3. a host alias defined globally in /etc/ssh/ssh_config
          hostName = "aquamarine";
          # remote builder's max-job
          maxJobs = 3;
          # speedFactor's a signed integer
          # but it seems that it's not used by Nix, takes no effect
          speedFactor = 1;
        }
        {
          inherit sshUser sshKey systems supportedFeatures;
          hostName = "ruby";
          maxJobs = 2;
          speedFactor = 1;
        }
        {
          inherit sshUser sshKey systems supportedFeatures;
          hostName = "kana";
          maxJobs = 2;
          speedFactor = 1;
        }
      ];
  # optional, useful when the builder has a faster internet connection than yours
	nix.extraOptions = ''
		builders-use-substitutes = true
	'';

  # define the host alias for remote builders
  # this config will be written to /etc/ssh/ssh_config
  programs.ssh.extraConfig = ''
    Host ai
      HostName 192.168.5.100
      Port 22

    Host aquamarine
      HostName 192.168.5.101
      Port 22

    Host ruby
      HostName 192.168.5.102
      Port 22

    Host kana
      HostName 192.168.5.103
      Port 22
  '';

  # define the host key for remote builders so that nix can verify all the remote builders
  # this config will be written to /etc/ssh/ssh_known_hosts
  programs.ssh.knownHosts = {
    # 星野 愛久愛海, Hoshino Aquamarine
    aquamarine = {
      hostNames = [ "aquamarine" "192.168.5.101" ];
      publicKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIDnCQXlllHoLX5EvU+t6yP/npsmuxKt0skHVeJashizE";
    };

    # 星野 瑠美衣, Hoshino Rubii
    ruby = {
      hostNames = [ "ruby" "192.168.5.102" ];
      publicKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIE7n11XxB8B3HjdyAsL3PuLVDZxWCzEOUTJAY8+goQmW";
    };

    # 有馬 かな, Arima Kana
    kana = {
      hostNames = [ "kana" "192.168.5.103" ];
      publicKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJ3dDLOZERP1nZfRz3zIeVDm1q2Trer+fWFVvVXrgXM1";
    };
  };
}
```

## 欠陥

現在私が観察している問題は以下の通りです。

1.  ビルド時にどのホストを使用するかを指定できず、設定ファイルでホストリストを指定するしかなく、nixが自動的に利用可能なホストを選択します。
2.  ホストを選択する際、Nixは常にリモートホストを優先することに気づきました。しかし、私のローカルホストの性能が最も高いため、ローカルホストのCPUが十分に活用されません。
3.  マルチマシンリモートビルドはDerivation単位で行われるため、比較的大きなパッケージをビルドする際には、他のマシンが長時間アイドル状態になり、この大きなパッケージのビルドが完了するのを待つことになり、リソースの無駄遣いになります。
    1.  ビルドするパッケージが多く、並行して実行できる場合は、すべてのホストのCPUを簡単に活用でき、これは非常に快適です。

## 参考文献

- [Distributed build - NixOS Wiki](https://wiki.nixos.org/wiki/Distributed_build)
- [Document available system features - nix#7380](https://github.com/NixOS/nix/issues/7380)
- [Distributed builds seem to disable local builds nix#2589](https://github.com/NixOS/nix/issues/2589)
- [Offloading NixOS builds to a faster machine](https://sgt.hootr.club/molten-matter/nix-distributed-builds/)
- [tests/nixos/remote-builds.nix - Nix Source Code](https://github.com/NixOS/nix/blob/713836112/tests/nixos/remote-builds.nix#L46)
