Add-Type @"
using System;
using System.Runtime.InteropServices;

public class DesktopLauncher {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX, dwY, dwXSize, dwYSize, dwXCountChars, dwYCountChars, dwFillAttribute, dwFlags;
        public short wShowWindow, cbReserved2;
        public IntPtr lpReserved2, hStdInput, hStdOutput, hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );

    public static int LaunchOnInteractiveDesktop(string exePath, string workingDir) {
        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = @"WinSta0\Default";

        PROCESS_INFORMATION pi;
        bool ok = CreateProcess(null, "\"" + exePath + "\"", IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, workingDir, ref si, out pi);
        if (!ok) {
            int err = Marshal.GetLastWin32Error();
            throw new Exception("CreateProcess failed with error code: " + err);
        }
        return pi.dwProcessId;
    }
}
"@

$desktopRoot = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$folderName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvd+iuoumYhea1gQ=="))
$pname = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvdy12MS4wLeS+v+aQuueJiA=="))
$pDir = Join-Path (Join-Path $desktopRoot $folderName) $pname
$exe = Join-Path $pDir "SubFlow.exe"

Write-Host "Starting on interactive desktop: $exe"
try {
    $newPid = [DesktopLauncher]::LaunchOnInteractiveDesktop($exe, $pDir)
    Write-Host "Started SubFlow PID: $newPid on WinSta0\Default"
} catch {
    Write-Warning "LaunchOnInteractiveDesktop failed: $_ , falling back to Explorer"
    Start-Process "explorer.exe" -ArgumentList "`"$exe`""
}

Start-Sleep -Seconds 3
Get-Process | Where-Object { $_.ProcessName -like "*SubFlow*" } | Select-Object Id, ProcessName, MainWindowHandle, MainWindowTitle
