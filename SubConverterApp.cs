using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Net.NetworkInformation;
using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using System.Drawing;
using System.Threading;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Reflection;
using System.Windows.Forms;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

[assembly: AssemblyTitle("SubFlow")]
[assembly: AssemblyDescription("SubFlow 订阅流")]
[assembly: AssemblyCompany("SubFlow")]
[assembly: AssemblyProduct("SubFlow 订阅流")]
[assembly: AssemblyCopyright("Copyright © SubFlow")]
[assembly: AssemblyVersion("2.0.0.3")]
[assembly: AssemblyFileVersion("2.0.0.3")]
[assembly: AssemblyInformationalVersion("v2.0.0-alpha.3")]

namespace SubFlow
{
    public class MainForm : Form
    {
        private WebView2 webView;
        private NotifyIcon trayIcon;
        private ContextMenu trayMenu;
        private MenuItem trayCloseToTrayItem;
        private GatewayServer gateway;
        private bool isExplicitExit = false;
        private bool closeToTray = true;
        private bool hasShownTrayTip = false;

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern void SwitchToThisWindow(IntPtr hWnd, bool fUnknown);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        private const int DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1 = 19;
        private const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;

        public void ApplyTheme(bool isDark)
        {
            try
            {
                int useDark = isDark ? 1 : 0;
                if (DwmSetWindowAttribute(this.Handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDark, sizeof(int)) != 0)
                {
                    DwmSetWindowAttribute(this.Handle, DWMWA_USE_IMMERSIVE_DARK_MODE_BEFORE_20H1, ref useDark, sizeof(int));
                }
                this.BackColor = isDark ? Color.FromArgb(6, 8, 13) : Color.FromArgb(248, 250, 252);
                if (webView != null)
                {
                    webView.DefaultBackgroundColor = this.BackColor;
                }
            }
            catch { }
        }

        protected override void OnHandleCreated(EventArgs e)
        {
            base.OnHandleCreated(e);
            ApplyTheme(true);
        }

        public static MainForm Instance { get; private set; }

        public MainForm()
        {
            Instance = this;
            Program.Log("MainForm constructor started.");

            // 1. 窗口几何属性与曜石背景
            this.Text = "SubFlow · 现代订阅流中心";
            this.Size = new Size(1080, 860);
            this.MinimumSize = new Size(850, 600);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(6, 8, 13);
            this.ShowInTaskbar = true;
            this.closeToTray = GatewayServer.CloseToTraySetting;

            // 2. 加载专属定制高保真图标
            try
            {
                string icoPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "app.ico");
                if (File.Exists(icoPath))
                {
                    this.Icon = new Icon(icoPath);
                    Program.Log("Loaded app.ico successfully.");
                }
                else
                {
                    this.Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
                }
            }
            catch (Exception ex)
            {
                Program.Log("Icon loading fallback: " + ex.Message);
            }

            // 3. 初始化系统托盘 NotifyIcon
            try
            {
                trayMenu = new ContextMenu();
                trayMenu.MenuItems.Add("⚡ 打开主界面", (s, e) => RestoreMainWindow());
                trayCloseToTrayItem = new MenuItem((closeToTray ? "✔️ " : "　 ") + "关闭窗口时最小化到托盘", (s, e) => {
                    SetCloseToTray(!closeToTray);
                });
                trayMenu.MenuItems.Add(trayCloseToTrayItem);
                trayMenu.MenuItems.Add("-");
                trayMenu.MenuItems.Add("❌ 彻底退出", (s, e) => {
                    isExplicitExit = true;
                    ExitApp();
                });

                trayIcon = new NotifyIcon();
                trayIcon.Text = "SubFlow 现代订阅流 (2026)";
                trayIcon.Icon = this.Icon;
                trayIcon.ContextMenu = trayMenu;
                trayIcon.Visible = true;
                trayIcon.MouseClick += (s, e) => {
                    if (e.Button == MouseButtons.Left) RestoreMainWindow();
                };
                trayIcon.DoubleClick += (s, e) => RestoreMainWindow();
                Program.Log("TrayIcon setup complete.");
            }
            catch (Exception ex)
            {
                Program.Log("TrayIcon error: " + ex.Message);
            }

            // 4. 启动内置高性能 HTTP 网关服务 (Port 25588)
            gateway = new GatewayServer(25588);
            gateway.Start();

            // 5. 挂载 WebView2 现代化前端视图
            webView = new WebView2();
            webView.Dock = DockStyle.Fill;
            webView.DefaultBackgroundColor = Color.FromArgb(6, 8, 13);
            webView.CoreWebView2InitializationCompleted += (s, e) => {
                Program.Log("Event: CoreWebView2InitializationCompleted, Success: " + e.IsSuccess + (e.IsSuccess ? "" : " Err: " + e.InitializationException));
            };
            webView.NavigationStarting += (s, e) => Program.Log("Event: NavigationStarting: " + e.Uri);
            webView.NavigationCompleted += (s, e) => Program.Log("Event: NavigationCompleted: " + e.IsSuccess + " WebErrorStatus: " + e.WebErrorStatus);
            this.Controls.Add(webView);

            // 6. 生命周期钩子
            this.Load += (s, e) => Program.Log("Event: Load, Handle: " + this.Handle + " Visible: " + this.Visible);
            this.Shown += MainForm_Shown;
            this.VisibleChanged += (s, e) => Program.Log("Event: VisibleChanged, Visible: " + this.Visible);
            this.FormClosing += MainForm_FormClosing;
            this.FormClosed += (s, e) => Program.Log("Event: FormClosed, Reason: " + e.CloseReason);
            this.Disposed += (s, e) => Program.Log("Event: Disposed");

            Program.Log("MainForm constructor completed.");
        }

        private async void MainForm_Shown(object sender, EventArgs e)
        {
            Program.Log("MainForm_Shown entered. Handle: " + this.Handle + " Visible: " + this.Visible);
            try
            {
                this.WindowState = FormWindowState.Normal;
                this.ShowInTaskbar = true;
                this.TopMost = true;
                SwitchToThisWindow(this.Handle, true);
                SetForegroundWindow(this.Handle);
                this.BringToFront();
                this.Activate();
                this.TopMost = false;
                ApplyTheme(true);

                CoreWebView2Environment env = null;
                string[] candidateFolders = new string[] {
                    Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SubFlow", "WV2_Data"),
                    Path.Combine(Path.GetTempPath(), "SubFlow_WV2_" + Process.GetCurrentProcess().Id + "_" + Environment.TickCount),
                    null
                };

                foreach (string candidate in candidateFolders)
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(candidate) && !Directory.Exists(candidate))
                        {
                            Directory.CreateDirectory(candidate);
                        }
                        var envTask = CoreWebView2Environment.CreateAsync(null, candidate);
                        envTask.Wait(4000);
                        if (envTask.IsCompleted && !envTask.IsFaulted && envTask.Result != null)
                        {
                            env = envTask.Result;
                            Program.Log("WebView2 environment created with folder: " + (candidate ?? "SYSTEM_DEFAULT"));
                            break;
                        }
                    }
                    catch (Exception exCandidate)
                    {
                        Program.Log("WV2 candidate folder failed (" + candidate + "): " + exCandidate.Message);
                    }
                }

                if (env == null)
                {
                    Program.Log("All WebView2 candidate environments failed. Opening system browser.");
                    try { Process.Start("http://127.0.0.1:25588"); } catch { }
                    return;
                }

                await webView.EnsureCoreWebView2Async(env);
                Program.Log("WebView2 attached successfully.");

                if (webView.CoreWebView2 != null)
                {
                    webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
                    webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                    webView.CoreWebView2.Settings.AreDevToolsEnabled = true;

                    // 接收前端主题切换事件，实时联动 Win32 DWM 原生标题栏
                    webView.CoreWebView2.WebMessageReceived += (senderObj, args) => {
                        try
                        {
                            string msg = args.WebMessageAsJson;
                            if (msg != null && msg.Contains("setTheme"))
                            {
                                bool isDark = msg.Contains("\"isDark\":true");
                                this.BeginInvoke((MethodInvoker)delegate {
                                    ApplyTheme(isDark);
                                });
                            }
                        }
                        catch { }
                    };

                    webView.CoreWebView2.ProcessFailed += (s, args) => {
                        Program.Log("Event: CoreWebView2.ProcessFailed: " + args.ProcessFailedKind + " Reason: " + args.Reason);
                    };
                }

                string htmlPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web", "index.html");
                if (File.Exists(htmlPath))
                {
                    Program.Log("Navigating to: " + htmlPath);
                    webView.Source = new Uri(htmlPath);
                }
                else
                {
                    Program.Log("HTML not found: " + htmlPath);
                }
            }
            catch (Exception ex)
            {
                Program.Log("WebView2 Init Exception: " + ex.Message);
                // 彻底删掉任何弹出 MessageBox.Show 报错！静默唤醒系统浏览器保底！
                try
                {
                    Process.Start("http://127.0.0.1:25588");
                }
                catch { }
            }
        }

        public void RestoreMainWindow()
        {
            if (this.InvokeRequired)
            {
                this.BeginInvoke((MethodInvoker)RestoreMainWindow);
                return;
            }
            Program.Log("RestoreMainWindow invoked. Handle: " + this.Handle);
            try
            {
                this.Show();
                this.ShowInTaskbar = true;
                this.Visible = true;
                if (this.WindowState == FormWindowState.Minimized)
                {
                    this.WindowState = FormWindowState.Normal;
                }
                ShowWindow(this.Handle, 9); // SW_RESTORE
                SetWindowPos(this.Handle, (IntPtr)(-1), 0, 0, 0, 0, 0x0002 | 0x0001 | 0x0040); // HWND_TOPMOST
                SetWindowPos(this.Handle, (IntPtr)(-2), 0, 0, 0, 0, 0x0002 | 0x0001 | 0x0040); // HWND_NOTOPMOST
                SetForegroundWindow(this.Handle);
                SwitchToThisWindow(this.Handle, true);
                this.BringToFront();
                this.Activate();
                Program.Log("RestoreMainWindow finished successfully.");
            }
            catch (Exception ex)
            {
                Program.Log("RestoreMainWindow error: " + ex.Message);
            }
        }

        private void MainForm_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (isExplicitExit || e.CloseReason == CloseReason.WindowsShutDown || e.CloseReason == CloseReason.ApplicationExitCall)
            {
                ExitApp();
                return;
            }

            if (closeToTray)
            {
                e.Cancel = true;
                this.Hide();
                this.ShowInTaskbar = false;
                if (!hasShownTrayTip && trayIcon != null)
                {
                    try
                    {
                        trayIcon.ShowBalloonTip(2500, "SubFlow 2026", "已收起至系统托盘，本地 25588 网关持续运行中...\n可双击托盘图标重新唤起界面。", ToolTipIcon.Info);
                    }
                    catch { }
                    hasShownTrayTip = true;
                }
            }
            else
            {
                ExitApp();
            }
        }

        public void SetCloseToTray(bool enable)
        {
            closeToTray = enable;
            if (trayCloseToTrayItem != null)
            {
                trayCloseToTrayItem.Text = (closeToTray ? "✔️ " : "　 ") + "关闭窗口时最小化到托盘";
            }
            GatewayServer.CloseToTraySetting = closeToTray;
            GatewayServer.SaveConfig();
            try
            {
                if (webView != null && webView.CoreWebView2 != null)
                {
                    webView.CoreWebView2.PostWebMessageAsJson("{\"action\":\"syncCloseToTray\",\"value\":" + (closeToTray ? "true" : "false") + "}");
                }
            }
            catch { }
        }

        public void ExplicitExit()
        {
            isExplicitExit = true;
            ExitApp();
        }

        private void ExitApp()
        {
            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
                if (gateway != null)
                {
                    gateway.Stop();
                }
                GatewayServer.StopTunnel();

                uint browserPid = 0;
                try
                {
                    if (webView != null && webView.CoreWebView2 != null)
                    {
                        browserPid = webView.CoreWebView2.BrowserProcessId;
                    }
                }
                catch { }

                try
                {
                    if (webView != null)
                    {
                        webView.Dispose();
                    }
                }
                catch { }

                if (browserPid > 0)
                {
                    try
                    {
                        var psi = new ProcessStartInfo("taskkill", "/F /T /PID " + browserPid);
                        psi.CreateNoWindow = true;
                        psi.UseShellExecute = false;
                        Process.Start(psi);
                    }
                    catch { }
                }

                try
                {
                    foreach (string name in new string[] { "cloudflared" })
                    {
                        foreach (var p in Process.GetProcessesByName(name))
                        {
                            try { p.Kill(); } catch { }
                        }
                    }
                }
                catch { }
            }
            catch { }

            try { Process.GetCurrentProcess().Kill(); } catch { }
            Application.Exit();
            Environment.Exit(0);
        }
    }

    // =========================================================================
    // 内置纯 C# 高性能原生订阅网关 (Port 25588)
    // =========================================================================
    public class GatewayServer
    {
        private readonly int port;
        private HttpListener listener;
        private Thread listenThread;
        private bool isRunning;
        private static Dictionary<string, string> subscriptionAliases = new Dictionary<string, string>();
        private static string globalSecurityPin = "15456";
        public static bool CloseToTraySetting = true;
        private static string customTunnelToken = "";
        private static string customTunnelDomain = "";
        private static string cachedLanIp = "";
        private static string cachedClashYaml = "";
        private static string cachedMixedBase64 = "";
        private static DateTime lastCacheTime = DateTime.MinValue;
        private static string configFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "gateway_config.json");
        private static string clashCachePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "cache_clash.yaml");
        private static string mixedCachePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "cache_mixed.txt");
        private static readonly object cacheLock = new object();

        public static void LoadConfigAndCache()
        {
            try
            {
                if (File.Exists(configFilePath))
                {
                    string json = File.ReadAllText(configFilePath, Encoding.UTF8);
                    Match mPin = Regex.Match(json, @"""pin""\s*:\s*""([^""]*)""");
                    if (mPin.Success) globalSecurityPin = mPin.Groups[1].Value;

                    if (json.Contains("\"close_to_tray\":false"))
                    {
                        CloseToTraySetting = false;
                    }
                    else
                    {
                        CloseToTraySetting = true;
                    }

                    Match mToken = Regex.Match(json, @"""tunnel_token""\s*:\s*""([^""]*)""");
                    if (mToken.Success) customTunnelToken = mToken.Groups[1].Value;

                    Match mDomain = Regex.Match(json, @"""tunnel_domain""\s*:\s*""([^""]*)""");
                    if (mDomain.Success) customTunnelDomain = mDomain.Groups[1].Value;

                    Match mUrl = Regex.Match(json, @"""airport_url""\s*:\s*""([^""]*)""");
                    if (mUrl.Success)
                    {
                        string savedUrl = mUrl.Groups[1].Value;
                        if (!string.IsNullOrEmpty(savedUrl))
                        {
                            subscriptionAliases["auto"] = savedUrl;
                            subscriptionAliases["latest"] = savedUrl;
                        }
                    }
                }
                else
                {
                    globalSecurityPin = "";
                    CloseToTraySetting = true;
                    SaveConfig();
                }

                if (File.Exists(clashCachePath))
                {
                    cachedClashYaml = File.ReadAllText(clashCachePath, Encoding.UTF8);
                    lastCacheTime = File.GetLastWriteTime(clashCachePath);
                    Program.Log("Loaded Clash cache from disk, length: " + cachedClashYaml.Length);
                }
                if (File.Exists(mixedCachePath))
                {
                    cachedMixedBase64 = File.ReadAllText(mixedCachePath, Encoding.UTF8);
                }
            }
            catch (Exception ex)
            {
                Program.Log("LoadConfigAndCache error: " + ex.Message);
            }
        }

        public static void SaveConfig()
        {
            try
            {
                string airportUrl = subscriptionAliases.ContainsKey("auto") ? subscriptionAliases["auto"] : "";
                string json = "{\n  \"pin\": \"" + globalSecurityPin.Replace("\"", "\\\"") + "\",\n  \"airport_url\": \"" + airportUrl.Replace("\"", "\\\"") + "\",\n  \"close_to_tray\": " + (CloseToTraySetting ? "true" : "false") + ",\n  \"tunnel_token\": \"" + customTunnelToken.Replace("\"", "\\\"") + "\",\n  \"tunnel_domain\": \"" + customTunnelDomain.Replace("\"", "\\\"") + "\"\n}";
                File.WriteAllText(configFilePath, json, Encoding.UTF8);
            }
            catch { }
        }

        public static bool RefreshCache(string targetUrl)
        {
            if (string.IsNullOrEmpty(targetUrl)) return false;
            try
            {
                Program.Log("Refreshing cache for URL: " + targetUrl);
                string raw;
                if (targetUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || targetUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                {
                    raw = FetchHttp(targetUrl);
                }
                else
                {
                    raw = targetUrl;
                }

                List<NodeItem> nodes = ParseNodes(raw);
                if (nodes == null || nodes.Count == 0)
                {
                    Program.Log("ParseNodes returned 0 nodes!");
                    return false;
                }

                string yaml = GenerateClashYaml(nodes, false, false);
                List<string> shareLinks = new List<string>();
                foreach (var n in nodes)
                {
                    if (!string.IsNullOrEmpty(n.ShareLink)) shareLinks.Add(n.ShareLink);
                }
                string plain = string.Join("\n", shareLinks.ToArray());
                string b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(plain));

                lock (cacheLock)
                {
                    cachedClashYaml = yaml;
                    cachedMixedBase64 = b64;
                    lastCacheTime = DateTime.Now;
                    try { File.WriteAllText(clashCachePath, yaml, Encoding.UTF8); } catch { }
                    try { File.WriteAllText(mixedCachePath, b64, Encoding.UTF8); } catch { }
                }

                Program.Log("Cache refreshed successfully! Node count: " + nodes.Count);
                return true;
            }
            catch (Exception ex)
            {
                Program.Log("RefreshCache exception: " + ex.Message);
                return false;
            }
        }

        public static string GetLocalIPv4()
        {
            try
            {
                using (Socket socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0))
                {
                    socket.Connect("8.8.8.8", 65530);
                    IPEndPoint endPoint = socket.LocalEndPoint as IPEndPoint;
                    if (endPoint != null) return endPoint.Address.ToString();
                }
            }
            catch { }

            try
            {
                foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
                {
                    if (ni.OperationalStatus == OperationalStatus.Up &&
                        ni.NetworkInterfaceType != NetworkInterfaceType.Loopback)
                    {
                        foreach (var ip in ni.GetIPProperties().UnicastAddresses)
                        {
                            if (ip.Address.AddressFamily == AddressFamily.InterNetwork)
                            {
                                string s = ip.Address.ToString();
                                if (s.StartsWith("192.168.") || s.StartsWith("10.") || s.StartsWith("172."))
                                    return s;
                            }
                        }
                    }
                }
            }
            catch { }

            return "127.0.0.1";
        }

        private static System.Diagnostics.Process tunnelProcess = null;
        private static string currentTunnelUrl = "";

        public static string StartTunnel(int localPort)
        {
            if (tunnelProcess != null && !tunnelProcess.HasExited && !string.IsNullOrEmpty(currentTunnelUrl))
                return currentTunnelUrl;

            StopTunnel();

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string exePath = Path.Combine(baseDir, "bin", "cloudflared.exe");
            if (!File.Exists(exePath)) exePath = Path.Combine(baseDir, "cloudflared.exe");
            if (!File.Exists(exePath)) return "ERR: 未在 bin 目录找到 cloudflared.exe";

            try
            {
                string tunnelArgs;
                if (!string.IsNullOrEmpty(customTunnelToken))
                {
                    tunnelArgs = string.Format("tunnel --protocol http2 run --token {0}", customTunnelToken);
                    if (!string.IsNullOrEmpty(customTunnelDomain))
                    {
                        string dom = customTunnelDomain.Trim();
                        if (!dom.StartsWith("http://") && !dom.StartsWith("https://")) dom = "https://" + dom;
                        currentTunnelUrl = dom.TrimEnd('/');
                    }
                }
                else
                {
                    tunnelArgs = string.Format("tunnel --protocol http2 --url http://127.0.0.1:{0}", localPort);
                }

                System.Diagnostics.ProcessStartInfo psi = new System.Diagnostics.ProcessStartInfo
                {
                    FileName = exePath,
                    Arguments = tunnelArgs,
                    UseShellExecute = false,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                tunnelProcess = new System.Diagnostics.Process { StartInfo = psi, EnableRaisingEvents = true };
                if (string.IsNullOrEmpty(customTunnelToken)) currentTunnelUrl = "";

                tunnelProcess.ErrorDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        Match m = Regex.Match(e.Data, @"(https://[a-zA-Z0-9-]+\.trycloudflare\.com)");
                        if (m.Success)
                        {
                            currentTunnelUrl = m.Groups[1].Value;
                            Program.Log("Cloudflare Tunnel URL captured: " + currentTunnelUrl);
                        }
                    }
                };

                tunnelProcess.Start();
                tunnelProcess.BeginErrorReadLine();

                for (int i = 0; i < 40; i++)
                {
                    Thread.Sleep(500);
                    if (!string.IsNullOrEmpty(currentTunnelUrl)) return currentTunnelUrl;
                    if (tunnelProcess.HasExited) break;
                }

                return string.IsNullOrEmpty(currentTunnelUrl) ? "ERR: 建立 Cloudflare 隧道超时" : currentTunnelUrl;
            }
            catch (Exception ex)
            {
                return "ERR: " + ex.Message;
            }
        }

        public static void StopTunnel()
        {
            try
            {
                currentTunnelUrl = "";
                if (tunnelProcess != null)
                {
                    if (!tunnelProcess.HasExited) tunnelProcess.Kill();
                    tunnelProcess.Dispose();
                }
                tunnelProcess = null;
                Program.Log("Cloudflare Tunnel stopped cleanly.");
            }
            catch { }
        }

        public GatewayServer(int port)
        {
            this.port = port;
            cachedLanIp = GetLocalIPv4();
        }

        public void Start()
        {
            try
            {
                LoadConfigAndCache();

                listener = new HttpListener();
                listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", port));
                listener.Prefixes.Add(string.Format("http://localhost:{0}/", port));
                try
                {
                    listener.Prefixes.Add(string.Format("http://+:{0}/", port));
                }
                catch (Exception ex)
                {
                    Program.Log("Wildcard + prefix fallback: " + ex.Message);
                    try
                    {
                        if (!string.IsNullOrEmpty(cachedLanIp) && cachedLanIp != "127.0.0.1")
                        {
                            listener.Prefixes.Add(string.Format("http://{0}:{1}/", cachedLanIp, port));
                        }
                    }
                    catch { }
                }

                listener.Start();
                isRunning = true;

                listenThread = new Thread(ListenLoop);
                listenThread.IsBackground = true;
                listenThread.Start();
                Program.Log("GatewayServer started on port " + port + ", LAN IP: " + cachedLanIp);

                // 若本地已有配置订阅且缓存尚不存在，后台异步预热生成一次
                if (string.IsNullOrEmpty(cachedClashYaml) && subscriptionAliases.ContainsKey("auto") && !string.IsNullOrEmpty(subscriptionAliases["auto"]))
                {
                    string target = subscriptionAliases["auto"];
                    ThreadPool.QueueUserWorkItem((s) => RefreshCache(target));
                }
            }
            catch (Exception ex)
            {
                Program.Log("GatewayServer start exception: " + ex.Message);
            }
        }

        public void Stop()
        {
            isRunning = false;
            try
            {
                if (listener != null && listener.IsListening)
                {
                    listener.Stop();
                    listener.Close();
                }
            }
            catch { }
        }

        private void ListenLoop()
        {
            while (isRunning)
            {
                try
                {
                    HttpListenerContext context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((state) => HandleRequest(context));
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private void HandleRequest(HttpListenerContext ctx)
        {
            HttpListenerRequest req = ctx.Request;
            HttpListenerResponse res = ctx.Response;

            try
            {
                res.Headers.Add("Access-Control-Allow-Origin", "*");
                res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
                res.Headers.Add("Access-Control-Allow-Headers", "*");

                if (req.HttpMethod == "OPTIONS")
                {
                    res.StatusCode = 200;
                    res.Close();
                    return;
                }

                string path = req.Url.AbsolutePath.ToLowerInvariant();

                if (path == "/sub" || path == "/api/auto-sub")
                {
                    // 🛡️ 安全防盗防扫描：PIN 密钥验证 (仅对公网/局域网远程访问生效，本机 127.0.0.1 预览与客户端请求永久免密直通)
                    bool isLocalLoopback = req.IsLocal || (req.RemoteEndPoint != null && IPAddress.IsLoopback(req.RemoteEndPoint.Address));
                    string reqPin = req.QueryString["pin"] ?? req.Headers["X-Sub-Pin"];
                    if (!isLocalLoopback && !string.IsNullOrEmpty(globalSecurityPin))
                    {
                        if (string.IsNullOrEmpty(reqPin) || reqPin != globalSecurityPin)
                        {
                            SendText(res, "403 Forbidden: 安全访问密钥错误 (Invalid PIN). 请在订阅 URL 结尾携带 &pin=你的提取码", 403);
                            return;
                        }
                    }

                    string id = req.QueryString["id"] ?? "auto";
                    string url = req.QueryString["url"];
                    string target = req.QueryString["target"] ?? "auto";
                    bool acl = (req.QueryString["acl"] == "true");

                    // 👑 万能自适应调度引擎 (User-Agent Dynamic Dispatch)
                    // 一条链接走天下：根据客户端特征毫秒级自动切换 Clash / v2rayN / 小火箭 / Sing-box
                    string ua = (req.UserAgent ?? "").ToLowerInvariant();
                    if (target == "auto" || path == "/api/auto-sub" || string.IsNullOrEmpty(target))
                    {
                        if (ua.Contains("v2ray") || ua.Contains("xray") || ua.Contains("shadowrocket") || ua.Contains("nekobox") || ua.Contains("passwall"))
                        {
                            target = "mixed"; // v2rayN / v2rayNG / 小火箭 / PassWall ➔ 输出标准 Base64 纯节点
                        }
                        else if (ua.Contains("sing-box") || ua.Contains("singbox"))
                        {
                            target = "singbox"; // Sing-box 纯 JSON
                        }
                        else
                        {
                            target = "clash"; // Clash / Flclash / Clash Verge / Stash / 浏览器 ➔ 输出纯节点 YAML
                        }
                    }

                    // ⚡ 核心提速 100 倍：本地热缓存毫秒级极速响应 (Instant Cache Delivery)
                    // 如果请求的是 auto 默认订阅且本地已有缓存，0 毫秒立即返回！绝不让客户端超时！
                    if (string.IsNullOrEmpty(url) && (id == "auto" || id == "latest"))
                    {
                        lock (cacheLock)
                        {
                            if ((target == "clash" || target == "clash-provider") && !string.IsNullOrEmpty(cachedClashYaml))
                            {
                                res.ContentType = "text/yaml; charset=utf-8";
                                res.Headers.Add("Subscription-Userinfo", "upload=0; download=0; total=107374182400; expire=1800000000");
                                res.Headers.Add("profile-update-interval", "24");
                                byte[] data = Encoding.UTF8.GetBytes(cachedClashYaml);
                                res.ContentLength64 = data.Length;
                                res.OutputStream.Write(data, 0, data.Length);
                                res.Close();

                                // 若缓存超过 5 分钟，后台异步静默刷新一次，保持节点最新
                                if ((DateTime.Now - lastCacheTime).TotalMinutes > 5)
                                {
                                    string airportSrc = subscriptionAliases.ContainsKey("auto") ? subscriptionAliases["auto"] : null;
                                    if (!string.IsNullOrEmpty(airportSrc))
                                    {
                                        ThreadPool.QueueUserWorkItem((state) => RefreshCache(airportSrc));
                                    }
                                }
                                return;
                            }
                            else if (target == "mixed" && !string.IsNullOrEmpty(cachedMixedBase64))
                            {
                                res.ContentType = "text/plain; charset=utf-8";
                                res.Headers.Add("Subscription-Userinfo", "upload=0; download=0; total=107374182400; expire=1800000000");
                                byte[] data = Encoding.UTF8.GetBytes(cachedMixedBase64);
                                res.ContentLength64 = data.Length;
                                res.OutputStream.Write(data, 0, data.Length);
                                res.Close();
                                return;
                            }
                        }
                    }

                    // 🔒 订阅短链别名（Token 彻底脱敏，绝不向公网暴露机场真实 Token）
                    if (string.IsNullOrEmpty(url))
                    {
                        lock (subscriptionAliases)
                        {
                            if (subscriptionAliases.ContainsKey(id))
                            {
                                url = subscriptionAliases[id];
                            }
                            else if (subscriptionAliases.ContainsKey("auto"))
                            {
                                url = subscriptionAliases["auto"];
                            }
                        }
                    }

                    if (string.IsNullOrEmpty(url))
                    {
                        byte[] errBytes = Encoding.UTF8.GetBytes("Error: No subscription URL provided. Please configure your subscription in the SubFlow web dashboard.");
                        res.StatusCode = 400;
                        res.ContentType = "text/plain; charset=utf-8";
                        res.OutputStream.Write(errBytes, 0, errBytes.Length);
                        res.Close();
                        return;
                    }

                    // 自动沉淀为当前活跃短链，供多端一键提取
                    lock (subscriptionAliases)
                    {
                        subscriptionAliases["auto"] = url;
                        subscriptionAliases["latest"] = url;
                        if (!string.IsNullOrEmpty(id)) subscriptionAliases[id] = url;
                    }

                    // 👑 1. 拆分与多源智能聚合 (支持管道符 | 与 #机场别名)
                    string[] urlSegments = url.Split(new char[] { '|' }, StringSplitOptions.RemoveEmptyEntries);
                    List<NodeItem> nodes = new List<NodeItem>();
                    Dictionary<string, List<string>> tagGroupMap = new Dictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

                    long aggUpload = 0;
                    long aggDownload = 0;
                    long aggTotal = 0;
                    long aggExpire = 0;

                    foreach (string segment in urlSegments)
                    {
                        string trimmedSeg = segment.Trim();
                        if (string.IsNullOrEmpty(trimmedSeg)) continue;

                        string fetchTarget = trimmedSeg;
                        string sourceTag = "";
                        int hashIdx = trimmedSeg.LastIndexOf('#');
                        if (hashIdx >= 0)
                        {
                            fetchTarget = trimmedSeg.Substring(0, hashIdx).Trim();
                            sourceTag = Uri.UnescapeDataString(trimmedSeg.Substring(hashIdx + 1)).Trim();
                        }

                        string segRaw = "";
                        if (fetchTarget.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || fetchTarget.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                        {
                            try
                            {
                                string segUserInfo;
                                segRaw = FetchHttp(fetchTarget, out segUserInfo);
                                ParseUserInfo(segUserInfo, ref aggUpload, ref aggDownload, ref aggTotal, ref aggExpire);
                            }
                            catch (Exception ex)
                            {
                                Program.Log("拉取子源失败 [" + sourceTag + "]: " + ex.Message);
                                continue;
                            }
                        }
                        else
                        {
                            segRaw = fetchTarget;
                        }

                        List<NodeItem> segNodes = ParseNodes(segRaw);
                        foreach (var n in segNodes)
                        {
                            if (!string.IsNullOrEmpty(sourceTag))
                            {
                                string originalName = n.Name;
                                n.Name = "[" + sourceTag + "] " + originalName;
                                if (!string.IsNullOrEmpty(n.RawYamlLine))
                                {
                                    if (Regex.IsMatch(n.RawYamlLine, @"name:\s*['""][^'""]+['""]"))
                                    {
                                        n.RawYamlLine = Regex.Replace(n.RawYamlLine, @"name:\s*['""][^'""]+['""]", "name: \"" + n.Name.Replace("\"", "\\\"") + "\"");
                                    }
                                    else
                                    {
                                        n.RawYamlLine = Regex.Replace(n.RawYamlLine, @"name:\s*([^,}]+)", "name: \"" + n.Name.Replace("\"", "\\\"") + "\"");
                                    }
                                }
                                if (!string.IsNullOrEmpty(n.ShareLink))
                                {
                                    int sHash = n.ShareLink.IndexOf('#');
                                    if (sHash >= 0)
                                    {
                                        n.ShareLink = n.ShareLink.Substring(0, sHash + 1) + Uri.EscapeDataString(n.Name);
                                    }
                                }
                                if (!tagGroupMap.ContainsKey(sourceTag))
                                {
                                    tagGroupMap[sourceTag] = new List<string>();
                                }
                                tagGroupMap[sourceTag].Add(n.Name);
                            }
                            nodes.Add(n);
                        }
                    }

                    // 👑 2. 节点重名碰撞消除 (防同名节点导致客户端解析崩溃)
                    Dictionary<string, int> nodeNameCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
                    foreach (var n in nodes)
                    {
                        if (nodeNameCounts.ContainsKey(n.Name))
                        {
                            nodeNameCounts[n.Name]++;
                            string uniqueName = n.Name + " (" + nodeNameCounts[n.Name] + ")";
                            if (!string.IsNullOrEmpty(n.RawYamlLine))
                            {
                                if (Regex.IsMatch(n.RawYamlLine, @"name:\s*['""][^'""]+['""]"))
                                {
                                    n.RawYamlLine = Regex.Replace(n.RawYamlLine, @"name:\s*['""][^'""]+['""]", "name: \"" + uniqueName.Replace("\"", "\\\"") + "\"");
                                }
                                else
                                {
                                    n.RawYamlLine = Regex.Replace(n.RawYamlLine, @"name:\s*([^,}]+)", "name: \"" + uniqueName.Replace("\"", "\\\"") + "\"");
                                }
                            }
                            if (!string.IsNullOrEmpty(n.ShareLink))
                            {
                                int sHash = n.ShareLink.IndexOf('#');
                                if (sHash >= 0)
                                {
                                    n.ShareLink = n.ShareLink.Substring(0, sHash + 1) + Uri.EscapeDataString(uniqueName);
                                }
                            }
                            n.Name = uniqueName;
                        }
                        else
                        {
                            nodeNameCounts[n.Name] = 1;
                        }
                    }

                    string userinfoHeader = string.Format("upload={0}; download={1}; total={2}; expire={3}",
                        aggUpload,
                        aggDownload,
                        aggTotal > 0 ? aggTotal : 107374182400L,
                        aggExpire > 0 ? aggExpire : 1800000000L);

                    if (target == "clash" || target == "clash-provider")
                    {
                        string yaml = GenerateClashYaml(nodes, target == "clash-provider", acl, tagGroupMap);
                        lock (cacheLock)
                        {
                            cachedClashYaml = yaml;
                            lastCacheTime = DateTime.Now;
                            try { File.WriteAllText(clashCachePath, yaml, Encoding.UTF8); } catch { }
                        }
                        res.ContentType = "text/yaml; charset=utf-8";
                        res.Headers.Add("Subscription-Userinfo", userinfoHeader);
                        res.Headers.Add("profile-update-interval", "24");
                        byte[] data = Encoding.UTF8.GetBytes(yaml);
                        res.ContentLength64 = data.Length;
                        res.OutputStream.Write(data, 0, data.Length);
                        res.Close();
                        return;
                    }
                    else
                    {
                        List<string> shareLinks = new List<string>();
                        foreach (var n in nodes)
                        {
                            if (!string.IsNullOrEmpty(n.ShareLink)) shareLinks.Add(n.ShareLink);
                        }
                        string plain = string.Join("\n", shareLinks.ToArray());
                        string b64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(plain));
                        lock (cacheLock)
                        {
                            cachedMixedBase64 = b64;
                            try { File.WriteAllText(mixedCachePath, b64, Encoding.UTF8); } catch { }
                        }

                        res.ContentType = "text/plain; charset=utf-8";
                        res.Headers.Add("Subscription-Userinfo", userinfoHeader);
                        byte[] data = Encoding.UTF8.GetBytes(b64);
                        res.ContentLength64 = data.Length;
                        res.OutputStream.Write(data, 0, data.Length);
                        res.Close();
                        return;
                    }
                }
                else if (path == "/api/import-flclash")
                {
                    string subUrl = req.QueryString["url"];
                    if (string.IsNullOrEmpty(subUrl))
                    {
                        subUrl = "http://127.0.0.1:" + port + "/sub?target=clash&id=auto";
                    }
                    string uri = string.Format("clash://install-config?url={0}&name={1}", Uri.EscapeDataString(subUrl), Uri.EscapeDataString("SubFlow"));
                    try
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = uri,
                            UseShellExecute = true
                        });
                        SendJson(res, "{\"ok\":true}");
                    }
                    catch (Exception ex)
                    {
                        SendJson(res, "{\"ok\":false,\"error\":\"" + ex.Message.Replace("\"", "\\\"") + "\"}");
                    }
                }
                else if (path == "/api/restore-window")
                {
                    if (MainForm.Instance != null)
                    {
                        MainForm.Instance.BeginInvoke((MethodInvoker)delegate {
                            MainForm.Instance.RestoreMainWindow();
                        });
                    }
                    SendJson(res, "{\"ok\":true,\"message\":\"Window restored\"}");
                }
                else if (path == "/api/exit")
                {
                    SendJson(res, "{\"ok\":true,\"message\":\"Exiting completely\"}");
                    ThreadPool.QueueUserWorkItem((s) => {
                        Thread.Sleep(200);
                        if (MainForm.Instance != null)
                        {
                            MainForm.Instance.BeginInvoke((MethodInvoker)delegate {
                                MainForm.Instance.ExplicitExit();
                            });
                        }
                        else
                        {
                            try { Process.GetCurrentProcess().Kill(); } catch { }
                            Environment.Exit(0);
                        }
                    });
                    return;
                }
                else if (path == "/api/settings")
                {
                    string closeToTrayParam = req.QueryString["closeToTray"];
                    if (!string.IsNullOrEmpty(closeToTrayParam))
                    {
                        bool enable = (closeToTrayParam == "true");
                        if (MainForm.Instance != null)
                        {
                            MainForm.Instance.BeginInvoke((MethodInvoker)delegate {
                                MainForm.Instance.SetCloseToTray(enable);
                            });
                        }
                        else
                        {
                            CloseToTraySetting = enable;
                            SaveConfig();
                        }
                    }
                    SendJson(res, "{\"ok\":true,\"closeToTray\":" + (CloseToTraySetting ? "true" : "false") + ",\"port\":" + port + ",\"pin\":\"" + globalSecurityPin + "\"}");
                }
                else if (path == "/api/lan-info")
                {
                    string lanIp = string.IsNullOrEmpty(cachedLanIp) ? GetLocalIPv4() : cachedLanIp;
                    SendJson(res, "{\"ok\":true,\"lan_ip\":\"" + lanIp + "\",\"port\":" + port + ",\"pin\":\"" + globalSecurityPin + "\"}");
                }
                else if (path == "/api/set-pin")
                {
                    string newPin = req.QueryString["pin"] ?? "";
                    globalSecurityPin = newPin.Trim();
                    SaveConfig();
                    SendJson(res, "{\"ok\":true,\"pin\":\"" + globalSecurityPin + "\"}");
                }
                else if (path == "/api/save-alias")
                {
                    string aliasId = req.QueryString["id"] ?? "auto";
                    string targetUrl = req.QueryString["url"];
                    if (!string.IsNullOrEmpty(targetUrl))
                    {
                        lock (subscriptionAliases)
                        {
                            subscriptionAliases[aliasId] = targetUrl;
                            if (aliasId == "auto") subscriptionAliases["latest"] = targetUrl;
                        }
                        SaveConfig();
                        ThreadPool.QueueUserWorkItem((s) => RefreshCache(targetUrl));
                    }
                    SendJson(res, "{\"ok\":true,\"id\":\"" + aliasId + "\"}");
                }
                else if (path == "/api/tunnel/start")
                {
                    string url = StartTunnel(port);
                    if (url.StartsWith("ERR:"))
                    {
                        SendJson(res, "{\"ok\":false,\"message\":\"" + url.Replace("\"", "\\\"") + "\"}");
                    }
                    else
                    {
                        SendJson(res, "{\"ok\":true,\"url\":\"" + url + "\"}");
                    }
                }
                else if (path == "/api/tunnel/stop")
                {
                    StopTunnel();
                    SendJson(res, "{\"ok\":true}");
                }
                else if (path == "/api/tunnel/status")
                {
                    bool running = (tunnelProcess != null && !tunnelProcess.HasExited);
                    SendJson(res, "{\"ok\":true,\"running\":" + (running ? "true" : "false") + ",\"url\":\"" + currentTunnelUrl + "\"}");
                }
                else if (path == "/api/emergency-kill" || path == "/api/revoke-sub")
                {
                    // 🚨 紧急一键作废与熔断机制：
                    // 1. 立即彻底终止 Cloudflare 公网隧道，全球公网域名瞬间注销
                    StopTunnel();

                    // 2. 重新随机生成全新的 6 位安全 PIN 防盗码，所有旧泄露链接瞬间 403 报废
                    Random rnd = new Random();
                    globalSecurityPin = rnd.Next(100000, 999999).ToString();
                    SaveConfig();

                    // 3. 立即清空内存与磁盘热缓存，彻底断开与旧请求的关联
                    lock (cacheLock)
                    {
                        cachedClashYaml = "";
                        cachedMixedBase64 = "";
                    }
                    try { if (File.Exists(clashCachePath)) File.Delete(clashCachePath); } catch { }
                    try { if (File.Exists(mixedCachePath)) File.Delete(mixedCachePath); } catch { }

                    Program.Log("Emergency kill executed. New PIN generated: " + globalSecurityPin);
                    SendJson(res, "{\"ok\":true,\"new_pin\":\"" + globalSecurityPin + "\",\"message\":\"已紧急吊销！所有旧链接已瞬间报废！\"}");
                }
                else if (path == "/api/set-custom-tunnel")
                {
                    customTunnelToken = (req.QueryString["token"] ?? "").Trim();
                    customTunnelDomain = (req.QueryString["domain"] ?? "").Trim();
                    SaveConfig();
                    SendJson(res, "{\"ok\":true,\"token\":\"" + customTunnelToken.Replace("\"", "\\\"") + "\",\"domain\":\"" + customTunnelDomain.Replace("\"", "\\\"") + "\"}");
                }
                else if (path == "/api/status")
                {
                    string lanIp = string.IsNullOrEmpty(cachedLanIp) ? GetLocalIPv4() : cachedLanIp;
                    bool tunnelRunning = (tunnelProcess != null && !tunnelProcess.HasExited);
                    SendJson(res, "{\"ok\":true,\"version\":\"1.0\",\"lan_ip\":\"" + lanIp + "\",\"pin\":\"" + globalSecurityPin + "\",\"tunnel_url\":\"" + currentTunnelUrl + "\",\"tunnel_running\":" + (tunnelRunning ? "true" : "false") + ",\"custom_token\":\"" + customTunnelToken.Replace("\"", "\\\"") + "\",\"custom_domain\":\"" + customTunnelDomain.Replace("\"", "\\\"") + "\"}");
                }
                else if (path == "/api/bring-to-front")
                {
                    if (MainForm.Instance != null)
                    {
                        MainForm.Instance.RestoreMainWindow();
                        SendJson(res, "{\"ok\":true}");
                    }
                    else
                    {
                        SendJson(res, "{\"ok\":false}");
                    }
                }
                else
                {
                    // 👑 若请求根路径 / 或 /web/*，自动托管返回本地最新 web/index.html 与静态资源
                    string webDir = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "web");
                    string reqFile = path.TrimStart('/');
                    if (string.IsNullOrEmpty(reqFile) || reqFile == "index.html") reqFile = "index.html";
                    else if (reqFile.StartsWith("web/")) reqFile = reqFile.Substring(4);

                    string filePath = Path.Combine(webDir, reqFile);
                    if (File.Exists(filePath))
                    {
                        string ext = Path.GetExtension(filePath).ToLower();
                        string cType = "text/html; charset=utf-8";
                        if (ext == ".js") cType = "application/javascript; charset=utf-8";
                        else if (ext == ".css") cType = "text/css; charset=utf-8";
                        else if (ext == ".json") cType = "application/json; charset=utf-8";
                        else if (ext == ".png") cType = "image/png";
                        else if (ext == ".ico") cType = "image/x-icon";

                        byte[] fileBytes = File.ReadAllBytes(filePath);
                        res.StatusCode = 200;
                        res.ContentType = cType;
                        res.ContentLength64 = fileBytes.Length;
                        res.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                        res.Close();
                        return;
                    }

                    SendText(res, "SubFlow Gateway Ready", 200);
                }
            }
            catch (Exception ex)
            {
                try { SendText(res, "网关转换错误: " + ex.Message, 500); } catch { }
            }
            finally
            {
                try { res.Close(); } catch { }
            }
        }

        private void SendText(HttpListenerResponse res, string text, int code = 200)
        {
            res.StatusCode = code;
            res.ContentType = "text/plain; charset=utf-8";
            byte[] b = Encoding.UTF8.GetBytes(text);
            res.ContentLength64 = b.Length;
            res.OutputStream.Write(b, 0, b.Length);
            res.Close();
        }

        private void SendJson(HttpListenerResponse res, string json, int code = 200)
        {
            res.StatusCode = code;
            res.ContentType = "application/json; charset=utf-8";
            byte[] b = Encoding.UTF8.GetBytes(json);
            res.ContentLength64 = b.Length;
            res.OutputStream.Write(b, 0, b.Length);
            res.Close();
        }

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        public string SyncToV2RayN(string customUrl)
        {
            try
            {
                var procs = System.Diagnostics.Process.GetProcessesByName("v2rayN");
                if (procs.Length > 0 && procs[0].MainWindowHandle != IntPtr.Zero)
                {
                    SetForegroundWindow(procs[0].MainWindowHandle);
                    return "已将专属订阅复制到剪贴板，并已将 v2rayN 呼出至前台！在 v2rayN 界面直接按下【Ctrl+V】即可瞬间批量导入节点！";
                }
                return "已将专属订阅复制到剪贴板！请打开 v2rayN 界面按下【Ctrl+V】即可瞬间批量导入节点！";
            }
            catch (Exception ex)
            {
                return "已复制到剪贴板，请在 v2rayN 界面按【Ctrl+V】导入。(" + ex.Message + ")";
            }
        }

        private static string FetchHttp(string url)
        {
            string u;
            return FetchHttp(url, out u);
        }

        private static string FetchHttp(string url, out string userInfo)
        {
            userInfo = null;
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072 | (SecurityProtocolType)768 | SecurityProtocolType.Tls | (SecurityProtocolType)12288;
            ServicePointManager.ServerCertificateValidationCallback = delegate { return true; };

            bool isLoopback = url.IndexOf("127.0.0.1", StringComparison.OrdinalIgnoreCase) >= 0 || url.IndexOf("localhost", StringComparison.OrdinalIgnoreCase) >= 0;
            string[] proxyList = isLoopback
                ? new string[] { null }
                : new string[] {
                    "http://127.0.0.1:10808",  // v2rayN 默认 HTTP 端口 (用户主力客户端极速通道)
                    "http://127.0.0.1:7890",   // Clash / Flclash / Meta 默认端口
                    "http://127.0.0.1:7897",   // Clash Verge Rev 常用新端口
                    null                       // 直连兜底
                };

            foreach (var pUri in proxyList)
            {
                try
                {
                    HttpWebRequest req = (HttpWebRequest)WebRequest.Create(url);
                    req.UserAgent = "clash.meta";
                    req.Timeout = 4000;
                    if (pUri != null)
                    {
                        req.Proxy = new WebProxy(pUri);
                    }
                    else
                    {
                        req.Proxy = null;
                    }
                    req.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

                    using (HttpWebResponse resp = (HttpWebResponse)req.GetResponse())
                    {
                        userInfo = resp.Headers["Subscription-Userinfo"];
                        using (StreamReader sr = new StreamReader(resp.GetResponseStream(), Encoding.UTF8))
                        {
                            string s = sr.ReadToEnd();
                            if (!string.IsNullOrEmpty(s) && s.Trim().Length > 5)
                            {
                                return s;
                            }
                        }
                    }
                }
                catch { }
            }
            throw new Exception("拉取订阅源失败，请检查网络或机场连接");
        }

        private static void ParseUserInfo(string uInfo, ref long upload, ref long download, ref long total, ref long expire)
        {
            if (string.IsNullOrEmpty(uInfo)) return;
            Match mUp = Regex.Match(uInfo, @"upload=([0-9]+)");
            Match mDown = Regex.Match(uInfo, @"download=([0-9]+)");
            Match mTot = Regex.Match(uInfo, @"total=([0-9]+)");
            Match mExp = Regex.Match(uInfo, @"expire=([0-9]+)");

            if (mUp.Success) { long v; if (long.TryParse(mUp.Groups[1].Value, out v)) upload += v; }
            if (mDown.Success) { long v; if (long.TryParse(mDown.Groups[1].Value, out v)) download += v; }
            if (mTot.Success) { long v; if (long.TryParse(mTot.Groups[1].Value, out v)) total += v; }
            if (mExp.Success)
            {
                long v;
                if (long.TryParse(mExp.Groups[1].Value, out v) && v > 0)
                {
                    if (expire == 0 || v < expire) expire = v; // 采用最早到期时间作为总到期预警
                }
            }
        }

        private class NodeItem
        {
            public string Name;
            public string RawYamlLine;
            public string ShareLink;
        }

        private static List<NodeItem> ParseNodes(string raw)
        {
            List<NodeItem> list = new List<NodeItem>();
            if (raw.Contains("proxies:") || raw.Contains("proxy-groups:"))
            {
                MatchCollection matches = Regex.Matches(raw, @"-\s*\{[^\n]+\}");
                foreach (Match m in matches)
                {
                    string line = m.Value;
                    if (line.Contains("剩余流量") || line.Contains("套餐到期") || line.Contains("官网") || line.Contains("通知"))
                    {
                        continue;
                    }

                    string name = GetRegexVal(line, @"name:\s*['""]([^'""]+)['""]") ?? GetRegexVal(line, @"name:\s*([^,}]+)");
                    string server = GetRegexVal(line, @"server:\s*([^\s,}]+)");
                    string port = GetRegexVal(line, @"port:\s*([0-9]+)");
                    string pass = GetRegexVal(line, @"password:\s*([^\s,}]+)");
                    string sni = GetRegexVal(line, @"sni:\s*([^\s,}]+)");
                    string serverIp = server; // 原生直接复用域名，消除耗时 DNS 串行解析阻塞

                    NodeItem item = new NodeItem();
                    item.Name = name != null ? name.Trim() : "Node";
                    item.RawYamlLine = line;

                    // 👑 万能多协议转 v2rayN / 小火箭标准分享链接
                    if (line.Contains("type: vless") && !string.IsNullOrEmpty(serverIp) && !string.IsNullOrEmpty(port))
                    {
                        string uuid = GetRegexVal(line, @"uuid:\s*([^\s,}]+)");
                        string net = GetRegexVal(line, @"network:\s*([^\s,}]+)") ?? "ws";
                        string sec = line.Contains("tls: true") ? "tls" : "none";
                        string serverName = GetRegexVal(line, @"servername:\s*([^\s,}]+)") ?? sni;
                        string host = GetRegexVal(line, @"Host:\s*([^\s,}]+)") ?? serverName;
                        string path = GetRegexVal(line, @"path:\s*([^\s,}]+)") ?? "/";
                        string fp = GetRegexVal(line, @"client-fingerprint:\s*([^\s,}]+)") ?? "chrome";
                        item.ShareLink = string.Format("vless://{0}@{1}:{2}?type={3}&security={4}&path={5}&host={6}&sni={7}&fp={8}#{9}",
                            uuid, serverIp, port, net, sec, Uri.EscapeDataString(path), host, serverName, fp, Uri.EscapeDataString(item.Name));
                    }
                    else if (line.Contains("type: trojan") && !string.IsNullOrEmpty(serverIp) && !string.IsNullOrEmpty(port))
                    {
                        item.ShareLink = string.Format("trojan://{0}@{1}:{2}?security=tls&sni={3}#{4}",
                            pass, serverIp, port, sni, Uri.EscapeDataString(item.Name));
                    }
                    else if (line.Contains("type: hysteria2") && !string.IsNullOrEmpty(serverIp) && !string.IsNullOrEmpty(port))
                    {
                        item.ShareLink = string.Format("hysteria2://{0}@{1}:{2}/?sni={3}#{4}",
                            pass, serverIp, port, sni, Uri.EscapeDataString(item.Name));
                    }
                    else if (line.Contains("type: anytls") && !string.IsNullOrEmpty(serverIp) && !string.IsNullOrEmpty(port))
                    {
                        string fp = GetRegexVal(line, @"client-fingerprint:\s*([^\s,}]+)") ?? "chrome";
                        item.ShareLink = string.Format("anytls://{0}@{1}:{2}?type=tcp&fp={3}&security=tls&sni={4}&alpn=h2,http/1.1&allowInsecure=1&insecure=1&udp=1&tfo=0#{5}",
                            pass, serverIp, port, fp, sni, Uri.EscapeDataString(item.Name));
                    }
                    else if (line.Contains("type: ss") && !string.IsNullOrEmpty(serverIp) && !string.IsNullOrEmpty(port))
                    {
                        string cipher = GetRegexVal(line, @"cipher:\s*([^\s,}]+)") ?? "aes-256-gcm";
                        string auth = Convert.ToBase64String(Encoding.UTF8.GetBytes(cipher + ":" + pass));
                        item.ShareLink = string.Format("ss://{0}@{1}:{2}#{3}",
                            auth, serverIp, port, Uri.EscapeDataString(item.Name));
                    }
                    list.Add(item);
                }
            }
            return list;
        }

        private static string GenerateClashYaml(List<NodeItem> nodes, bool isProviderOnly, bool enableAcl, Dictionary<string, List<string>> tagGroupMap = null)
        {
            StringBuilder sb = new StringBuilder();

            if (isProviderOnly)
            {
                sb.AppendLine("proxies:");
                foreach (var n in nodes) sb.AppendLine("  " + n.RawYamlLine);
                return sb.ToString();
            }

            sb.AppendLine("port: 7890");
            sb.AppendLine("socks-port: 7891");
            sb.AppendLine("allow-lan: true");
            sb.AppendLine("mode: rule");
            sb.AppendLine("log-level: info");
            sb.AppendLine("external-controller: 127.0.0.1:9090");
            sb.AppendLine();

            sb.AppendLine("proxies:");
            List<string> nodeNames = new List<string>();
            foreach (var n in nodes)
            {
                sb.AppendLine("  " + n.RawYamlLine);
                nodeNames.Add(n.Name);
            }
            sb.AppendLine();

            sb.AppendLine("proxy-groups:");
            sb.AppendLine("  - name: 🚀 节点选择");
            sb.AppendLine("    type: select");
            sb.AppendLine("    proxies:");
            foreach (var name in nodeNames)
            {
                sb.AppendLine(string.Format("      - \"{0}\"", name.Replace("\"", "\\\"")));
            }
            sb.AppendLine("      - DIRECT");
            sb.AppendLine();

            sb.AppendLine("  - name: ⚡ 自动优选");
            sb.AppendLine("    type: url-test");
            sb.AppendLine("    url: http://www.gstatic.com/generate_204");
            sb.AppendLine("    interval: 300");
            sb.AppendLine("    proxies:");
            foreach (var name in nodeNames)
            {
                sb.AppendLine(string.Format("      - \"{0}\"", name.Replace("\"", "\\\"")));
            }
            sb.AppendLine();

            // 👑 多机场专属分组策略（如果用户合并了多个机场）
            if (tagGroupMap != null && tagGroupMap.Count > 1)
            {
                foreach (var kvp in tagGroupMap)
                {
                    string tagName = kvp.Key;
                    List<string> groupNodes = kvp.Value;
                    if (groupNodes.Count > 0)
                    {
                        sb.AppendLine(string.Format("  - name: \"🏢 机场 - {0}\"", tagName.Replace("\"", "\\\"")));
                        sb.AppendLine("    type: select");
                        sb.AppendLine("    proxies:");
                        foreach (var name in groupNodes)
                        {
                            sb.AppendLine(string.Format("      - \"{0}\"", name.Replace("\"", "\\\"")));
                        }
                        sb.AppendLine("      - DIRECT");
                        sb.AppendLine();
                    }
                }
            }

            sb.AppendLine("rules:");
            if (enableAcl)
            {
                sb.AppendLine("  - GEOIP,CN,DIRECT");
                sb.AppendLine("  - MATCH,🚀 节点选择");
            }
            else
            {
                sb.AppendLine("  - MATCH,🚀 节点选择");
            }

            return sb.ToString();
        }

        private static string GetRegexVal(string input, string pattern)
        {
            Match m = Regex.Match(input, pattern);
            return m.Success ? m.Groups[1].Value : null;
        }
    }

    public static class Program
    {
        public static void Log(string msg)
        {
            try
            {
                string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "debug_ui.log");
                string line = "[" + DateTime.Now.ToString("HH:mm:ss.fff") + "] " + msg + Environment.NewLine;
                File.AppendAllText(logPath, line);
            }
            catch { }
        }

        private static Mutex appMutex;
        private const string AppMutexName = "Global\\SubFlow_1_0_Unique_Mutex";

        [DllImport("user32.dll", SetLastError = true)]
        private static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

        [STAThread]
        public static void Main()
        {
            AppDomain.CurrentDomain.UnhandledException += (s, e) => {
                Log("CRITICAL UnhandledException: " + e.ExceptionObject);
            };
            Application.ThreadException += (s, e) => {
                Log("CRITICAL ThreadException: " + e.Exception);
            };

            // 绝杀防御第 1 关：尝试唤醒已有实例
            bool isRestored = false;
            try
            {
                var pingReq = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:25588/api/restore-window");
                pingReq.Timeout = 800;
                pingReq.ReadWriteTimeout = 800;
                using (var pingResp = (HttpWebResponse)pingReq.GetResponse())
                {
                    if (pingResp.StatusCode == HttpStatusCode.OK)
                    {
                        Log("Successfully signaled running instance to restore window. Exiting launcher process.");
                        isRestored = true;
                    }
                }
            }
            catch { }

            if (isRestored)
            {
                return;
            }

            // 绝杀防御第 2 关：如果端口无响应（说明僵死或残留未退出），彻底清理并冷启动！
            try
            {
                int myPid = Process.GetCurrentProcess().Id;
                foreach (var p in Process.GetProcessesByName("SubFlow"))
                {
                    if (p.Id != myPid)
                    {
                        try { p.Kill(); } catch { }
                    }
                }
                foreach (var p in Process.GetProcessesByName("SubConverter"))
                {
                    if (p.Id != myPid)
                    {
                        try { p.Kill(); } catch { }
                    }
                }
                Thread.Sleep(150);
            }
            catch { }

            try
            {

                Log("Application Main starting...");
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainForm());
                Log("Application Main finished cleanly.");
            }
            catch (Exception ex)
            {
                Log("Fatal in Main: " + ex.ToString());
            }
        }
    }
}
