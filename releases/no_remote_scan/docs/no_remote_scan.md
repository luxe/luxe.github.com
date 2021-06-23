% no_remote_scan
% Evaluates no-remote tests to see if they will work remotely
% June 23, 2021


# Introduction
This tool attempts to fix no-remote tests.  It runs no-remote tests without the tag to see if they work remotely.  It will also tries running them remotely with different exec_properties to see if they can be made to pass.  


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



