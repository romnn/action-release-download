#!/usr/bin/env bash

DIR=$(realpath "$0")
DIR=$(dirname "${DIR}")
echo "$DIR"

rm -rf "$DIR/tmp"
mkdir "$DIR/tmp"

npm run run
