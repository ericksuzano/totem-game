const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('totemAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  registerVote: (workId, workTitle) => ipcRenderer.invoke('register-vote', { workId, workTitle }),
  exitKiosk: (pin) => ipcRenderer.invoke('exit-kiosk', pin)
});
