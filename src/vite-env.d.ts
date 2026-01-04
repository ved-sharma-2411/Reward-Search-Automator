/// <reference types="vite/client" />

interface ChromeStorage {
  local: {
    get(keys: string[] | string, callback: (result: any) => void): void;
    set(items: any, callback?: () => void): void;
  };
}

interface ChromeRuntime {
  sendMessage(message: any, callback?: (response: any) => void): void;
  onMessage: {
    addListener(callback: (message: any, sender: any, sendResponse: (response: any) => void) => boolean | void): void;
  };
  onInstalled: {
    addListener(callback: () => void): void;
  };
  onStartup: {
    addListener(callback: () => void): void;
  };
}

interface ChromeTabs {
  create(createProperties: any): Promise<any>;
  remove(tabId: number): Promise<void>;
}

interface ChromeAlarms {
  create(name: string, alarmInfo: any): void;
  clear(name: string): Promise<boolean>;
  onAlarm: {
    addListener(callback: (alarm: any) => void): void;
  };
}

interface Chrome {
  storage: ChromeStorage;
  runtime: ChromeRuntime;
  tabs: ChromeTabs;
  alarms: ChromeAlarms;
}

declare const chrome: Chrome;
