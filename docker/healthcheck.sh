#!/bin/sh
set -e
wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
