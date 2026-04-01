import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal, safe API to the renderer process.
// Never expose full Node.js or Electron APIs.
contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  isProduction: (): boolean => process.env.NODE_ENV === 'production',
  saveFile: (options: { data: number[]; defaultName: string }): Promise<{ success: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('save-file', options),
});
