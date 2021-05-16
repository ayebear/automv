# automv

Simple daemon script to move files matching a glob pattern to an output directory. The moves are done atomically by using a .mvtmp file first. This will continue moving new files automatically, as long as it is running.

## Requirements

Must have the `mv` command available. Only tested working on a Linux system.

## Setup and run example

```
yarn
node index.js "tmp/*.plot" "/mnt/networkdrive/plots"
```
