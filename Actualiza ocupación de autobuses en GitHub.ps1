Copy-Item "C:\Documentos próximos\Temporales\018. 01-sep-25 a 31-ago-26\Visita del Papa\Servicio de transporte\ocupación de autobuses.html" "C:\Documentos próximos\Claude\Code\Repo 1\"
cd "C:\Documentos próximos\Claude\Code\Repo 1"
git add "ocupación de autobuses.html"
git commit -m "Actualizar ocupación de autobuses"
git push

if ($LASTEXITCODE -eq 0) {
    Write-Host "
✓ Archivo publicado correctamente en GitHub Pages." -ForegroundColor Green
} else {
    Write-Host "
✗ Ha ocurrido un error durante la publicación." -ForegroundColor Red
}

Write-Host "Pulsa Enter para cerrar..."
Read-Host
