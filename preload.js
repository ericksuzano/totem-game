const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('totemAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  getWorks: () => ipcRenderer.invoke('get-works'),
  getVotingState: () => ipcRenderer.invoke('get-voting-state'),
  getPublicVotingReport: () => ipcRenderer.invoke('get-public-voting-report'),
  registerVote: (workId, workTitle) => ipcRenderer.invoke('register-vote', { workId, workTitle }),
  exitKiosk: (pin) => ipcRenderer.invoke('exit-kiosk', pin),

  // Menu de manutencao (totem de votacao). Todas exigem o PIN do kiosk.
  verifyMaintenancePin: (pin) => ipcRenderer.invoke('verify-maintenance-pin', pin),
  maintenanceGetReport: (pin) => ipcRenderer.invoke('maintenance-get-report', pin),
  maintenanceSetVotingPhase: (pin, phase) => ipcRenderer.invoke('maintenance-set-voting-phase', { pin, phase }),
  maintenanceResetVotes: (pin) => ipcRenderer.invoke('maintenance-reset-votes', pin)
});
