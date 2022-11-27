#!/usr/bin/env bash

DIR=$(dirname $(realpath "$0"))
echo "$DIR"

rm -rf "$DIR/tmp"
mkdir "$DIR/tmp"

yarn run run
