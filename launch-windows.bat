@echo off
setlocal
cd /d "%~dp0"
where python >nul 2>&1
if %errorlevel%==0 (
  python server.py
  goto :eof
)
where py >nul 2>&1
if %errorlevel%==0 (
  py -3 server.py
  goto :eof
)
echo Python 3 is required to launch Mech Pit Brawl.
echo Install it from https://www.python.org/downloads/ and try again.
pause
