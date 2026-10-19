import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  RefreshCw,
  History as HistoryIcon,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Search,
  Package,
  Filter,
  XCircle,
} from 'lucide-react';
import { scanApi } from '../api/api';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All scans' },
  { value: 'RECYCLABLE', label: 'Recyclable' },
  { value: 'NOT_RECYCLABLE', label: 'Not recyclable' },
  { value: 'UNVERIFIED', label: 'Unverified' },
];

const normalizeStatus = (status) => {
  const normalized = String(status || 'UNVERIFIED')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'RECYCLABLE') return 'RECYCLABLE';
  if (normalized === 'NOT_RECYCLABLE') return 'NOT_RECYCLABLE';

  return 'UNVERIFIED';
};

const formatDate = (dateString) => {
  if (!dateString) return 'Date unavailable';

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return 'Date unavailable';

  return date.toLocaleString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatConfidence = (confidence) => {
  if (confidence === null || confidence === undefined || confidence === '') {
    return 'Unavailable';
  }

  const value = Number(confidence);

  if (!Number.isFinite(value)) return 'Unavailable';

  const percentage = value <= 1 ? value * 100 : value;

  return `${Math.min(Math.max(percentage, 0), 100).toFixed(1)}%`;
};

const formatBin = (bin) => {
  if (!bin || String(bin).toLowerCase() === 'unknown') {
    return 'Not determined';
  }

  return String(bin)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const getStatusStyle = (status) => {
  switch (normalizeStatus(status)) {
    case 'RECYCLABLE':
      return {
        label: 'Recyclable',
        className: 'bg-green-100 text-green-700',
        Icon: CheckCircle,
      };

    case 'NOT_RECYCLABLE':
      return {
        label: 'Not recyclable',
        className: 'bg-red-100 text-red-700',
        Icon: XCircle,
      };

    default:
      return {
        label: 'Unverified',
        className: 'bg-yellow-100 text-yellow-800',
        Icon: HelpCircle,
      };
  }
};

export default function History({ userId, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadHistory = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response = await scanApi.getScanHistory(userId);
        const result = response.data;

        const records = Array.isArray(result)
          ? result
          : Array.isArray(result?.data)
            ? result.data
            : Array.isArray(result?.items)
              ? result.items
              : [];

        const sortedRecords = [...records].sort((a, b) => {
          const dateA = new Date(a.scannedAt || 0).getTime();
          const dateB = new Date(b.scannedAt || 0).getTime();

          return dateB - dateA;
        });

        setHistory(sortedRecords);
      } catch (err) {
        console.error('Failed to load scan history:', err);

        const status = err.response?.status;
        const serverMessage =
          typeof err.response?.data === 'string'
            ? err.response.data
            : err.response?.data?.message ||
              err.response?.data?.error;

        if (!err.response) {
          setError(
            'Unable to connect to the server. Check your internet connection and API URL.'
          );
        } else {
          setError(
            `Failed to load history${status ? ` (HTTP ${status})` : ''}. ${
              serverMessage || err.message || 'Please try again.'
            }`
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const counts = useMemo(() => {
    return history.reduce(
      (result, item) => {
        const status = normalizeStatus(
          item.recyclingStatus ??
          (item.recyclable === true
            ? 'RECYCLABLE'
            : item.recyclable === false
              ? 'NOT_RECYCLABLE'
              : 'UNVERIFIED')
        );

        result.ALL += 1;
        result[status] += 1;

        return result;
      },
      {
        ALL: 0,
        RECYCLABLE: 0,
        NOT_RECYCLABLE: 0,
        UNVERIFIED: 0,
      }
    );
  }, [history]);

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase();

    return history.filter((item) => {
      const status = normalizeStatus(
        item.recyclingStatus ??
        (item.recyclable === true
          ? 'RECYCLABLE'
          : item.recyclable === false
            ? 'NOT_RECYCLABLE'
            : 'UNVERIFIED')
      );

      const matchesStatus =
        statusFilter === 'ALL' || status === statusFilter;

      const searchableText = [
        item.name,
        item.brand,
        item.material,
        item.size,
        item.container,
        item.bin,
        item.description,
        status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && searchableText.includes(query);
    });
  }, [history, search, statusFilter]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <RefreshCw
          className="animate-spin mx-auto mb-3 text-green-600"
          size={28}
        />
        <p className="text-gray-600">Loading scan history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HistoryIcon size={25} className="text-green-600" />
            <h2 className="text-2xl font-bold text-gray-900">
              Scan History
            </h2>
          </div>

          <p className="text-sm text-gray-500">
            View your scanned items and their recycling verification status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadHistory(true)}
          disabled={refreshing}
          className="shrink-0 p-3 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-50 transition"
          aria-label="Refresh history"
          title="Refresh history"
        >
          <RefreshCw
            size={19}
            className={refreshing ? 'animate-spin' : ''}
          />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total scans</p>
          <p className="text-2xl font-bold text-gray-900">{counts.ALL}</p>
        </div>

        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">Recyclable</p>
          <p className="text-2xl font-bold text-green-800">
            {counts.RECYCLABLE}
          </p>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">Not recyclable</p>
          <p className="text-2xl font-bold text-red-800">
            {counts.NOT_RECYCLABLE}
          </p>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-700">Unverified</p>
          <p className="text-2xl font-bold text-yellow-800">
            {counts.UNVERIFIED}
          </p>
        </div>
      </div>

      <div className="relative mb-4">
        <Search
          size={19}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search item, brand, material, or bin..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          aria-label="Search scan history"
        />
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-6">
        <Filter size={17} className="text-gray-500" />

        {STATUS_OPTIONS.map((option) => {
          const active = statusFilter === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatusFilter(option.value)}
              className={`rounded-full px-3 py-2 text-xs sm:text-sm font-medium transition ${
                active
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {option.label}
              <span className="ml-1 opacity-80">
                ({counts[option.value]})
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-5">
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="text-red-600 shrink-0" />

            <div>
              <p className="text-sm text-red-700">{error}</p>

              <button
                type="button"
                onClick={() => loadHistory()}
                className="text-sm text-red-700 underline mt-2"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {!error && filteredHistory.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <Package size={42} className="mx-auto text-gray-400 mb-3" />

          <p className="font-semibold text-gray-800">
            {history.length === 0 ? 'No scan history yet' : 'No matching scans'}
          </p>

          <p className="text-sm text-gray-500 mt-2">
            {history.length === 0
              ? 'Scan an item and it will appear here.'
              : 'Try another search term or select a different status filter.'}
          </p>

          {(search || statusFilter !== 'ALL') && history.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setStatusFilter('ALL');
              }}
              className="mt-4 text-sm font-medium text-green-700 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {!error && filteredHistory.length > 0 && (
        <div className="space-y-4">
          {filteredHistory.map((item, index) => {
            const status = getStatusStyle(
              item.recyclingStatus ??
              (item.recyclable === true
                ? 'RECYCLABLE'
                : item.recyclable === false
                  ? 'NOT_RECYCLABLE'
                  : 'UNVERIFIED')
            );

            const StatusIcon = status.Icon;

            return (
              <article
                key={
                  item.id ??
                  item._id ??
                  `${item.scannedAt ?? 'scan'}-${index}`
                }
                className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg break-words">
                      {item.name || 'Unknown item'}
                    </h3>

                    <p className="text-sm text-gray-600 mt-1">
                      {item.material || 'Material unknown'}
                    </p>

                    {item.brand && (
                      <p className="text-xs text-gray-500 mt-1">
                        Brand: {item.brand}
                      </p>
                    )}

                    {item.size && (
                      <p className="text-xs text-gray-500 mt-1">
                        Size: {item.size}
                      </p>
                    )}

                    {item.container && (
                      <p className="text-xs text-gray-500 mt-1">
                        Container: {item.container}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-gray-800">
                      {formatConfidence(item.confidence)}
                    </p>
                    <p className="text-xs text-gray-500">Confidence</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Calendar size={16} className="shrink-0" />
                  <span>{formatDate(item.scannedAt)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                  >
                    <StatusIcon size={14} />
                    {status.label}
                  </span>

                  {item.identificationConfirmed && (
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                      Identification confirmed
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">Recycling bin</p>
                    <p className="font-medium text-sm text-gray-800 break-words">
                      {formatBin(item.bin)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      Recycling result
                    </p>
                    <p className="font-medium text-sm text-gray-800">
                      {normalizeStatus(
                        item.recyclingStatus ??
                        (item.recyclable === true
                          ? 'RECYCLABLE'
                          : item.recyclable === false
                            ? 'NOT_RECYCLABLE'
                            : 'UNVERIFIED')
                      ) === 'RECYCLABLE'
                        ? 'Yes'
                        : normalizeStatus(
                            item.recyclingStatus ??
                            (item.recyclable === true
                              ? 'RECYCLABLE'
                              : item.recyclable === false
                                ? 'NOT_RECYCLABLE'
                                : 'UNVERIFIED')
                          ) === 'NOT_RECYCLABLE'
                          ? 'No'
                          : 'Not verified'}
                    </p>
                  </div>
                </div>

                {item.description && (
                  <p className="text-sm leading-relaxed text-gray-600 mt-4 whitespace-pre-line">
                    {item.description}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!error && history.length > 0 && (
        <p className="text-center text-xs text-gray-500 mt-6">
          Showing {filteredHistory.length} of {history.length} scans
        </p>
      )}
    </div>
  );
}