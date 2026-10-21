import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  CalendarDays,
  Package,
  Award,
  Loader2,
  ArrowLeft,
  Lightbulb,
} from 'lucide-react';
import { reuseHistoryApi, recycleApi } from '../api/api';

const historyKey = (userId) => `three_r_reuse_history_${userId || 'demo-user'}`;

/**
 * Call this whenever a reuse is confirmed so it shows up in the history page.
 * It saves to the backend (POST /api/reuse/history) and, if the backend is
 * unreachable, keeps a copy in this browser instead.
 *
 *   import { logReuseActivity } from './ReuseHistory';
 *   await logReuseActivity(userId, { itemName: 'Glass jar', idea: 'Herb planter' });
 */
export async function logReuseActivity(userId, entry = {}) {
  try {
    await reuseHistoryApi.record({
      userId: userId || 'demo-user',
      itemName: entry.itemName,
      idea: entry.idea,
      quantity: entry.quantity ?? 1,
    });
    return;
  } catch (err) {
    console.warn('Backend unavailable, saving reuse activity locally:', err);
  }

  try {
    const key = historyKey(userId);
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const list = Array.isArray(existing) ? existing : [];

    list.unshift({
      id: entry.id || `local-${Date.now()}`,
      quantity: 1,
      ...entry,
      createdAt: entry.createdAt || new Date().toISOString(),
    });

    localStorage.setItem(key, JSON.stringify(list.slice(0, 500)));
  } catch (err) {
    console.error('Could not save reuse activity:', err);
  }
}

const formatDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const extractList = (data) => {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  for (const key of ['history', 'items', 'results', 'data', 'records']) {
    if (Array.isArray(data[key])) return data[key];
  }

  return [];
};

// Used when reuse events live in the general /history list.
const isReuseRecord = (record) =>
  String(
    record?.type ??
      record?.action ??
      record?.activityType ??
      record?.category ??
      ''
  )
    .toLowerCase()
    .includes('reuse') ||
  record?.reused === true ||
  Boolean(record?.reuseIdea);

const readLocalHistory = (userId) => {
  try {
    const data = JSON.parse(localStorage.getItem(historyKey(userId)) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

async function fetchBackendReuse(userId) {
  const attempt = async (request) => {
    try {
      const response = await request();
      return response.data;
    } catch {
      return null;
    }
  };

  // Main source: GET /api/reuse/history
  let list = extractList(await attempt(() => reuseHistoryApi.getAll(userId)));

  // Fallback: reuse events stored in the general /api/history list.
  if (list.length === 0) {
    list = extractList(
      await attempt(() => recycleApi.getHistory(userId))
    ).filter(isReuseRecord);
  }

  return list;
}

const normalize = (record, index) => ({
  id: String(record.id ?? `${record.createdAt ?? 'record'}-${index}`),
  itemName:
    record.itemName || record.name || record.title || 'Reused item',
  idea: record.idea || record.ideaTitle || record.reuseIdea || '',
  quantity: Math.max(0, Number(record.quantity ?? 1) || 0),
  points: Number(record.pointsEarned ?? record.points ?? 0) || 0,
  createdAt: record.createdAt || record.date || null,
});

export default function ReuseHistory({ userId }) {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const backend = await fetchBackendReuse(userId);
    const local = readLocalHistory(userId);

    // Merge both sources, dropping duplicates by id.
    const seen = new Set();
    const merged = [...backend, ...local]
      .map(normalize)
      .filter((record) => {
        if (seen.has(record.id)) return false;
        seen.add(record.id);
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

    setRecords(merged);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () =>
      records.reduce(
        (result, record) => {
          result.events += 1;
          result.items += record.quantity;
          result.points += record.points;
          return result;
        },
        { events: 0, items: 0, points: 0 }
      ),
    [records]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-blue-600" />
        <p className="text-gray-600">Loading reused items...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <ArrowLeft size={18} />
          Back to Profile
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <RefreshCw size={25} className="text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Reused Items
              </h2>
            </div>

            <p className="text-sm text-gray-500">
              Everything you've given a second life.
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            aria-label="Refresh reused items"
            className="shrink-0 rounded-xl border border-gray-200 p-3 transition hover:bg-gray-100"
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <RefreshCw className="h-5 w-5 text-blue-700" />
          </div>
          <p className="text-sm text-blue-800">Reuse events</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">
            {totals.events}
          </p>
          <p className="mt-1 text-xs text-blue-700">
            {totals.items} item(s) in total
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Award className="h-5 w-5 text-amber-700" />
          </div>
          <p className="text-sm text-amber-800">Points earned</p>
          <p className="mt-1 text-3xl font-bold text-amber-900">
            {totals.points.toLocaleString('en-MY')}
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-4 font-semibold text-gray-900">
          All reuse activity
        </h3>

        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <RefreshCw className="mx-auto mb-3 h-12 w-12 text-gray-400" />
            <h4 className="font-semibold text-gray-900">
              No reuse activity yet
            </h4>
            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Once you confirm that you've reused an item, it will appear
              here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <article
                key={record.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-100">
                    <Package className="h-6 w-6 text-blue-700" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h4 className="break-words font-semibold text-gray-900">
                        {record.itemName}
                      </h4>
                      <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                        Reused
                      </span>
                    </div>

                    {record.idea && (
                      <p className="mt-1 flex items-start gap-1.5 text-sm text-gray-600">
                        <Lightbulb
                          size={15}
                          className="mt-0.5 shrink-0 text-amber-500"
                        />
                        {record.idea}
                      </p>
                    )}

                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                      <CalendarDays size={16} className="shrink-0" />
                      <span>{formatDate(record.createdAt)}</span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <p className="text-xs text-gray-500">Quantity</p>
                        <p className="mt-1 font-semibold text-gray-900">
                          {record.quantity} item(s)
                        </p>
                      </div>

                      <div className="rounded-lg bg-amber-50 p-3">
                        <p className="text-xs text-amber-700">
                          Points earned
                        </p>
                        <p className="mt-1 flex items-center gap-1 font-semibold text-amber-800">
                          <Award size={16} />+{record.points}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}