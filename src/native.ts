import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Network } from '@capacitor/network';

export async function takePhoto(): Promise<string | undefined> {
  if (Capacitor.isNativePlatform()) {
    const result = await Camera.getPhoto({ quality: 75, source: CameraSource.Camera, resultType: CameraResultType.DataUrl, width: 1280 });
    return result.dataUrl;
  }
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.capture = 'environment';
    input.onchange = () => { const file = input.files?.[0]; if (!file) return resolve(undefined); const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file); };
    input.click();
  });
}

export async function onNetworkChange(callback: (online: boolean) => void) {
  if (Capacitor.isNativePlatform()) {
    const status = await Network.getStatus(); callback(status.connected);
    return Network.addListener('networkStatusChange', state => callback(state.connected));
  }
  callback(navigator.onLine);
  window.addEventListener('online', () => callback(true));
  window.addEventListener('offline', () => callback(false));
}
