@echo off
REM Wrapper para iniciar backend e frontend via PowerShell (duplo-clique)
REM Usa pushd para mapear UNC para uma letra de unidade quando necessário
set SCRIPT_DIR=%~dp0
pushd "%SCRIPT_DIR%"
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-all-windows.ps1" %*
set EXIT_CODE=%ERRORLEVEL%
popd

if %EXIT_CODE% NEQ 0 (
	echo.
	echo ERRO: o script terminou com codigo %EXIT_CODE%.
	echo Veja o output acima para detalhes. Pressione qualquer tecla para fechar esta janela e copiar a mensagem.
	pause
)

exit /b %EXIT_CODE%
