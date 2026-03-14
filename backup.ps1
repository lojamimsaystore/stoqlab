$src = "C:\Users\Romeu\Stoqlab"
$dst = "C:\Users\Romeu\Stoqlab\Backup"

$excludes = @("node_modules", ".next", ".git", "Backup")

Get-ChildItem -Path $src -Exclude $excludes | ForEach-Object {
  Copy-Item -Path $_.FullName -Destination $dst -Recurse -Force
}

Write-Host "Backup concluido com sucesso!"
