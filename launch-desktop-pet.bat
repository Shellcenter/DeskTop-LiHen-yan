@echo off
chcp 65001 >nul

setlocal



set "INSTALLED=%LOCALAPPDATA%\DesktopPet\DesktopPet.exe"



if exist "%INSTALLED%" (

  wscript.exe //nologo "%~dp0scripts\launch-silent.vbs" "%INSTALLED%"

  exit /b 0

)



cd /d "%~dp0"

set "EXE_RELEASE=%~dp0src-tauri\target\release\desktop-pet.exe"



if exist "%EXE_RELEASE%" (

  wscript.exe //nologo "%~dp0scripts\launch-silent.vbs" "%EXE_RELEASE%"

  exit /b 0

)



echo.

echo [离恨烟桌宠] 还没有安装。

echo 请先运行一次：npm run install:app

echo 或者直接双击：install-app.bat

echo.

pause

exit /b 1

