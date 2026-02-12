
import { Priority } from './types';

export const PRIORITY_KEYWORDS: Record<Priority, string[]> = {
  [Priority.HIGH]: ['urgent', 'asap', 'important', 'deadline', 'exam', 'final', 'must', 'alert', 'crisis'],
  [Priority.MEDIUM]: ['call', 'email', 'meeting', 'review', 'buy', 'shop', 'prepare', 'discuss'],
  [Priority.LOW]: []
};

export const TAG_MAPPING: Record<string, string> = {
  study: 'Education',
  exam: 'Academic',
  meeting: 'Work',
  project: 'Work',
  office: 'Work',
  gym: 'Health',
  workout: 'Health',
  run: 'Health',
  buy: 'Shopping',
  grocery: 'Errands',
  shop: 'Shopping',
  dinner: 'Personal',
  family: 'Personal'
};

export const STORAGE_KEY = 'smart_task_pro_data';
