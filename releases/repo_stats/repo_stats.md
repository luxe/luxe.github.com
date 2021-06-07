
# Introduction
This tool evaluates a repository and publishes metrics about it.  It tries to be agnostic to how the repository is setup and what build system it uses.  Designed specifically for bazel repositories.  


# LDD Results
These are the dynamic libraries used by the program.  
```
{
  "entries": [
    {
      "is_pointing_at": false,
      "memory_address": "(0x00007f39e7c08000)",
      "pointing_at": "",
      "so": "linux-vdso.so.1"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f39e7bbf000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libpthread.so.0",
      "so": "libpthread.so.0"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f39e7a70000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libm.so.6",
      "so": "libm.so.6"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f39e7a6a000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libdl.so.2",
      "so": "libdl.so.2"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f39e7878000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libc.so.6",
      "so": "libc.so.6"
    },
    {
      "is_pointing_at": false,
      "memory_address": "(0x00007f39e7c0a000)",
      "pointing_at": "",
      "so": "/lib64/ld-linux-x86-64.so.2"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f39e786d000)",
      "pointing_at": "/lib/x86_64-linux-gnu/librt.so.1",
      "so": "librt.so.1"
    }
  ],
  "valid": true
}
```



