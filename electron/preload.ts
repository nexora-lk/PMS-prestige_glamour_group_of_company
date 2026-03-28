import { contextBridge } from 'electron';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Add backend-specific electron APIs here if necessary
});
