
# Introduction
This tool evaluates a repository and publishes metrics about it.  It tries to be agnostic to how the repository is setup and what build system it uses.  Designed specifically for bazel repositories.  


# LDD Results
These are the dynamic libraries used by the program.  
```
{
  "file": "/home/luxe/.cache/bazel/_bazel_luxe/9b1d289b10540c9752c68b55618a2156/execroot/__main__/bazel-out/k8-fastbuild/bin/code/programs/reflexivity/publish/software/main.runfiles/__main__/code/programs/repo_tools/repo_stats/repo_stats",
  "results": {
    "entries": [
      {
        "is_pointing_at": false,
        "memory_address": "(0x00007ffffbdd1000)",
        "pointing_at": "",
        "so": "linux-vdso.so.1"
      },
      {
        "is_pointing_at": true,
        "memory_address": "(0x00007feb2c86b000)",
        "pointing_at": "/lib/x86_64-linux-gnu/libpthread.so.0",
        "so": "libpthread.so.0"
      },
      {
        "is_pointing_at": true,
        "memory_address": "(0x00007feb2c71c000)",
        "pointing_at": "/lib/x86_64-linux-gnu/libm.so.6",
        "so": "libm.so.6"
      },
      {
        "is_pointing_at": true,
        "memory_address": "(0x00007feb2c716000)",
        "pointing_at": "/lib/x86_64-linux-gnu/libdl.so.2",
        "so": "libdl.so.2"
      },
      {
        "is_pointing_at": true,
        "memory_address": "(0x00007feb2c524000)",
        "pointing_at": "/lib/x86_64-linux-gnu/libc.so.6",
        "so": "libc.so.6"
      },
      {
        "is_pointing_at": false,
        "memory_address": "(0x00007feb2c8b0000)",
        "pointing_at": "",
        "so": "/lib64/ld-linux-x86-64.so.2"
      },
      {
        "is_pointing_at": true,
        "memory_address": "(0x00007feb2c519000)",
        "pointing_at": "/lib/x86_64-linux-gnu/librt.so.1",
        "so": "librt.so.1"
      }
    ],
    "valid": true
  }
}
```



