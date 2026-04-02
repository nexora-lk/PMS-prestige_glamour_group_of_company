export interface ElectronAPI {
  getAppVersion: () => Promise<string>;
  isProduction: () => boolean;
  saveFile: (options: { data: number[]; defaultName: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  saveRefreshToken: (token: string) => Promise<boolean>;
  getRefreshToken: () => Promise<string | null>;
  deleteRefreshToken: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
