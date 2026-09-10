#Requires -Version 5.1
<#
.SYNOPSIS
  english-memory-method installer (Windows / PowerShell 5.1+)

.DESCRIPTION
  One-liner:
    irm https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.ps1 | iex
  With custom target:
    ./install.ps1 -Target "D:\my-skills"
#>
param([string]$Target = "")

$ErrorActionPreference = "Stop"
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
} catch { }

$Repo   = "yxdwind/english-memory-method"
$Branch = "main"
$Skill  = "english-memory-method"
$Raw    = "https://raw.githubusercontent.com/$Repo/$Branch"
$Files  = @("SKILL.md", "assets/plan-template.html")

# --- pick target skills dir: explicit > first existing > default ---
if (-not $Target) {
  $Candidates = @(
    (Join-Path $HOME ".openclaw-autoclaw\skills"),   # AutoClaw
    (Join-Path $HOME ".openclaw\skills"),            # OpenClaw
    (Join-Path $HOME ".claude\skills")               # Claude Code
  )
  $Target = $Candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $Target) { $Target = $Candidates[0] }
}

$Dest = Join-Path $Target $Skill
Write-Host "Installing '$Skill' -> $Dest"

foreach ($f in $Files) {
  $out = Join-Path $Dest ($f -replace "/", "\")
  New-Item -ItemType Directory -Force -Path (Split-Path $out -Parent) | Out-Null
  Invoke-WebRequest -Uri "$Raw/$f" -OutFile $out -UseBasicParsing
  Write-Host "  [OK] $f"
}

# --- verify frontmatter ---
$head = (Get-Content (Join-Path $Dest "SKILL.md") -TotalCount 5 -Encoding UTF8) -join " "
if ($head -notmatch "english-memory-method") {
  Write-Warning "SKILL.md content check failed - please verify manually"
}

Write-Host ""
Write-Host "[DONE] $Skill installed to: $Dest"
Write-Host "Restart your agent (AutoClaw / OpenClaw / Claude Code) to load it."
Write-Host "Trigger: paste an English article and ask for a memorization plan."
