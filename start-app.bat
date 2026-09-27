@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Floor Plan App Launcher

rem =====================================================================
rem  Corporate Floor Plan and Seat Allocation Management System
rem  One-click launcher: installs anything missing, prepares the database,
rem  starts the server and opens the app in your browser. If the app is
rem  already running from this folder, it opens that one.
rem
rem  Options: prod, reset, nobrowser. Help: start-app.bat help
rem
rem  The server only listens on this computer (127.0.0.1). To reach it
rem  from other machines on your network, change HOST below to 0.0.0.0.
rem =====================================================================

set "HOST=127.0.0.1"
set "PORT=3000"
set "MODE=dev"
set "RESET=0"
set "OPEN_BROWSER=1"
set "SCHEMA_HASH_FILE=node_modules\.prisma\schema.sha1"

:parse_args
if "%~1"=="" goto :args_done
if /i "%~1"=="prod" (set "MODE=prod" & goto :next_arg)
if /i "%~1"=="reset" (set "RESET=1" & goto :next_arg)
if /i "%~1"=="nobrowser" (set "OPEN_BROWSER=0" & goto :next_arg)
if /i "%~1"=="help" goto :usage
if "%~1"=="/?" goto :usage
echo Unknown option: %~1
goto :usage
:next_arg
shift /1
goto :parse_args
:args_done

pushd "%~dp0" || (set "ERR_MSG=Cannot open the app folder." & goto :fail)

echo.
echo  ==============================================================
echo   Corporate Floor Plan ^& Seat Allocation Management System
echo  ==============================================================
echo.

rem ---------------------------------------------------------------------
rem  1. Tooling, and an app already running from this folder
rem ---------------------------------------------------------------------
where node >nul 2>&1 || (set "ERR_MSG=Node.js was not found. Install Node.js 18.17 or newer from https://nodejs.org, then run this again." & goto :fail)
where npm >nul 2>&1 || (set "ERR_MSG=npm was not found. Reinstall Node.js from https://nodejs.org, then run this again." & goto :fail)
node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>18||(a===18&&b>=17)?0:1)" || goto :node_too_old
rem A second server here would wipe the first one's .next output.
call :find_running_app
if defined RUNNING_PORT goto :already_running

rem ---------------------------------------------------------------------
rem  2. Dependencies (first run only)
rem ---------------------------------------------------------------------
if exist "node_modules\next\package.json" if exist "node_modules\.bin\prisma.cmd" goto :deps_ok
echo [SETUP] Installing dependencies. The first run can take a few minutes...
call npm install
if errorlevel 1 (set "ERR_MSG=npm install failed. Check your internet connection and the messages above." & goto :fail)
:deps_ok

rem ---------------------------------------------------------------------
rem  3. Database: create + seed on first run, re-sync when schema changes
rem ---------------------------------------------------------------------
if "%RESET%"=="1" goto :reset_db

:check_db
if not exist "prisma\dev.db" goto :create_db
call :schema_unchanged && goto :db_ready
echo [SETUP] Syncing the database with prisma\schema.prisma...
call npx prisma db push
if errorlevel 1 (set "ERR_MSG=Could not apply the schema change. If it needs to drop data, run: start-app.bat reset" & goto :fail)
call :save_schema_hash
goto :db_ready

:create_db
echo [SETUP] Creating the SQLite database...
call npx prisma db push
if errorlevel 1 (set "ERR_MSG=Could not create the database. See the messages above." & goto :fail)
echo [SETUP] Loading demo data...
call npm run seed
if errorlevel 1 (set "ERR_MSG=Loading the demo data failed. See the messages above." & goto :fail)
call :save_schema_hash
goto :db_ready

:reset_db
echo [RESET] This ERASES all floor plans, allocations, snapshots and audit
echo         history, then reloads the demo data. Close any other running
echo         copy of the app first.
choice /c YN /m "Reset the database now"
if errorlevel 2 (echo Reset cancelled. & goto :check_db)
call npx prisma db push --force-reset
if errorlevel 1 (set "ERR_MSG=Database reset failed. Close any running copy of the app and try again." & goto :fail)
call npm run seed
if errorlevel 1 (set "ERR_MSG=Loading the demo data failed. See the messages above." & goto :fail)
call :save_schema_hash

:db_ready

rem ---------------------------------------------------------------------
rem  4. Pick a free port, starting at %PORT%
rem ---------------------------------------------------------------------
set /a "PORT_LIMIT=PORT+20"
:find_port
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul || goto :port_ok
echo [INFO] Port %PORT% is already in use, trying the next one...
set /a "PORT+=1"
if %PORT% GTR %PORT_LIMIT% (set "ERR_MSG=No free port found. Close other local servers and try again." & goto :fail)
goto :find_port
:port_ok

title Floor Plan App - http://localhost:%PORT%

rem ---------------------------------------------------------------------
rem  5. Start the server
rem ---------------------------------------------------------------------
if "%MODE%"=="prod" goto :run_prod

echo.
echo  Starting the development server...
echo    App URL : http://localhost:%PORT%
echo    Stop    : press Ctrl+C in this window
echo.
call :open_browser_when_ready
call npm run dev -- -p %PORT% -H %HOST%
goto :server_stopped

:run_prod
echo [BUILD] Building the production bundle...
call npm run build
if errorlevel 1 (set "ERR_MSG=The production build failed. See the messages above." & goto :fail)
echo.
echo  Starting the production server...
echo    App URL : http://localhost:%PORT%
echo    Stop    : press Ctrl+C in this window
echo.
call :open_browser_when_ready
call npm run start -- -p %PORT% -H %HOST%

:server_stopped
echo.
echo  The server has stopped.
pause
popd
exit /b 0

rem =====================================================================
rem  Helpers
rem =====================================================================

:already_running
if not "%MODE%%RESET%"=="dev0" (set "ERR_MSG=The app is already running at http://localhost:%RUNNING_PORT%. Close its window first, then run this again." & goto :fail)
echo  The app is already running at http://localhost:%RUNNING_PORT%
echo  (started from another window), so it was not started a second time.
set "PORT=%RUNNING_PORT%"
call :open_browser_when_ready
timeout /t 5 /nobreak >nul 2>&1
popd
exit /b 0

:find_running_app
rem Sets RUNNING_PORT to the port of a Next.js server running from this folder, if any.
set "RUNNING_PORT="
for /f "usebackq delims=" %%p in (`powershell -NoProfile -Command "$app = (Get-Location).Path + '\node_modules\next\'; $ids = @(Get-CimInstance Win32_Process -Filter 'Name=''node.exe''' | Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($app, [StringComparison]::OrdinalIgnoreCase) -ge 0 } | ForEach-Object { $_.ProcessId }); if ($ids.Count) { Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess } | Select-Object -First 1 -ExpandProperty LocalPort }"`) do set "RUNNING_PORT=%%p"
goto :eof

:schema_unchanged
rem Exit code 0 when prisma\schema.prisma matches the hash saved after the last sync.
node -e "const f=require('fs'),h=require('crypto').createHash('sha1').update(f.readFileSync('prisma/schema.prisma')).digest('hex');let o='';try{o=f.readFileSync(process.argv[1],'utf8')}catch(e){}process.exit(h===o?0:1)" "%SCHEMA_HASH_FILE%"
goto :eof

:save_schema_hash
node -e "const f=require('fs'),h=require('crypto').createHash('sha1').update(f.readFileSync('prisma/schema.prisma')).digest('hex');f.writeFileSync(process.argv[1],h)" "%SCHEMA_HASH_FILE%"
goto :eof

:open_browser_when_ready
rem Waits in the background until the server accepts connections, then opens the browser.
if "%OPEN_BROWSER%"=="0" goto :eof
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "for ($i = 0; $i -lt 240; $i++) { try { (New-Object Net.Sockets.TcpClient('127.0.0.1', %PORT%)).Close(); Start-Process 'http://localhost:%PORT%'; break } catch { Start-Sleep -Milliseconds 500 } }"
goto :eof

:node_too_old
for /f "delims=" %%v in ('node -v') do set "NODE_VER=%%v"
set "ERR_MSG=Node.js %NODE_VER% is too old. This app needs Node.js 18.17 or newer: https://nodejs.org"
goto :fail

:usage
echo.
echo  Usage: start-app.bat [prod] [reset] [nobrowser]
echo.
echo    (no options)  start the development server with hot reload
echo    prod          build and run the optimized production server
echo    reset         erase the database and reload the demo seed data
echo    nobrowser     do not open the browser automatically
echo.
pause
exit /b 1

:fail
echo.
echo  [ERROR] %ERR_MSG%
echo.
pause
popd
exit /b 1
