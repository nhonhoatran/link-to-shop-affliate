import { contextBridge, ipcRenderer } from 'electron';
import { clientImportIdSchema, desktopCommandSchemas, desktopProgressSchema, type DesktopBridge, type DesktopCommand,
  type DesktopInput, type DesktopOutput } from '@under30ss/shared';

const bridge: DesktopBridge = {
  async invoke<K extends DesktopCommand>(command: K, input: DesktopInput<K>): Promise<DesktopOutput<K>> {
    const contract = desktopCommandSchemas[command];
    if (!contract) throw new Error('Lệnh desktop không hợp lệ');
    const value: unknown = await ipcRenderer.invoke('desktop:invoke', command, contract.input.parse(input));
    return contract.output.parse(value) as DesktopOutput<K>;
  },
  onProgress(listener) {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown) => {
      const result = desktopProgressSchema.safeParse(value);
      if (result.success) listener(result.data);
    };
    ipcRenderer.on('desktop:progress', handler);
    return () => { ipcRenderer.removeListener('desktop:progress', handler); };
  },
  assetUrl(sessionId, assetId) {
    clientImportIdSchema.parse(sessionId); clientImportIdSchema.parse(assetId);
    return `import-asset://asset/${encodeURIComponent(sessionId)}/${encodeURIComponent(assetId)}`;
  },
};
contextBridge.exposeInMainWorld('desktop', bridge);
