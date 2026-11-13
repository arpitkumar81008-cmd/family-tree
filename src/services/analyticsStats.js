import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseClients, isFirebaseConfigured, trackAnalyticsEvent } from './firebase.js';

export const ALLOWED_METRICS = new Set([
  'pageViews',
  'treesCreated',
  'photosUploaded',
  'relationsSolved',
  'joinRequests',
]);

const METRIC_TO_GA_EVENT = {
  pageViews: 'app_page_view',
  treesCreated: 'tree_created',
  photosUploaded: 'photo_uploaded',
  relationsSolved: 'relation_solved',
  joinRequests: 'join_request_sent',
};

export function getTodayDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function recordAppMetric(metricKey, params = {}) {
  if (!ALLOWED_METRICS.has(metricKey)) return false;

  const gaEvent = METRIC_TO_GA_EVENT[metricKey];
  if (gaEvent) {
    trackAnalyticsEvent(gaEvent, params).catch(() => {});
  }

  if (!isFirebaseConfigured()) return false;
  const { db } = getFirebaseClients();
  if (!db) return false;

  const dayId = getTodayDateKey();
  try {
    await setDoc(
      doc(db, 'analytics_daily', dayId),
      {
        date: dayId,
        [metricKey]: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('Analytics metric write skipped:', err?.message || err);
    }
    return false;
  }
}

export async function isUserAdmin(user) {
  if (!user?.uid || !isFirebaseConfigured()) return false;
  const { db } = getFirebaseClients();
  if (!db) return false;
  try {
    const snap = await getDoc(doc(db, 'admins', user.uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function fetchAnalyticsDaily(maxDays = 30) {
  if (!isFirebaseConfigured()) return [];
  const { db } = getFirebaseClients();
  if (!db) return [];

  const q = query(
    collection(db, 'analytics_daily'),
    orderBy('date', 'desc'),
    limit(Math.max(1, Math.min(90, maxDays)))
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => {
    const data = docSnap.data() || {};
    return {
      date: data.date || docSnap.id,
      pageViews: Number(data.pageViews) || 0,
      treesCreated: Number(data.treesCreated) || 0,
      photosUploaded: Number(data.photosUploaded) || 0,
      relationsSolved: Number(data.relationsSolved) || 0,
      joinRequests: Number(data.joinRequests) || 0,
    };
  });
}
