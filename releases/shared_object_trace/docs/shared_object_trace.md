% shared_object_trace
% Bazel Graph Creation on 3rd party libraries that are related through shared objects
% December 30, 2019


# Introduction
When evaluating the impact that a third party repository has on other third party libraries via shared objects, use this tool.  It scans files within external folders to construct a simplified and conceptual view of third party inter-dependence via shared object files.  


# Installation
Software can be installed through apt-get.  The following commands will add the ppa and install the software.  
```
sudo curl -s --compressed -o /etc/apt/sources.list.d/shared_object_trace.list 'https://raw.githubusercontent.com/luxe/luxe.github.com/master/releases/shared_object_trace/shared_object_trace.list'
sudo apt update
sudo apt install shared_object_trace

```
The debian file can also be installed/uninstalled directly.  To uninstall you can use:  
```
sudo apt remove shared_object_trace
```



# Command Line
The tool can be used from the command line.  
```
constructs graph for third party dependance on a third party dependency:
  --dep arg             third party dep name (applied as '@DEP//...')
  --run_dir arg         where to run the analysis
  --output_dir arg      the directory to output graph artifacts
  --bazel arg           the name of the bazel runner (useful if repo has a 
                        bazel wrapper or using bazelisk)
  -h [ --help ]         produce this help message
  -v [ --version ]      display version

```


