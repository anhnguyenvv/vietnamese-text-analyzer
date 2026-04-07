param(
    [string]$ImageName = "vietnamese-text-analyzer/backend",
    [string]$Tag = "",
    [string]$OutputDir = "dist"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($Tag)) {
    $Tag = Get-Date -Format "yyyyMMdd-HHmmss"
}

$Root = (Resolve-Path (Join-Path $PSScriptRoot ".." )).Path
$OutPath = Join-Path $Root $OutputDir
if (-not (Test-Path $OutPath)) {
    New-Item -ItemType Directory -Path $OutPath | Out-Null
}

$ImageRef = "$ImageName`:$Tag"
$TarPath = Join-Path $OutPath ("backend-{0}.tar" -f $Tag)
$GzPath = "$TarPath.gz"
$MetaPath = Join-Path $OutPath ("backend-{0}.txt" -f $Tag)
$HashPath = Join-Path $OutPath ("backend-{0}.sha256" -f $Tag)

Write-Host "[1/4] Building Docker image: $ImageRef"
docker build -f (Join-Path $Root "Dockerfile") -t $ImageRef $Root

Write-Host "[2/4] Saving image to tar: $TarPath"
docker save -o $TarPath $ImageRef

Write-Host "[3/4] Compressing artifact: $GzPath"
$sourceStream = [System.IO.File]::OpenRead($TarPath)
try {
    $destStream = [System.IO.File]::Create($GzPath)
    try {
        $gzip = New-Object System.IO.Compression.GzipStream($destStream, [System.IO.Compression.CompressionMode]::Compress)
        try {
            $sourceStream.CopyTo($gzip)
        }
        finally {
            $gzip.Dispose()
        }
    }
    finally {
        $destStream.Dispose()
    }
}
finally {
    $sourceStream.Dispose()
}

Remove-Item $TarPath -Force

Write-Host "[4/4] Writing metadata and checksum"
@(
    "image=$ImageRef"
    "created_at=$(Get-Date -Format o)"
    "artifact=$([System.IO.Path]::GetFileName($GzPath))"
) | Set-Content -Path $MetaPath -Encoding UTF8

$hash = (Get-FileHash -Algorithm SHA256 $GzPath).Hash.ToLowerInvariant()
"$hash  $([System.IO.Path]::GetFileName($GzPath))" | Set-Content -Path $HashPath -Encoding UTF8

Write-Host "Done. Artifacts:"
Write-Host " - $GzPath"
Write-Host " - $MetaPath"
Write-Host " - $HashPath"
