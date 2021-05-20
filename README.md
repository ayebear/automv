# automv

Simple daemon script to move files matching a glob pattern to a list of output directories. The moves are done atomically using rsync. This will continue moving new files automatically, as long as it is running. The output directories will be checked for enough free space to move the input files to, and round robin them as they fill up.

## Setup and run example

Make sure `rsync` and `ssh` commands are installed and available. Must have ssh keys configured for remote hosts.

```
yarn
cp config.json.example config.json
# Edit config.json
./index.js config.json
```
