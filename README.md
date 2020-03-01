# About

This repository contains the source code of a script which is used to generate a pitch accent dictionary for use with [Yomichan](https://github.com/FooSoft/yomichan).
It uses the data provided by the [kanjium](https://github.com/mifunetoshiro/kanjium) repository, specifically the file [accents.txt](https://github.com/mifunetoshiro/kanjium/blob/master/data/source_files/raw/accents.txt).

## Usage

A node script is used to generate the dictionary data:

```sh
node main.js path/to/accents.txt ./output
```

The data can then be added to a .zip archive using any software.
The example below uses the 7z command line executable to generate the archive:

```sh
7z a -tzip -mx=9 -mm=Deflate -mtc=off -mcu=on kanjium_pitch_accents.zip ./output/*.json
```
