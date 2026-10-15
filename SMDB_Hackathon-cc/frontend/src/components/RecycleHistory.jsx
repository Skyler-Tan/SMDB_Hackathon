
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Recycle,
  CalendarDays,
  Package,
  Award,
  RefreshCw,
  AlertCircle,
  Loader2,
  Droplets,
  Leaf,
  Scale,
} from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

const formatDate = (value) => {
  if (!value) return 'Date unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Date unavailable';
  }

  return date.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatNumber = (value, decimals = 1) => {
  const number = Number(value ?? 0);

  return Number.isFinite(number)
    ? number.toLocaleString('en-MY', {
        maximumFractionDigits: decimals,
      })
    : '0';
};

const formatBin = (bin) => {
  if (!bin || String(bin).toLowerCase() === 'unknown') {
    return 'Not specified';
  }

  return String(bin)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export default function RecycleHistory({ userId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const url = new URL(
        `${API_BASE_URL.replace(/\/+$/, '')}/history`,
        window.location.origin
      );

      if (userId) {
        url.searchParams.set('userId', userId);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(
          `Failed to load recycle history (HTTP ${response.status}).`
        );
      }

      const data = await response.json();

      const records = Array.isArray(data)
        ? data
        : Array.isArray(data?.history)
          ? data.history
          : [];

      records.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();

        return dateB - dateA;
      });

      setHistory(records);
    } catch (err) {
      console.error('Failed to load recycle history:', err);

      setError(
        err.message || 'Unable to load recycle history.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const totals = useMemo(() => {
    return history.reduce(
      (result, record) => {
        result.events += 1;
        result.quantity += Math.max(
          0,
          Number(record.quantity) || 0
        );
        result.points += Number(record.pointsEarned) || 0;
        result.water += Number(record.waterLiters) || 0;
        result.co2 += Number(record.co2Kg) || 0;
        result.material += Number(record.materialGrams) || 0;

        return result;
      },
      {
        events: 0,
        quantity: 0,
        points: 0,
        water: 0,
        co2: 0,
        material: 0,
      }
    );
  }, [history]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-green-600" />
        <p className="text-gray-600">
          Loading recycle history...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Recycle size={25} className="text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Recycle History
            </h2>
          </div>

          <p className="text-sm text-gray-500">
            Track your recycling activity, rewards, and environmental impact.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadHistory(true)}
          disabled={refreshing}
          aria-label="Refresh recycle history"
          className="shrink-0 rounded-xl border border-gray-200 p-3 transition hover:bg-gray-100 disabled:opacity-50"
        >
          <RefreshCw
            size={19}
            className={refreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div className="flex-1">
            <p className="font-medium text-red-800">
              Could not load recycle history
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>

            <button
              type="button"
              onClick={() => loadHistory()}
              className="mt-3 text-sm font-medium text-red-700 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-100">
            <Recycle className="h-5 w-5 text-green-700" />
          </div>

          <p className="text-sm text-green-800">Recycling events</p>
          <p className="mt-1 text-3xl font-bold text-green-900">
            {totals.events}
          </p>
          <p className="mt-1 text-xs text-green-700">
            {totals.quantity} item(s) in total
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
            <Award className="h-5 w-5 text-amber-700" />
          </div>

          <p className="text-sm text-amber-800">Points earned</p>
          <p className="mt-1 text-3xl font-bold text-amber-900">
            {formatNumber(totals.points, 0)}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
            <Droplets className="h-5 w-5 text-blue-700" />
          </div>

          <p className="text-sm text-blue-800">Water saved</p>
          <p className="mt-1 text-2xl font-bold text-blue-900">
            {formatNumber(totals.water)} L
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
            <Leaf className="h-5 w-5 text-emerald-700" />
          </div>

          <p className="text-sm text-emerald-800">CO₂ impact</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">
            {formatNumber(totals.co2)} kg
          </p>
        </div>
      </div>

      <section>
        <h3 className="mb-4 font-semibold text-gray-900">
          Recent recycling activity
        </h3>

        {!error && history.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <Recycle className="mx-auto mb-3 h-12 w-12 text-gray-400" />

            <h4 className="font-semibold text-gray-900">
              No recycling activity yet
            </h4>

            <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
              Once you confirm a recycling action in the app, your
              activity and rewards will appear here.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {history.map((record, index) => (
            <article
              key={record.id || `${record.createdAt}-${index}`}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
                  <Package className="h-6 w-6 text-green-700" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="break-words font-semibold text-gray-900">
                      {record.itemName || 'Recycled item'}
                    </h4>

                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                      Recycled
                    </span>
                  </div>

                  <p className="mt-1 text-sm capitalize text-gray-600">
                    {record.material || 'Material not specified'}
                  </p>

                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                    <CalendarDays size={16} className="shrink-0" />
                    <span>{formatDate(record.createdAt)}</span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Quantity</p>
                      <p className="mt-1 font-semibold text-gray-900">
                        {formatNumber(record.quantity, 0)} item(s)
                      </p>
                    </div>

                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-xs text-gray-500">Recycling bin</p>
                      <p className="mt-1 break-words font-semibold text-gray-900">
                        {formatBin(record.bin)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-xs text-amber-700">Points earned</p>
                      <p className="mt-1 flex items-center gap-1 font-semibold text-amber-800">
                        <Award size={16} />
                        +{formatNumber(record.pointsEarned, 0)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-xs text-emerald-700">Material recycled</p>
                      <p className="mt-1 flex items-center gap-1 font-semibold text-emerald-800">
                        <Scale size={16} />
                        {formatNumber(record.materialGrams)} g
                      </p>
                    </div>
                  </div>

                  {(Number(record.waterLiters) > 0 ||
                    Number(record.co2Kg) > 0) && (
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-500">
                      {Number(record.waterLiters) > 0 && (
                        <span>
                          Water impact: {formatNumber(record.waterLiters)} L
                        </span>
                      )}

                      {Number(record.co2Kg) > 0 && (
                        <span>
                          CO₂ impact: {formatNumber(record.co2Kg)} kg
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
