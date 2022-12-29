@echo off
git add .
git commit -m 1


for /L %%a in (
5,-1,1
) do (
rem cls
echo after %%a seconds will close...
ping -n 2 localhost 1>nul 2>nul
)
