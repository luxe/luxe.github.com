% build_determinism
% Build determinism analysis for targets
% May 17, 2020


# Introduction
When evaluating the determinism of building certain targets use this tool.  It runs various bazel query commands to construct spawn information for all of the subcommands.  These subcommands are analyzed for nondeterminism.  


# Installation
Software can be installed through apt-get.  The following commands will add the ppa and install the software.  
```
sudo curl -s --compressed -o /etc/apt/sources.list.d/build_determinism.list 'https://raw.githubusercontent.com/luxe/luxe.github.com/master/releases/build_determinism/build_determinism.list'
sudo apt update
sudo apt install build_determinism

```
The debian file can also be installed/uninstalled directly.  To uninstall you can use:  
```
sudo apt remove build_determinism
```



# Command Line
The tool can be used from the command line.  
```
test for build determinism on a particular target:
  --target arg           what you would pass to bazel build
  --url arg              git url to clone with
  --run_dirs arg         which directories to run the analysis
  --branches arg         which branches to run the analysis
  --synthesize_problems  synthesize the nondeterminism problems in a human 
                         friendly way
  --environment_scan arg try the A/B tests in different environments n number 
                         of times to evaluate any flakiness of nondeterminism
  --augment_scan arg     try the A/B tests with different augmentations on the 
                         environment n number of times to evaluate any 
                         flakiness of nondeterminism
  --output_dir arg       the directory to output artifacts
  --bazel arg            the name of the bazel runner (useful if repo has a 
                         bazel wrapper or using bazelisk)
  --verbose              show verbose progress
  -h [ --help ]          produce this help message
  -v [ --version ]       display version

```



