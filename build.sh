#!/usr/bin/env bash
#
# Root build for Our.Umbraco.GMaps.
#
# A thin wrapper over build.proj, which holds the actual build logic. This script only
# translates friendly flags into MSBuild properties, so there is one implementation to change.
#
#   ./build.sh                     client + every supported major, packed into ./build-out
#   ./build.sh --major 17          just the Umbraco 17 flavour
#   ./build.sh --no-client         reuse the client bundle already in wwwroot
#   ./build.sh --sites             also build the demo sites
#   ./build.sh --help              all options
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BUILD_PROJECT="$REPO_ROOT/build.proj"

TARGET="All"
MAJORS=""
PROPERTIES=()

die() { printf '\nerror: %s\n' "$*" >&2; exit 1; }

usage() {
  sed -n '3,13p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  cat <<'USAGE'

Options:
  --major <17|18|all>     Umbraco major(s) to build. Repeatable. Default: all
  -c, --configuration <c> Build configuration. Default: Release
  -o, --output <dir>      Where to write the packages. Default: ./build-out
      --no-client         Skip the client build; reuse whatever is in wwwroot
      --npm-install       Use 'npm install' instead of 'npm ci' (updates the lock file)
      --no-pack           Build only, do not produce packages
      --sites             Also build the demo site matching each selected major
      --clean             Delete previous build output before starting
  -v, --verbosity <v>     Verbosity for the inner dotnet builds. Default: minimal
  -t, --target <name>     build.proj target to run. Default: All
  -h, --help              Show this help

Anything else is passed straight through to MSBuild, so -p:Foo=Bar works too.
Run 'dotnet msbuild build.proj -t:Help' for the underlying property list.
USAGE
}

add_major() {
  # 'all' means "whatever build.proj supports", expressed by leaving the property unset.
  [[ "$1" == "all" ]] && { MAJORS="all"; return; }
  [[ "$MAJORS" == "all" ]] && return
  MAJORS="${MAJORS:+$MAJORS;}$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --major)             [[ $# -ge 2 ]] || die "--major needs a value"; add_major "$2"; shift 2 ;;
    --major=*)           add_major "${1#*=}"; shift ;;
    -c|--configuration)  [[ $# -ge 2 ]] || die "--configuration needs a value"; PROPERTIES+=("-p:Configuration=$2"); shift 2 ;;
    -o|--output)         [[ $# -ge 2 ]] || die "--output needs a value"; PROPERTIES+=("-p:PackageOutputDir=$2"); shift 2 ;;
    --no-client)         PROPERTIES+=("-p:BuildClient=false"); shift ;;
    --npm-install)       PROPERTIES+=("-p:NpmInstallCommand=install"); shift ;;
    --no-pack)           PROPERTIES+=("-p:PackPackages=false"); shift ;;
    --sites)             PROPERTIES+=("-p:BuildSites=true"); shift ;;
    --clean)             PROPERTIES+=("-p:CleanFirst=true"); shift ;;
    -v|--verbosity)      [[ $# -ge 2 ]] || die "--verbosity needs a value"; PROPERTIES+=("-p:BuildVerbosity=$2"); shift 2 ;;
    -t|--target)         [[ $# -ge 2 ]] || die "--target needs a value"; TARGET="$2"; shift 2 ;;
    -h|--help)           usage; exit 0 ;;
    *)                   PROPERTIES+=("$1"); shift ;;
  esac
done

[[ -n "$MAJORS" && "$MAJORS" != "all" ]] && PROPERTIES+=("-p:UmbracoMajors=$MAJORS")

command -v dotnet >/dev/null 2>&1 || die "the .NET SDK is required but 'dotnet' was not found on PATH"

exec dotnet msbuild "$BUILD_PROJECT" \
  -t:"$TARGET" \
  -nologo \
  -verbosity:minimal \
  ${PROPERTIES[@]+"${PROPERTIES[@]}"}
