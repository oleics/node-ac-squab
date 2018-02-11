#!/usr/bin/env bash

if [ -z "$1" ]; then
  echo "Missing first argument: app-id"
  exit 1
fi

heroku git:remote -a "$1"
git push heroku master
