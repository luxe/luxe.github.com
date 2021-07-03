% repo_stats
% Calculates and publishes repository metrics
% July 2, 2021


# Introduction
This tool evaluates a repository and publishes metrics about it.  It tries to be agnostic to how the repository is setup and what build system it uses.  It was designed specifically for bazel repositories, so many metrics will be published related to bazel's fetch / query phases.  


# Command Line
The tool can be used from the command line.  
```
run a scan of no-remote tests and fix what is possible:
  --url arg             url to clone
  --branch arg          branch to go to after clone
  --run_dir arg         don't clone; use existing dir instead
  --configs arg         build configs to use
  -h [ --help ]         produce this help message
  -v [ --version ]      display version

```



# Ldd Results
These are the dynamic libraries used by the program.  Use `apt-file search <file>` to figure out what package you may need to install.  
```
linux-vdso.so.1
libpthread.so.0
libm.so.6
libdl.so.2
libc.so.6
/lib64/ld-linux-x86-64.so.2
librt.so.1

```



