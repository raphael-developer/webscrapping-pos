@echo off
set SCRIPT_DIR=%~dp0
pushd "%SCRIPT_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%stop-all-windows.ps1" %*
set EXIT_CODE=%ERRORLEVEL%
popd

if %EXIT_CODE% NEQ 0 (
	echo.
	echo ERRO: o script terminou com codigo %EXIT_CODE%.
	echo Pressione qualquer tecla para fechar esta janela.
	pause
)

exit /b %EXIT_CODE%
