$WshShell = New-Object -ComObject WScript.Shell
$ShortcutPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "My NextJS App.lnk"
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "C:\Curs\Antigravity\app_next_js\start_app.bat"
$Shortcut.WorkingDirectory = "C:\Curs\Antigravity\app_next_js"
$Shortcut.WindowStyle = 1
# Если есть иконка проекта, её можно указать тут. Пока используем стандартную системную или оставляем пустой.
# $Shortcut.IconLocation = "C:\Curs\Antigravity\app_next_js\public\favicon.ico"
$Shortcut.Save()

Write-Host "Ярлык успешно создан на рабочем столе!" -ForegroundColor Green
