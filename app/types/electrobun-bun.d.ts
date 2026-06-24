declare module "electrobun/bun" {
  export const BrowserWindow: any;
  export const Tray: any;
  export const showNotification: (options: { title: string; body?: string; subtitle?: string; silent?: boolean }) => void;
}
