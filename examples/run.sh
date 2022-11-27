#!/usr/bin/env bash

DIR=$(dirname $(realpath "$0"))
echo "$DIR"

rm -rf "$DIR/tmp"
mkdir "$DIR/tmp"

env \
  GITHUB_REPOSITORY=romnn/ldap-manager \
  GITHUB_ACTION_REPOSITORY=romnn/publish-crates \
  RUNNER_TEMP=./tmp \
  yarn run run
