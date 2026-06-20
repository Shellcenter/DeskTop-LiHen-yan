' 无控制台窗口启动桌宠（供 .bat 调用）
If WScript.Arguments.Count < 1 Then WScript.Quit 1
exe = WScript.Arguments(0)
CreateObject("WScript.Shell").Run """" & exe & """", 0, False
