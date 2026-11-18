/**
 * Daily Usage Analytics & Admin Verification Service.
 * - Tracks anonymized daily counters in `analytics_daily/{YYYY-MM-DD}` and Google Analytics 4.
 * - Provides admin role checks against `admins/{uid}` and daily metrics querying.
 */
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
  setDoc
} from 'firebase/firestore';
import { getFirebaseClients, isFirebaseConfigured, trackAnalyticsEvent } from './firebase.js';

export const ALLOWED_METRICS = new Set([
  'pageViews',
  'treesCreated',
  'photosUploaded',
  'relationsSolved',
  'joinRequests'
]);

const METRIC_TO_GA_EVENT = {
  pageViews: 'app_page_view',
  treesCreated: 'tree_created',
  photosUploaded: 'photo_uploaded',
  relationsSolved: 'relation_solved',
  joinRequests: 'join_request_sent'
};

/**
 * Formats a Date instance into a `YYYY-MM-DD` key for daily analytics buckets.
 *
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getTodayDateKey(date = new Date()) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Increments an allowed application usage metric in `analytics_daily/{dayId}` and fires a GA4 event.
 *
 * @param {string} metricKey
 * @param {object} [params={}]
 * @returns {Promise<boolean>}
 */
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
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    if (import.meta.env?.DEV) {
      console.warn('Analytics metric write skipped:', err?.message || err);
    }
    return false;
  }
}

/**
 * Checks whether the given user has an admin document under `admins/{uid}`.
 *
 * @param {{ uid?: string } | null} user
 * @returns {Promise<boolean>}
 */
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

/**
 * Fetches up to `maxDays` daily analytics records ordered newest-first.
 *
 * @param {number} [maxDays=30]
 * @returns {Promise<Array<{
 *   date: string,
 *   pageViews: number,
 *   treesCreated: number,
 *   photosUploaded: number,
 *   relationsSolved: number,
 *   joinRequests: number
 * }>>}
 */
export async function fetchAnalyticsDaily(maxDays = 30) {
  if (!isFirebaseConfigured()) return [];
  const { db } = getFirebaseClients();
  if (!db) return [];

  const safeLimit = Math.max(1, Math.min(90, Number(maxDays) || 30));
  const q = query(
    collection(db, 'analytics_daily'),
    orderBy('date', 'desc'),
    limit(safeLimit)
  );
  const snap = await getDocs(q);
  return snap.docs.map(docSnap => {
    const data = docSnap.data() || {};
    return {
      date: data.date || docSnap.id,
      pageViews: Number(data.pageViews) || 0,
      treesCreated: Number(data.treesCreated) || 0,
      photosUploaded: Number(data.photosUploaded) || 0,
      relationsSolved: Number(data.relationsSolved) || 0,
      joinRequests: Number(data.joinRequests) || 0
    };
  });
}
