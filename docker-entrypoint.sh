#!/bin/sh
set -eu

flask --app run:app db upgrade
exec "$@"
