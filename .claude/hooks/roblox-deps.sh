#!/bin/bash
# 클라우드 세션 시작 시 roblox/ 도구의 npm 패키지(three, luaparse, @fontsource/*)를 설치한다.
# roblox/package.json 이나 이 스크립트가 바뀌었을 때만 다시 설치한다.
# Playwright(Chromium)는 클라우드 환경에 미리 깔려 있어서 여기서 설치하지 않는다.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}/roblox"

hashes=node_modules/.session-start.sha256
if ! sha256sum --check --status "$hashes" 2>/dev/null; then
  rm -f "$hashes"
  npm install --no-audit --no-fund --loglevel=error
  sha256sum ../.claude/hooks/roblox-deps.sh package.json package-lock.json 2>/dev/null > "$hashes" || rm -f "$hashes"
fi
