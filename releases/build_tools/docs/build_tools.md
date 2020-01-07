% build_tools
% Build tool analysis for targets
% January 7, 2020


# Introduction
When evaluating what tools are used for building certain targets use this tool.  It builds the target and shows which tools were involved in the target's creation.  


# Installation
Software can be installed through apt-get.  The following commands will add the ppa and install the software.  
```
sudo curl -s --compressed -o /etc/apt/sources.list.d/build_tools.list 'https://raw.githubusercontent.com/luxe/luxe.github.com/master/releases/build_tools/build_tools.list'
sudo apt update
sudo apt install build_tools

```
The debian file can also be installed/uninstalled directly.  To uninstall you can use:  
```
sudo apt remove build_tools
```



# Command Line
The tool can be used from the command line.  
```
find build tools used on a particular target:
  --target arg          what you would pass to bazel build
  --url arg             git url to clone with
  --run_dir arg         where to run the analysis
  --bazel arg           the name of the bazel runner (useful if repo has a 
                        bazel wrapper or using bazelisk)
  --verbose             show verbose progress
  -h [ --help ]         produce this help message
  -v [ --version ]      display version

```


