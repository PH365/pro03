@echo off
start "Backend" cmd /k "python backend\app.py"
start "Frontend" cmd /k "npm run dev"