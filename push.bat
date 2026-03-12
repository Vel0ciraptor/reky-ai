@echo off
set GIT="C:\Program Files\Git\cmd\git.exe"
%GIT% add backend/src/infra/database/prisma.service.ts
%GIT% commit -m "Fix SSL connection for Supabase PG Driver"
%GIT% push
