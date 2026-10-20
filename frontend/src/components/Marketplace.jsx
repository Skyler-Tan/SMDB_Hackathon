
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';
import { marketApi } from '../api/api';
import { useSearchParams } from 'react-router-dom';
import ListingCard from './ListingCard';
import ListingForm from './ListingForm';
import ListingDetail from './ListingDetail';

import { CATEGORIES, STATUS } from './Marketconstants';

export default function Marketplace({ userId, user, prefill = null, onShareToCommunity }) {
  const me = userId || 'demo-user';
  const [searchParams] = useSearchParams();

  const [view, setView] = useState(prefill ? 'form' : 'browse');
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);

  // Follow the app's actual theme class (.app-shell.dark-mode).
  const readDarkMode = () =>
    typeof document !== 'undefined' &&
    Boolean(document.querySelector('.app-shell')?.classList.contains('dark-mode'));
  const [isDarkMode, setIsDarkMode] = useState(readDarkMode);

  useEffect(() => {
    const appShell = document.querySelector('.app-shell');
    if (!appShell) return undefined;

    const syncTheme = () => setIsDarkMode(appShell.classList.contains('dark-mode'));
    syncTheme();
    const observer = new MutationObserver(syncTheme);
    observer.observe(appShell, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await marketApi.getListings();
      setListings(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load listings:', err);
      setError('Could not load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  useEffect(() => {
    const listingId = searchParams.get('listingId');
    if (!listingId || !listings.length) return;

    const listing = listings.find(
      (item) => String(item.id) === String(listingId)
    );

    if (listing) {
      setSelectedId(listing.id);
      setView('detail');
    }
  }, [searchParams, listings]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    return listings
      .filter((l) => {
        const status = l.status || STATUS.AVAILABLE;
        const mine = String(l.sellerId) === String(me);

        if (filter !== 'mine' && status === STATUS.SOLD) return false;
        if (filter === 'mine' && !mine) return false;
        if (filter === 'free' && !(l.isFree || Number(l.price) === 0)) return false;
        if (category !== 'All' && l.category !== category) return false;

        if (q) {
          const haystack = `${l.title || ''} ${l.description || ''}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }

        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );
  }, [listings, search, category, filter, me]);

  const selected =
    listings.find((l) => String(l.id) === String(selectedId)) || null;

  const openListing = (listing) => {
    setSelectedId(listing.id);
    setView('detail');
  };

  const startSelling = () => {
    setEditing(null);
    setView('form');
  };

  const startEditing = (listing) => {
    setEditing(listing);
    setView('form');
  };

  const closeForm = () => {
    setEditing(null);
    setView(selected && editing ? 'detail' : 'browse');
  };

  const handleSaved = (saved) => {
    setListings((prev) => {
      const exists = prev.some((l) => String(l.id) === String(saved.id));
      return exists
        ? prev.map((l) => (String(l.id) === String(saved.id) ? saved : l))
        : [saved, ...prev];
    });

    setEditing(null);
    setSelectedId(saved.id);
    setView('detail');
  };

  const handleStatusChange = async (id, status) => {
    const response = await marketApi.updateStatus(id, status, me);
    const updated = response?.data;

    setListings((prev) =>
      prev.map((l) =>
        String(l.id) === String(id)
          ? { ...l, ...(updated || {}), status }
          : l
      )
    );
  };

  const handleDelete = async (id) => {
    await marketApi.remove(id, me);
    setListings((prev) => prev.filter((l) => String(l.id) !== String(id)));
    setSelectedId(null);
    setView('browse');
  };

  const buttonBase = `inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
    isDarkMode
      ? 'border-gray-600 bg-gray-800 text-gray-100 hover:bg-gray-700'
      : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200'
  }`;

  let content;

  if (view === 'form') {
    content = (
      <ListingForm
        userId={me}
        user={user}
        initial={editing}
        prefill={editing ? null : prefill}
        onSaved={handleSaved}
        onCancel={closeForm}
      />
    );
  } else if (view === 'detail' && selected) {
    content = (
      <ListingDetail
        listing={selected}
        userId={me}
        isOwner={String(selected.sellerId) === String(me)}
        onBack={() => setView('browse')}
        onEdit={startEditing}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        onShareToCommunity={onShareToCommunity}
      />
    );
  } else {
    content = (
      <div className="marketplace-content space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-green-600" />
            <h2 className="text-xl font-bold text-gray-900">
              Second-hand
            </h2>
          </div>

          <button
            type="button"
            onClick={startSelling}
            className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
          >
            <Plus size={18} />
            Sell
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items"
            className={`w-full rounded-xl border py-2.5 pl-10 pr-3 outline-none transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-100 ${isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-100 placeholder:text-gray-400 focus:ring-green-900' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'}`}
          />
        </div>

        {/* Listing filters */}
        <div className="flex flex-wrap gap-2">
          {[
            ['all', 'All'],
            ['free', 'Free'],
            ['mine', 'My listings'],
          ].map(([value, label]) => {
            const active = filter === value;

            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(value)}
                className={`${buttonBase} ${
                  active
                    ? 'border-green-600 bg-green-600 text-white hover:bg-green-700'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700' : 'border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200')
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Category filters */}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {['All', ...CATEGORIES].map((c) => {
            const active = category === c;

            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'border-green-600 bg-green-600 text-white'
                    : (isDarkMode ? 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100')
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Listings */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading listings...
          </div>
        ) : error ? (
          <div className={`space-y-3 rounded-xl border p-4 text-sm ${isDarkMode ? 'border-red-900 bg-red-950 text-red-200' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={loadListings}
              className={`rounded-lg border px-3 py-1.5 font-medium transition-colors ${isDarkMode ? 'border-red-800 bg-red-900 text-red-100 hover:bg-red-800' : 'border-red-300 bg-white text-red-700 hover:bg-red-100'}`}
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className={`rounded-2xl border border-dashed py-12 text-center ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
            <p className="font-medium text-gray-700">
              No items found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'mine'
                ? "You haven't listed anything yet."
                : 'Try a different search, or list something yourself.'}
            </p>
            <button
              type="button"
              onClick={startSelling}
              className="mt-4 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
            >
              Sell an item
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {visible.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onOpen={openListing}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">
      {content}
    </div>
  );
}
