<#
.SYNOPSIS
    Root build for Our.Umbraco.GMaps.

.DESCRIPTION
    A thin wrapper over build.proj, which holds the actual build logic. This script only
    translates friendly parameters into MSBuild properties, so there is one implementation
    to change. See Docs/multi-version-support.md for why the Umbraco majors build separately.

.PARAMETER Major
    Umbraco major(s) to build: 17, 18, or all. Default: all.

.PARAMETER Configuration
    Build configuration. Default: Release.

.PARAMETER Output
    Where to write the packages. Default: ./build-out.

.PARAMETER NoClient
    Skip the client build and reuse whatever is already in wwwroot.

.PARAMETER NpmInstall
    Use 'npm install' instead of 'npm ci' (updates the lock file).

.PARAMETER NoPack
    Build only, do not produce packages.

.PARAMETER Sites
    Also build the demo site matching each selected major.

.PARAMETER Clean
    Delete previous build output before starting.

.PARAMETER Verbosity
    Verbosity for the inner dotnet builds. Default: minimal.

.PARAMETER Target
    build.proj target to run. Default: All.

.PARAMETER MSBuildArguments
    Anything else, passed straight through to MSBuild (so -p:Foo=Bar works too).

.EXAMPLE
    ./build.ps1
    Client bundle plus every supported major, packed into ./build-out.

.EXAMPLE
    ./build.ps1 -Major 17 -Sites
    Just the Umbraco 17 flavour, and its demo site.

.EXAMPLE
    dotnet msbuild build.proj -t:Help
    The underlying property list.
#>
[CmdletBinding()]
param(
    # Not validated here: build.proj owns the list of supported majors, so adding one does
    # not mean editing this file too. An unsupported value fails there with a clear message.
    [string[]] $Major = @('all'),

    [string] $Configuration,
    [string] $Output,

    [switch] $NoClient,
    [switch] $NpmInstall,
    [switch] $NoPack,
    [switch] $Sites,
    [switch] $Clean,

    [string] $Verbosity,
    [string] $Target = 'All',

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $MSBuildArguments
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host ''
    Write-Host "error: the .NET SDK is required but 'dotnet' was not found on PATH" -ForegroundColor Red
    exit 1
}

$arguments = [System.Collections.Generic.List[string]]::new()
$arguments.Add((Join-Path $PSScriptRoot 'build.proj'))
$arguments.Add("-t:$Target")
$arguments.Add('-nologo')
$arguments.Add('-verbosity:minimal')

# 'all' means "whatever build.proj supports", expressed by leaving the property unset.
if ($Major -notcontains 'all') {
    $arguments.Add("-p:UmbracoMajors=$(($Major | Select-Object -Unique) -join ';')")
}

if ($Configuration) { $arguments.Add("-p:Configuration=$Configuration") }
if ($Output)        { $arguments.Add("-p:PackageOutputDir=$Output") }
if ($Verbosity)     { $arguments.Add("-p:BuildVerbosity=$Verbosity") }
if ($NoClient)      { $arguments.Add('-p:BuildClient=false') }
if ($NpmInstall)    { $arguments.Add('-p:NpmInstallCommand=install') }
if ($NoPack)        { $arguments.Add('-p:PackPackages=false') }
if ($Sites)         { $arguments.Add('-p:BuildSites=true') }
if ($Clean)         { $arguments.Add('-p:CleanFirst=true') }

if ($MSBuildArguments) { $arguments.AddRange([string[]] $MSBuildArguments) }

& dotnet msbuild @arguments
exit $LASTEXITCODE
