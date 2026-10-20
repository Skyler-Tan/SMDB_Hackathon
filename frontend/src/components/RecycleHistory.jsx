import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ArrowLeft,
  BarChart3,
  X,
} from 'lucide-react';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || '/api';

// How many weeks the chart shows at most, and at least.
const MAX_WEEKS = 12;
const MIN_WEEKS = 4;

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

// ---- Week helpers (weeks run Monday to Sunday, in the user's local time) ----

const getWeekStart = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start;
};

const addDays = (date, days) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const toWeekKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const shortDate = (date) =>
  date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });

const weekRangeLabel = (week) =>
  `${shortDate(week.start)} – ${shortDate(week.end)}`;

export default function RecycleHistory({ userId }) {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(null); // week key or null
  const chartRef = useRef(null);

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
          `Failed to load recycled items (HTTP ${response.status}).`
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
      console.error('Failed to load recycled items:', err);

      setError(
        err.message || 'Unable to load recycled items.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Group the history into weeks for the bar chart.
  const weeks = useMemo(() => {
    const currentWeek = getWeekStart(new Date());

    const recordWeekStarts = history
      .map((record) => getWeekStart(record.createdAt))
      .filter(Boolean);

    const earliest = recordWeekStarts.length
      ? new Date(Math.min(...recordWeekStarts.map((d) => d.getTime())))
      : currentWeek;

    // Show from the first week with data, capped to the most recent MAX_WEEKS,
    // and padded so the chart never looks too sparse.
    const maxStart = addDays(currentWeek, -(MAX_WEEKS - 1) * 7);
    const minStart = addDays(currentWeek, -(MIN_WEEKS - 1) * 7);

    let first = earliest < maxStart ? maxStart : earliest;
    if (first > minStart) first = minStart;

    const result = [];
    for (
      let start = first;
      start <= currentWeek;
      start = addDays(start, 7)
    ) {
      result.push({
        key: toWeekKey(start),
        start,
        end: addDays(start, 6),
        items: 0,
        events: 0,
      });
    }

    const byKey = new Map(result.map((week) => [week.key, week]));

    history.forEach((record) => {
      const start = getWeekStart(record.createdAt);
      const week = start ? byKey.get(toWeekKey(start)) : null;

      if (week) {
        week.items += Math.max(0, Number(record.quantity) || 0);
        week.events += 1;
      }
    });

    return result;
  }, [history]);

  const maxItems = useMemo(
    () => Math.max(1, ...weeks.map((week) => week.items)),
    [weeks]
  );

  const selected = weeks.find((week) => week.key === selectedWeek) || null;

  // Everything when no week is selected; otherwise only that week's records.
  const visibleHistory = useMemo(() => {
    if (!selected) return history;

    return history.filter((record) => {
      const start = getWeekStart(record.createdAt);
      return start && toWeekKey(start) === selected.key;
    });
  }, [history, selected]);

  const totals = useMemo(() => {
    return visibleHistory.reduce(
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
  }, [visibleHistory]);

  // Keep the most recent weeks in view when the chart is wider than the screen.
  useEffect(() => {
    const chart = chartRef.current;
    if (chart) chart.scrollLeft = chart.scrollWidth;
  }, [loading, weeks.length]);

  const toggleWeek = (week) => {
    setSelectedWeek((current) => (current === week.key ? null : week.key));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-green-600" />
        <p className="text-gray-600">
          Loading recycled items...
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <ArrowLeft size={18} />
          Back to Profile
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Recycle size={25} className="text-green-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Recycled Items
              </h2>
            </div>

            <p className="text-sm text-gray-500">
              Your recycled items, activity history, rewards, and environmental impact.
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadHistory(true)}
            disabled={refreshing}
            aria-label="Refresh recycled items"
            className="shrink-0 rounded-xl border border-gray-200 p-3 transition hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw
              size={19}
              className={refreshing ? 'animate-spin' : ''}
            />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div className="flex-1">
            <p className="font-medium text-red-800">
              Could not load recycled items
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

      {/* WEEKLY BAR CHART */}
      {history.length > 0 && (
        <section
          aria-label="Items recycled per week"
          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-green-600" />
              <h3 className="font-semibold text-gray-900">
                Items recycled per week
              </h3>
            </div>

            {selected ? (
              <button
                type="button"
                onClick={() => setSelectedWeek(null)}
                className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800 transition hover:bg-green-200"
              >
                {weekRangeLabel(selected)}
                <X size={13} />
              </button>
            ) : (
              <p className="text-xs text-gray-500">
                Tap a bar to see that week
              </p>
            )}
          </div>

          <div
            ref={chartRef}
            className="flex items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2"
            role="group"
            aria-label="Weekly recycling bars"
          >
            {weeks.map((week) => {
              const isSelected = selected?.key === week.key;
              const hasData = week.events > 0;
              const heightPercent = hasData
                ? Math.max(8, (week.items / maxItems) * 100)
                : 0;

              return (
                <button
                  key={week.key}
                  type="button"
                  onClick={() => toggleWeek(week)}
                  disabled={!hasData}
                  aria-pressed={isSelected}
                  aria-label={`Week of ${weekRangeLabel(week)}: ${week.items} item(s) recycled`}
                  className={`group flex min-w-[3.5rem] flex-1 flex-col items-center gap-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                    hasData ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      isSelected ? 'text-green-700' : 'text-gray-500'
                    }`}
                  >
                    {hasData ? week.items : ''}
                  </span>

                  <div className="flex h-40 w-full items-end">
                    <div
                      className={`w-full rounded-t-md transition-all ${
                        !hasData
                          ? 'h-0.5 bg-gray-200'
                          : isSelected
                            ? 'bg-green-600'
                            : selected
                              ? 'bg-green-200 group-hover:bg-green-400'
                              : 'bg-green-400 group-hover:bg-green-500'
                      }`}
                      style={hasData ? { height: `${heightPercent}%` } : undefined}
                    />
                  </div>

                  <span
                    className={`w-full text-center text-[10px] leading-tight sm:text-xs ${
                      isSelected
                        ? 'font-bold text-green-700'
                        : 'text-gray-500'
                    }`}
                  >
                    {shortDate(week.start)}
                    <br />– {shortDate(week.end)}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 text-center text-xs text-gray-400">
            Each bar covers one week, Monday to Sunday.
          </p>
        </section>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900">
            {selected
              ? `Recycled ${weekRangeLabel(selected)}`
              : 'All recycling activity'}
          </h3>

          {selected && (
            <button
              type="button"
              onClick={() => setSelectedWeek(null)}
              className="text-sm font-medium text-green-700 underline"
            >
              Show all
            </button>
          )}
        </div>

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
          {visibleHistory.map((record, index) => (
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