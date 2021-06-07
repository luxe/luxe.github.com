
# Introduction
This tool evaluates a repository and publishes metrics about it.  It tries to be agnostic to how the repository is setup and what build system it uses.  Designed specifically for bazel repositories.  


# LDD Results
These are the dynamic libraries used by the program.  
```
{
  "entries": [
    {
      "is_pointing_at": false,
      "memory_address": "(0x00007ffcd6fef000)",
      "pointing_at": "",
      "so": "linux-vdso.so.1"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f04b3bda000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libpthread.so.0",
      "so": "libpthread.so.0"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f04b3a8b000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libm.so.6",
      "so": "libm.so.6"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f04b3a85000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libdl.so.2",
      "so": "libdl.so.2"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f04b3893000)",
      "pointing_at": "/lib/x86_64-linux-gnu/libc.so.6",
      "so": "libc.so.6"
    },
    {
      "is_pointing_at": false,
      "memory_address": "(0x00007f04b3c1f000)",
      "pointing_at": "",
      "so": "/lib64/ld-linux-x86-64.so.2"
    },
    {
      "is_pointing_at": true,
      "memory_address": "(0x00007f04b3888000)",
      "pointing_at": "/lib/x86_64-linux-gnu/librt.so.1",
      "so": "librt.so.1"
    }
  ],
  "valid": true
}
```



