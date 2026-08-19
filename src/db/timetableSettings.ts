import { db } from './db';
import type { TimetableSettings } from './types';

const SETTINGS_ID = 1;

export async function getTimetableSettings(): Promise<TimetableSettings | undefined> {
  return db.timetableSettings.get(SETTINGS_ID);
}

export async function saveTimetableSettings(
  settings: Omit<TimetableSettings, 'id'>
): Promise<void> {
  await db.timetableSettings.put({ id: SETTINGS_ID, ...settings });
}
