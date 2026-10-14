import { getSurveys, updateSurvey } from './db';
import type { Survey } from './types';

export async function syncQueue(): Promise<number> {
  if (!navigator.onLine) return 0;
  const pending = (await getSurveys()).filter(survey => survey.status === 'PENDING_SYNC');
  let synced = 0;
  for (const survey of pending) {
    try {
      // Replace this endpoint with the deployed API when a server is available.
      // The demo uses a local simulated dispatch so the app remains fully usable offline.
      await dispatchSurvey(survey);
      await updateSurvey({ ...survey, status: 'SYNCED' });
      synced++;
    } catch {
      await updateSurvey({ ...survey, status: 'FAILED' });
      break;
    }
  }
  return synced;
}

async function dispatchSurvey(_survey: Survey) {
  await new Promise(resolve => setTimeout(resolve, 250));
  return true;
}

export async function registerSync() {
  const registration = await navigator.serviceWorker?.ready;
  if ('sync' in (registration ?? {})) {
    await (registration as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('survey-sync');
  }
}
