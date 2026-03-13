Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "C:\Users\" & WshShell.ExpandEnvironmentStrings("%USERNAME%") & "\Documents\Mimi Tip Cards\ops\windows\start-tipcards.bat" & Chr(34), 0
Set WshShell = Nothing
