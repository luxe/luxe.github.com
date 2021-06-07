
# Introduction
This tool evaluates a repository and publishes metrics about it.  It tries to be agnostic to how the repository is setup and what build system it uses.  Designed specifically for bazel repositories.  


# LDD Results
These are the dynamic libraries used by the program.  
```
{
  "entries": [
    {
      "is_pointing_at": false,
      "memory_address": "(0x00007ffc649eb000)",
      "pointing_at": "",
      "so": "linux-vdso.so.1"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f07bc1c9000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libpthread.so.0",
      "so": "libpthread.so.0"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f07bc07a000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libm.so.6",
      "so": "libm.so.6"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f07bc074000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libdl.so.2",
      "so": "libdl.so.2"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f07bbe82000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libc.so.6",
      "so": "libc.so.6"
    },
    {
      "is_pointing_at": false,
      "memory_address": "(0x00007f07bc20e000)",
      "pointing_at": "",
      "so": "/lib64/ld-linux-x86-64.so.2"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f07bbe77000)",
      "pointing_at": "/lib/x86_64-linux-gnu/librt.so.1",
      "so": "librt.so.1"
    }
  ],
  "valid": true
}
```



