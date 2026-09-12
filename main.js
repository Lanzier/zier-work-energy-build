const { app, BrowserWindow, ipcMain, screen, session, Tray, Menu, nativeImage, shell } = require('electron');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

let widgetWidth = 460;
let widgetHeight = 48;
const windowGutter = 8;
const compactSize = () => ({ width: widgetWidth + windowGutter * 2, height: widgetHeight + windowGutter * 2 });
const expandedSize = () => ({ width: widgetWidth + windowGutter * 2, height: widgetHeight + 408 + windowGutter * 2 });
let win;
let tray;
let forceTop = true;
let quitting = false;
let suppressTop = false;

function hideWindow() {
  if (!win || win.isDestroyed()) return;
  suppressTop = true;
  win.setAlwaysOnTop(false);
  win.setVisibleOnAllWorkspaces(false);
  win.setOpacity(0);
  win.hide();
}

function showWindow() {
  if (!win || win.isDestroyed()) return;
  suppressTop = false;
  win.setOpacity(1);
  win.show();
  if (forceTop) {
    win.setAlwaysOnTop(true, 'screen-saver', 1);
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.moveTop();
  }
  win.focus();
}

function placeWindow(size) {
  const area = screen.getPrimaryDisplay().workArea;
  return {
    width: size.width,
    height: size.height,
    x: Math.round(area.x + area.width - size.width - 18),
    y: Math.round(area.y + area.height - size.height - 12),
  };
}

function createWindow() {
  session.defaultSession.setPermissionCheckHandler((_webContents, permission) => permission === 'geolocation');
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => callback(permission === 'geolocation'));
  win = new BrowserWindow({
    ...placeWindow(compactSize()),
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.on('blur', () => { if (forceTop && !suppressTop && !win.isDestroyed()) { win.setAlwaysOnTop(true, 'screen-saver', 1); win.moveTop(); } });
  win.loadFile('renderer/index.html');
  if (process.argv.includes('--test-theme') || process.argv.includes('--test-settings')) win.webContents.on('console-message', (_event, _level, message) => console.log(message));
  win.once('ready-to-show', showWindow);
  win.on('close', (event) => { if (!quitting && !process.argv.includes('--screenshot')) { event.preventDefault(); hideWindow(); } });

  const trayImage = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png')).resize({ width: 20, height: 20 });
  tray = new Tray(trayImage);
  tray.setToolTip('Zier工作能量条');
  const toggleWindow = () => { if (win.isVisible()) hideWindow(); else showWindow(); };
  tray.on('click', toggleWindow);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示 / 隐藏', click: toggleWindow },
    { label: '最高级置顶', type: 'checkbox', checked: forceTop, click: item => { forceTop = item.checked; win.setAlwaysOnTop(forceTop, 'screen-saver', 1); } },
    { type: 'separator' },
    { label: '退出 Zier工作能量条', click: () => { quitting = true; app.quit(); } },
  ]));

  if (process.argv.includes('--screenshot')) {
    win.webContents.once('did-finish-load', async () => {
      win.setBounds(placeWindow(expandedSize()));
      win.webContents.send('force-expanded');
      if (process.argv.includes('--glass')) win.webContents.executeJavaScript("document.querySelector('[data-theme=glass]').click()");
      if (process.argv.includes('--community')) win.webContents.executeJavaScript("document.getElementById('communityBtn').click()");
      if (process.argv.includes('--advanced')) win.webContents.executeJavaScript("document.getElementById('advancedBtn').click()");
      if (process.argv.includes('--test-settings')) win.webContents.executeJavaScript("document.getElementById('advancedBtn').click();const width=document.getElementById('widgetWidth');width.value='620';width.dispatchEvent(new Event('input'));const height=document.getElementById('widgetHeight');height.value='64';height.dispatchEvent(new Event('input'));document.getElementById('directionUp').click();setTimeout(()=>console.log('SETTINGS_DIAG',localStorage.getItem('zier-widget-settings')),300)");
      if (process.argv.includes('--test-earnings')) win.webContents.executeJavaScript("document.getElementById('displayEarnings').click();const salary=document.getElementById('monthlySalary');salary.value='12000';salary.dispatchEvent(new Event('input'));const label=document.getElementById('earningsLabel');label.value='今天赚了 {amount} 窝囊费';label.dispatchEvent(new Event('input'));document.getElementById('closeAdvanced').click()");
      if (process.argv.includes('--minimal')) win.webContents.executeJavaScript("document.getElementById('communityBtn').click();setTimeout(()=>{document.querySelector('[data-community=minimal]').click();document.getElementById('closeCommunity').click()},150)");
      if (process.argv.includes('--test-theme')) win.webContents.executeJavaScript("document.getElementById('communityBtn').click();document.getElementById('themeImport').value='https://tweakcn.com/themes/cmow9i7d9000004jsbzd8g1tc';document.getElementById('importTheme').click();setTimeout(()=>document.getElementById('closeCommunity').click(),5000);setTimeout(()=>console.log('THEME_DIAG',document.documentElement.dataset.theme,document.documentElement.style.cssText,localStorage.getItem('zier-widget-settings')),6500)");
      setTimeout(async () => {
        const image = await win.webContents.capturePage();
        const out = path.join(__dirname, 'preview.png');
        fs.writeFileSync(out, image.toPNG());
        console.log(out);
        app.quit();
      }, 8500);
    });
  }
}

ipcMain.handle('open-external', (_event, url) => {
  if (url === 'https://tweakcn.com/themes') return shell.openExternal(url);
  return false;
});

ipcMain.handle('set-expanded', (_event, expanded) => {
  const area = screen.getDisplayMatching(win.getBounds()).workArea;
  const current = win.getBounds();
  const target = expanded ? expandedSize() : compactSize();
  // 保持窗口底边不动：贴近任务栏时，抽屉向上展开而不是掉到任务栏后面。
  const bottom = current.y + current.height;
  const x = Math.min(Math.max(current.x, area.x), area.x + area.width - target.width);
  const y = Math.min(
    Math.max(bottom - target.height, area.y),
    area.y + area.height - target.height,
  );
  win.setBounds({ x, y, width: target.width, height: target.height }, true);
  return true;
});

ipcMain.handle('set-widget-size', (_event, settings = {}) => {
  widgetWidth = Math.min(720, Math.max(400, Number(settings.widgetWidth) || 460));
  widgetHeight = Math.min(72, Math.max(44, Number(settings.widgetHeight) || 48));
  const area = screen.getDisplayMatching(win.getBounds()).workArea;
  const current = win.getBounds();
  const target = current.height > compactSize().height + 100 ? expandedSize() : compactSize();
  const x = Math.min(Math.max(current.x, area.x), area.x + area.width - target.width);
  const y = Math.min(Math.max(current.y + current.height - target.height, area.y), area.y + area.height - target.height);
  win.setBounds({ x, y, width: target.width, height: target.height }, true);
  return { width: target.width, height: target.height };
});

const loginItemOptions = () => ({ path: process.execPath, args: app.isPackaged ? [] : [app.getAppPath()] });
ipcMain.handle('get-startup', () => app.getLoginItemSettings(loginItemOptions()).openAtLogin);
ipcMain.handle('set-startup', (_event, enabled) => {
  app.setLoginItemSettings({ openAtLogin: Boolean(enabled), ...loginItemOptions() });
  return app.getLoginItemSettings(loginItemOptions()).openAtLogin;
});

ipcMain.handle('set-always-on-top', (_event, enabled) => {
  forceTop = Boolean(enabled);
  win.setAlwaysOnTop(forceTop, 'screen-saver', 1);
  if (forceTop) { win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); win.moveTop(); }
  return win.isAlwaysOnTop();
});

function requestText(url, headers = {}, redirects = 0) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 ZierWidget/1.1', ...headers } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects < 3) {
        res.resume();
        return resolve(requestText(new URL(res.headers.location, url).href, headers, redirects + 1));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => res.statusCode >= 200 && res.statusCode < 300 ? resolve(body) : reject(new Error(`HTTP ${res.statusCode}`)));
    });
    req.setTimeout(12000, () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

async function autoCity() {
  try {
    const raw = await requestText('https://myip.ipip.net/json');
    const info = JSON.parse(raw);
    const location = info?.data?.location || [];
    if (info.ret === 'ok' && location[2]) return { city: location[2].replace(/[市区县]$/, ''), region: location[1] || '' };
  } catch {}
  const raw = await requestText('http://ip-api.com/json/?fields=status,countryCode,regionName,city,lat,lon&lang=zh-CN');
  const info = JSON.parse(raw);
  const city = String(info.city || '').replace(/[市区县]$/, '');
  if (info.status !== 'success' || info.countryCode !== 'CN' || !city || city.toLowerCase() === String(info.regionName || '').toLowerCase()) throw new Error('city location unavailable');
  return { city, region: info.regionName || '', lat: info.lat, lon: info.lon };
}

async function reverseCity(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&accept-language=zh-CN`;
  const raw = await requestText(url, { 'Accept-Language': 'zh-CN' });
  const address = JSON.parse(raw).address || {};
  const city = address.city || address.town || address.county || address.city_district || address.state_district;
  if (!city) throw new Error('reverse location unavailable');
  return { city: city.replace(/[市区县]$/, ''), region: address.state || '', lat, lon };
}

async function resolveStation(city) {
  const callback = `zier_${Date.now()}`;
  const url = `http://toy1.weather.com.cn/search?cityname=${encodeURIComponent(city)}&callback=${callback}`;
  const raw = await requestText(url, { Referer: 'http://www.weather.com.cn/forecast/' });
  const start = raw.indexOf('('), end = raw.lastIndexOf(')');
  const list = JSON.parse(start >= 0 ? raw.slice(start + 1, end) : raw);
  const rows = Array.isArray(list) ? list : [];
  const exact = rows.find(row => {
    const parts = String(row.ref || '').split('~');
    return parts[1] === city || parts[2] === city || parts[1]?.replace(/[市区县]$/, '') === city;
  });
  if (!exact?.ref) throw new Error('station unavailable');
  const parts = exact.ref.split('~');
  return { code: parts[0], city: parts[2] || city, province: parts[9] || '' };
}

async function fetchStationWeather(code) {
  const url = `https://d1.weather.com.cn/sk_2d/${code}.html?_=${Date.now()}`;
  const raw = await requestText(url, { Referer: `https://www.weather.com.cn/weather1d/${code}.shtml` });
  const json = raw.replace(/^\s*var\s+dataSK\s*=\s*/, '').replace(/;?\s*$/, '');
  return JSON.parse(json);
}

ipcMain.handle('get-weather', async (_event, preference = {}) => {
  try {
    let located = null;
    const requested = String(preference.city || '').trim().replace(/[市区县]$/, '');
    if (!requested && Number.isFinite(preference.lat) && Number.isFinite(preference.lon)) located = await reverseCity(preference.lat, preference.lon);
    const city = requested || (located ||= await autoCity()).city;
    const station = await resolveStation(city);
    const data = await fetchStationWeather(station.code);
    return { ok: true, data, location: { ...located, ...station }, source: requested ? '手动城市' : (Number.isFinite(preference.lat) ? '设备自动定位' : '网络自动定位') };
  } catch {
    try {
      const data = await fetchStationWeather('101210904');
      return { ok: true, data, location: { code: '101210904', city: '义乌', province: '浙江' }, source: '定位失败 · 义乌兜底' };
    } catch { return { ok: false, error: '定位或天气暂不可用' }; }
  }
});

ipcMain.handle('fetch-theme-url', async (_event, url) => {
  try {
    const parsed = new URL(String(url));
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('unsupported protocol');
    const text = await requestText(parsed.href, { Accept: 'text/css, application/json, text/html' });
    if (text.length > 2_000_000) throw new Error('theme too large');
    let theme = null;
    let decoded = text;
    for (let pass = 0; pass < 5; pass += 1) decoded = decoded.replace(/\\"/g, '"');
    const marker = decoded.lastIndexOf('"theme":{');
    if (marker >= 0) {
      const head = decoded.slice(marker, marker + 1200);
      const name = head.match(/"name":"([^"]+)"/)?.[1] || 'TweakCN';
      const keys = ['background','foreground','card','popover','primary','secondary','muted-foreground','accent','ring','border','input','radius','font-sans','shadow-color','shadow-opacity','shadow-blur','shadow-spread','shadow-offset-x','shadow-offset-y'];
      const readVariant = (variant, stopVariant) => {
        const at = decoded.indexOf(`"${variant}":{`, marker);
        if (at < 0) return null;
        const stop = stopVariant ? decoded.indexOf(`"${stopVariant}":{`, at + 8) : -1;
        const chunk = decoded.slice(at, stop > at ? stop : at + 12000);
        const values = {};
        for (const key of keys) {
          const safe = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const value = chunk.match(new RegExp(`"${safe}":"([^"]*)"`))?.[1];
          if (value !== undefined) values[key] = value.replace(/^(?:\\+[tnr]|\s)+/g, '').trim();
        }
        return values.background && values.primary ? values : null;
      };
      const light = readVariant('light', 'dark');
      const dark = readVariant('dark');
      if (light || dark) theme = { name, styles: { light, dark } };
    }
    return { ok: true, text, theme, url: parsed.href };
  } catch { return { ok: false, error: '无法读取该主题链接，请改为粘贴主题 CSS' }; }
});

ipcMain.on('close-window', hideWindow);

app.setAppUserModelId('com.zier.workenergybar');
app.whenReady().then(createWindow);
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {});
