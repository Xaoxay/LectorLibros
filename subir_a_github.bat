@echo off
set "PATH=%PATH%;C:\Program Files\Git\cmd"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0subir_a_github.ps1"
