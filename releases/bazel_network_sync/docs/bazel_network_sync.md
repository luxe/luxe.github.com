% bazel_network_sync
% Calculates and sorts the slowest c++ files to build
% October 1, 2020


# Introduction
Bazel might be sourcing dependencies from unexpected domains.  We can run bazel sync under strace to capture these ip addresses.  


# Installation
Software can be installed through apt-get.  The following commands will add the ppa and install the software.  
```
sudo curl -s --compressed -o /etc/apt/sources.list.d/bazel_network_sync.list 'https://raw.githubusercontent.com/luxe/luxe.github.com/master/releases/bazel_network_sync/bazel_network_sync.list'
sudo apt update
sudo apt install bazel_network_sync

```
The debian file can also be installed/uninstalled directly.  To uninstall you can use:  
```
sudo apt remove bazel_network_sync
```



# Command Line
The tool can be used from the command line.  
```
like google but you get numbers:
  --query arg           noogle search query
  -h [ --help ]         produce this help message
  -v [ --version ]      display version

```



