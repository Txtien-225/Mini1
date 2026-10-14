import { openDB, type IDBPDatabase } from 'idb';
import type { Draft, Survey } from './types';

interface VKUDB { drafts: { key: string; value: Draft & { key: string } }; surveys: { key: string; value: Survey } }
let dbPromise: Promise<IDBPDatabase<VKUDB>>;

function db() {
  dbPromise ??= openDB<VKUDB>('vku-field-survey', 1, {
    upgrade(database) {
      database.createObjectStore('drafts', { keyPath: 'key' });
      database.createObjectStore('surveys', { keyPath: 'id' });
    }
  });
  return dbPromise;
}

export const saveDraft = (draft: Draft) => db().then(database => database.put('drafts', { ...draft, key: 'current' }));
export const getDraft = () => db().then(database => database.get('drafts', 'current'));
export const clearDraft = () => db().then(database => database.delete('drafts', 'current'));
export const addSurvey = (survey: Survey) => db().then(database => database.put('surveys', survey));
export const getSurveys = () => db().then(database => database.getAll('surveys'));
export const updateSurvey = (survey: Survey) => addSurvey(survey);
