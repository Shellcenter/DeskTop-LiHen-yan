@echo off
chcp 65001 >nul

setlocal



set "INSTALLED=%LOCALAPPDATA%\DesktopPet\DesktopPet.exe"

if exist "%INSTALLED%" (

  wscript.exe //nologo "%~dp0scripts\launch-silent.vbs" "%INSTALLED%"

  exit /b 0

)



cd /d "%~dp0"

call "%~dp0install-app.bat"

