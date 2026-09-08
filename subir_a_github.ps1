$Host.UI.RawUI.WindowTitle = "Subir Lector Libros a GitHub"
Clear-Host

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       SUBIR LECTOR LIBROS A TU CUENTA DE GITHUB" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$env:Path += ";C:\Program Files\Git\cmd"

# Verificar Git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] No se encontro Git instalado." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    Exit
}

# 1. Identidad de Git
$gitUser = git config --get user.name
if (-not $gitUser) {
    Write-Host "[1/3] Configuracion inicial de Git:" -ForegroundColor Yellow
    $name = Read-Host "Escribe tu Nombre o Apodo"
    $email = Read-Host "Escribe tu Correo electronico"
    git config --global user.name "$name"
    git config --global user.email "$email"
    Write-Host "[OK] Identidad guardada." -ForegroundColor Green
    Write-Host ""
}

# 2. Pedir URL del repositorio
Write-Host "[2/3] Enlace de tu repositorio de GitHub:" -ForegroundColor Yellow
Write-Host "Copia el link de tu repositorio creado en GitHub"
Write-Host "Ejemplo: https://github.com/tu-usuario/LectorLibros.git"
Write-Host ""
$repoUrl = Read-Host "Pega aqui el link de tu repositorio"

if (-not $repoUrl) {
    Write-Host "[ERROR] No ingresaste ningun enlace." -ForegroundColor Red
    Read-Host "Presiona Enter para salir..."
    Exit
}

# 3. Guardar cambios y subir
Write-Host ""
Write-Host "[3/3] Guardando archivos y subiendo a GitHub..." -ForegroundColor Yellow
git add .
git commit -m "Lector Libros: version lista para compilar APK y actualizar"
git branch -M main

git remote remove origin 2>$null
git remote add origin $repoUrl.Trim()

Write-Host ""
Write-Host "Subiendo archivos a GitHub..." -ForegroundColor Cyan
Write-Host "(Si se abre una ventana en el navegador para iniciar sesion, dale autorizar)" -ForegroundColor Gray
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "  ¡LISTO! Tu proyecto se subio con exito a GitHub." -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora entra a tu repositorio en GitHub, ve a la pestana 'Actions'"
    Write-Host "y veras como se esta compilando tu archivo .APK de Android."
} else {
    Write-Host ""
    Write-Host "[AVISO] Ocurrio un detalle al subir." -ForegroundColor Red
    Write-Host "Verifica si el enlace es correcto y autorizaste el inicio de sesion."
}

Write-Host ""
Read-Host "Presiona Enter para cerrar esta ventana..."
