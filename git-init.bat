@echo off
set GIT="C:\Program Files\Git\cmd\git.exe"

%GIT% init
%GIT% config user.email "rekyai@example.com"
%GIT% config user.name "Oscar Zabala"
%GIT% add .
%GIT% commit -m "Initial commit of Reky AI"
%GIT% branch -M main
%GIT% remote add origin https://github.com/Vel0ciraptor/reky-ai.git
echo "Ready to push. You might get a GitHub login popup."
%GIT% push -u origin main
