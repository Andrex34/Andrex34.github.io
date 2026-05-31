$assetDir = "assets\arenas\GraveYardKit\Assets\gltf"
$texPath = "$assetDir\halloweenbits_texture.png"
$texBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $texPath))
$texB64 = [Convert]::ToBase64String($texBytes)
$texDataUri = "data:image/png;base64,$texB64"

$models = @("floor_dirt", "fence", "fence_pillar", "fence_gate", "crypt", "grave_A", "tree_dead_large")

foreach ($m in $models) {
  $gltfPath = "$assetDir\$m.gltf"
  $binPath = "$assetDir\$m.bin"
  $glbPath = "$assetDir\$m.glb"
  
  $gltf = Get-Content $gltfPath -Raw -Encoding UTF8 | ConvertFrom-Json
  
  $binBytes = [System.IO.File]::ReadAllBytes((Resolve-Path $binPath))
  
  # Replace texture URI with data URI
  foreach ($img in $gltf.images) {
    $img.uri = $texDataUri
  }
  
  # Remove uri from the first buffer (it becomes GLB binary chunk)
  $gltf.buffers[0].PSObject.Properties.Remove('uri')
  $gltf.buffers[0].byteLength = $binBytes.Length
  
  $jsonStr = $gltf | ConvertTo-Json -Depth 10 -Compress
  $jsonBytes = [System.Text.Encoding]::UTF8.GetBytes($jsonStr)
  
  $jsonPadLen = (4 - ($jsonBytes.Length % 4)) % 4
  $jsonPadded = [byte[]]::new($jsonBytes.Length + $jsonPadLen)
  [Array]::Copy($jsonBytes, $jsonPadded, $jsonBytes.Length)
  for ($i = 0; $i -lt $jsonPadLen; $i++) { $jsonPadded[$jsonBytes.Length + $i] = 0x20 }
  
  $binPadLen = (4 - ($binBytes.Length % 4)) % 4
  $binPadded = [byte[]]::new($binBytes.Length + $binPadLen)
  [Array]::Copy($binBytes, $binPadded, $binBytes.Length)
  
  $jsonChunkLength = $jsonPadded.Length
  $binChunkLength = $binPadded.Length
  $totalLength = 12 + 8 + $jsonChunkLength + 8 + $binChunkLength
  
  $header = [byte[]]::new(12)
  [System.Text.Encoding]::ASCII.GetBytes("glTF").CopyTo($header, 0)
  [System.BitConverter]::GetBytes([uint32]2).CopyTo($header, 4)
  [System.BitConverter]::GetBytes([uint32]$totalLength).CopyTo($header, 8)
  
  $jsonChunkHeader = [byte[]]::new(8)
  [System.BitConverter]::GetBytes([uint32]$jsonChunkLength).CopyTo($jsonChunkHeader, 0)
  [System.BitConverter]::GetBytes([uint32]0x4E4F534A).CopyTo($jsonChunkHeader, 4)
  
  $binChunkHeader = [byte[]]::new(8)
  [System.BitConverter]::GetBytes([uint32]$binChunkLength).CopyTo($binChunkHeader, 0)
  [System.BitConverter]::GetBytes([uint32]0x004E4942).CopyTo($binChunkHeader, 4)
  
  $glb = [byte[]]::new($totalLength)
  $offset = 0
  $header.CopyTo($glb, $offset); $offset += 12
  $jsonChunkHeader.CopyTo($glb, $offset); $offset += 8
  $jsonPadded.CopyTo($glb, $offset); $offset += $jsonChunkLength
  $binChunkHeader.CopyTo($glb, $offset); $offset += 8
  $binPadded.CopyTo($glb, $offset)
  
  [System.IO.File]::WriteAllBytes($glbPath, $glb)
  Write-Output "$m.glb done ($totalLength bytes)"
}
