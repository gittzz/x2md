declare module "electrobun/bun" {
  export const BrowserWindow: any;
  export const Tray: any;
  export const openFileDialog: (options?: {
    startingFolder?: string;
    allowedFileTypes?: string;
    canChooseFiles?: boolean;
    canChooseDirectory?: boolean;
    allowsMultipleSelection?: boolean;
  }) => Promise<string[]>;
  export const showNotification: (options: { title: string; body?: string; subtitle?: string; silent?: boolean }) => void;
}
