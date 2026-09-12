const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('zierWidget', {
  setExpanded: (expanded) => ipcRenderer.invoke('set-expanded', expanded),
  setAlwaysOnTop: (enabled) => ipcRenderer.invoke('set-always-on-top', enabled),
  setWidgetSize: (settings) => ipcRenderer.invoke('set-widget-size', settings),
  getStartup: () => ipcRenderer.invoke('get-startup'),
  setStartup: (enabled) => ipcRenderer.invoke('set-startup', enabled),
  getWeather: (city) => ipcRenderer.invoke('get-weather', city),
  fetchThemeUrl: (url) => ipcRenderer.invoke('fetch-theme-url', url),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  close: () => ipcRenderer.send('close-window'),
  onForceExpanded: (callback) => ipcRenderer.on('force-expanded', callback),
});
