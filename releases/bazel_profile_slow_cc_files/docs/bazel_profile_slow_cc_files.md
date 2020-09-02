% bazel_profile_slow_cc_files
% Calculates and sorts the slowest c++ files to build
% September 2, 2020


# Introduction
C++ files can be slow to compile because of templates and header parsing.  This tool uses bazel to profile the build of a particular target and extract the actions that were the c++ compilation.  It sorts and presents the slowest to compile files.  Note that this is file compilation and not duration of any particular target.  


# Installation
Software can be installed through apt-get.  The following commands will add the ppa and install the software.  
```
sudo curl -s --compressed -o /etc/apt/sources.list.d/bazel_profile_slow_cc_files.list 'https://raw.githubusercontent.com/luxe/luxe.github.com/master/releases/bazel_profile_slow_cc_files/bazel_profile_slow_cc_files.list'
sudo apt update
sudo apt install bazel_profile_slow_cc_files

```
The debian file can also be installed/uninstalled directly.  To uninstall you can use:  
```
sudo apt remove bazel_profile_slow_cc_files
```



# Command Line
The tool can be used from the command line.  
```
like google but you get numbers:
  --query arg           noogle search query
  -h [ --help ]         produce this help message
  -v [ --version ]      display version

```



