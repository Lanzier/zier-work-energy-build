using System;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using System.Windows.Forms;

internal sealed class BrandInstaller : Form
{
    private readonly Label title = new Label();
    private readonly Label status = new Label();
    private readonly Label percent = new Label();
    private readonly Button action = new Button();
    private readonly Button close = new Button();
    private readonly Timer animation = new Timer();
    private int progress;
    private bool installing;
    private bool completed;

    [DllImport("user32.dll")] private static extern bool ReleaseCapture();
    [DllImport("user32.dll")] private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);

    public BrandInstaller()
    {
        Text = "Zier 工作能量条安装";
        ClientSize = new Size(720, 450);
        FormBorderStyle = FormBorderStyle.None;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(8, 10, 18);
        ForeColor = Color.White;
        Font = new Font("Microsoft YaHei UI", 9F);
        DoubleBuffered = true;
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        Region = Region.FromHrgn(CreateRoundRectRgn(0, 0, Width + 1, Height + 1, 28, 28));

        MouseDown += DragWindow;
        foreach (Control control in Controls) control.MouseDown += DragWindow;

        var brand = LabelAt("●  ZIER DESKTOP", 42, 31, 260, 24, Color.FromArgb(119, 248, 167), 10F, FontStyle.Bold);
        var version = LabelAt("WORK ENERGY BAR  ·  v2.6.0", 420, 35, 210, 20, Color.FromArgb(148, 158, 193), 8.5F, FontStyle.Bold);
        version.TextAlign = ContentAlignment.MiddleRight;

        close.Text = "×";
        close.SetBounds(660, 19, 38, 38);
        StyleButton(close, Color.FromArgb(25, 29, 48), Color.White);
        close.Font = new Font("Segoe UI", 17F, FontStyle.Bold);
        close.Click += (s, e) => { if (!installing) Close(); };

        var iconBox = new PictureBox { Bounds = new Rectangle(42, 92, 82, 82), SizeMode = PictureBoxSizeMode.Zoom, Image = Icon.ExtractAssociatedIcon(Application.ExecutablePath).ToBitmap() };
        Controls.Add(iconBox);

        title.Text = "安装 Zier 工作能量条";
        title.SetBounds(148, 91, 500, 42);
        title.Font = new Font("Microsoft YaHei UI", 23F, FontStyle.Bold);
        title.ForeColor = Color.FromArgb(247, 249, 255);
        Controls.Add(title);

        var subtitle = LabelAt("把下班倒计时，变成能量条。", 150, 137, 430, 28, Color.FromArgb(164, 172, 202), 11F, FontStyle.Regular);
        var features = LabelAt("城市天气   ·   工作电量   ·   实时收入   ·   社区主题", 42, 207, 620, 26, Color.FromArgb(191, 200, 230), 10F, FontStyle.Regular);

        status.Text = "准备安装到这台电脑";
        status.SetBounds(42, 264, 520, 26);
        status.ForeColor = Color.FromArgb(224, 229, 247);
        status.Font = new Font("Microsoft YaHei UI", 10F, FontStyle.Bold);
        Controls.Add(status);

        percent.Text = "";
        percent.SetBounds(570, 264, 105, 26);
        percent.TextAlign = ContentAlignment.MiddleRight;
        percent.ForeColor = Color.FromArgb(119, 248, 167);
        percent.Font = new Font("Segoe UI", 10F, FontStyle.Bold);
        Controls.Add(percent);

        action.Text = "开始安装  →";
        action.SetBounds(42, 339, 636, 58);
        StyleButton(action, Color.FromArgb(76, 91, 255), Color.White);
        action.Font = new Font("Microsoft YaHei UI", 11F, FontStyle.Bold);
        action.Click += async (s, e) => { if (completed) Close(); else await InstallAsync(); };

        animation.Interval = 45;
        animation.Tick += (s, e) => { if (installing && progress < 92) { progress += progress < 55 ? 2 : 1; Invalidate(); percent.Text = progress + "%"; } };

        Controls.Add(brand);
        Controls.Add(version);
        Controls.Add(close);
        Controls.Add(subtitle);
        Controls.Add(features);
        Controls.Add(action);
    }

    [DllImport("gdi32.dll")] private static extern IntPtr CreateRoundRectRgn(int nLeftRect, int nTopRect, int nRightRect, int nBottomRect, int nWidthEllipse, int nHeightEllipse);

    private Label LabelAt(string text, int x, int y, int width, int height, Color color, float size, FontStyle style)
    {
        return new Label { Text = text, Bounds = new Rectangle(x, y, width, height), ForeColor = color, BackColor = Color.Transparent, Font = new Font("Microsoft YaHei UI", size, style) };
    }

    private static void StyleButton(Button button, Color background, Color foreground)
    {
        button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderSize = 0;
        button.BackColor = background;
        button.ForeColor = foreground;
        button.Cursor = Cursors.Hand;
    }

    private void DragWindow(object sender, MouseEventArgs e)
    {
        if (e.Button != MouseButtons.Left) return;
        ReleaseCapture();
        SendMessage(Handle, 0xA1, 0x2, 0);
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
        using (var glow = new LinearGradientBrush(new Rectangle(0, 0, Width, Height), Color.FromArgb(32, 57, 120, 255), Color.FromArgb(18, 127, 72, 246), 22F))
            e.Graphics.FillRectangle(glow, ClientRectangle);
        using (var line = new Pen(Color.FromArgb(42, 255, 255, 255))) e.Graphics.DrawLine(line, 42, 245, 678, 245);
        using (var track = new SolidBrush(Color.FromArgb(29, 34, 56))) e.Graphics.FillRoundedRectangle(track, new Rectangle(42, 302, 636, 12), 6);
        if (progress > 0)
        {
            var width = Math.Max(12, 636 * progress / 100);
            using (var fill = new LinearGradientBrush(new Rectangle(42, 302, width, 12), Color.FromArgb(57, 120, 255), Color.FromArgb(119, 248, 167), 0F))
                e.Graphics.FillRoundedRectangle(fill, new Rectangle(42, 302, width, 12), 6);
        }
    }

    private async Task InstallAsync()
    {
        if (installing) return;
        installing = true;
        close.Enabled = false;
        action.Enabled = false;
        action.Text = "正在安装，请稍候…";
        status.Text = "正在复制组件并创建桌面快捷方式";
        progress = 4;
        animation.Start();
        Invalidate();

        var inner = Path.Combine(Path.GetTempPath(), "ZierWorkEnergyBar-2.6.0-setup.exe");
        try
        {
            using (var input = Assembly.GetExecutingAssembly().GetManifestResourceStream("InnerInstaller"))
            using (var output = File.Create(inner)) await input.CopyToAsync(output);
            var process = Process.Start(new ProcessStartInfo(inner, "/S") { UseShellExecute = true });
            await Task.Run(() => process.WaitForExit());
            if (process.ExitCode != 0) throw new Exception("安装程序返回代码 " + process.ExitCode);
            animation.Stop();
            progress = 100;
            percent.Text = "100%";
            status.Text = "安装完成，桌面快捷方式已经创建";
            title.Text = "安装完成";
            action.Enabled = true;
            action.Text = "完成";
            completed = true;
            installing = false;
            close.Enabled = true;
            Invalidate();
        }
        catch (Exception error)
        {
            animation.Stop();
            installing = false;
            close.Enabled = true;
            action.Enabled = true;
            action.Text = "重新安装";
            status.Text = "安装失败：" + error.Message;
        }
        finally { try { if (File.Exists(inner)) File.Delete(inner); } catch { } }
    }

    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new BrandInstaller());
    }
}

internal static class GraphicsExtensions
{
    public static void FillRoundedRectangle(this Graphics graphics, Brush brush, Rectangle bounds, int radius)
    {
        using (var path = new GraphicsPath())
        {
            int diameter = radius * 2;
            path.AddArc(bounds.Left, bounds.Top, diameter, diameter, 180, 90);
            path.AddArc(bounds.Right - diameter, bounds.Top, diameter, diameter, 270, 90);
            path.AddArc(bounds.Right - diameter, bounds.Bottom - diameter, diameter, diameter, 0, 90);
            path.AddArc(bounds.Left, bounds.Bottom - diameter, diameter, diameter, 90, 90);
            path.CloseFigure();
            graphics.FillPath(brush, path);
        }
    }
}
