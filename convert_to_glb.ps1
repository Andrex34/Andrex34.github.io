$sourceDir = "C:\Users\Andrex\Desktop\CoolGame v2\assets\arenas\GraveYardKit\Assets\gltf"

$models = @(
    "floor_dirt",
    "fence",
    "fence_pillar",
    "fence_gate",
    "crypt",
    "grave_A",
    "tree_dead_large"
)

$results = @()

foreach ($modelName in $models) {
    $gltfPath = Join-Path $sourceDir "$modelName.gltf"
    $binPath = Join-Path $sourceDir "$modelName.bin"
    $glbPath = Join-Path $sourceDir "$modelName.glb"

    $gltfJson = Get-Content $gltfPath -Raw
    $gltfObj = $gltfJson | ConvertFrom-Json

    if ($gltfObj.buffers -and $gltfObj.buffers.Count -gt 0) {
        $gltfObj.buffers[0].PSObject.Properties.Remove('uri')
    }

    $newJson = $gltfObj | ConvertTo-Json -Compress -Depth 100
    $binBytes = [System.IO.File]::ReadAllBytes($binPath)

    $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($newJson)
    $jsonPadded = $jsonBytes + @(0)
    while ($jsonPadded.Length % 4 -ne 0) {
        $jsonPadded += @(0x20)
    }

    $binPadded = $binBytes
    while ($binPadded.Length % 4 -ne 0) {
        $binPadded += @(0x00)
    }

    $headerLen = 12
    $jsonChunkLen = 8 + $jsonPadded.Length
    $binChunkLen = 8 + $binPadded.Length
    $totalLen = $headerLen + $jsonChunkLen + $binChunkLen

    $ms = New-Object System.IO.MemoryStream
    $writer = New-Object System.IO.BinaryWriter($ms)

    $writer.Write([UInt32]0x46546C67)
    $writer.Write([UInt32]2)
    $writer.Write([UInt32]$totalLen)

    $writer.Write([UInt32]$jsonPadded.Length)
    $writer.Write([UInt32]0x4E4F534A)
    $writer.Write($jsonPadded)

    $writer.Write([UInt32]$binPadded.Length)
    $writer.Write([UInt32]0x004E4942)
    $writer.Write($binPadded)

    $writer.Flush()
    $glbBytes = $ms.ToArray()
    $writer.Close()
    $ms.Close()

    [System.IO.File]::WriteAllBytes($glbPath, $glbBytes)

    $base64 = [System.Convert]::ToBase64String($glbBytes)

    Write-Host "=== $modelName ==="
    Write-Host "GLB size: $($glbBytes.Length) bytes, Base64 length: $($base64.Length) chars"
    Write-Host ""
    Write-Host $base64
    Write-Host ""

    $results += [PSCustomObject]@{
        Model        = $modelName
        GlbSizeBytes = $glbBytes.Length
        Base64Length = $base64.Length
    }
}

Write-Host "=========================================="
Write-Host "  CONVERTED MODELS SUMMARY"
Write-Host "=========================================="
$results | Format-Table -AutoSize
