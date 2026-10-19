import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Plus, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';
import { marketApi } from '../api/api';
import { useSearchParams } from 'react-router-dom';
import ListingCard from './ListingCard';
import ListingForm from './ListingForm';
import ListingDetail from './ListingDetail';
import { CATEGORIES, STATUS } from './Marketconstants';

/**
 * Second-hand marketplace.
 *
 * Props
 *  - userId: current user
 *  - prefill: optional { name, material } — opens the "sell" form straight away
 *             (e.g. from the scan / reuse flow)
 *  - onShareToCommunity: optional (listing) => void — shows a
 *             "Share to community" button on listings
 */
export default function Marketplace({ userId, user, prefill = null, onShareToCommunity }) {
  const me = userId || 'demo-user';
  const [searchParams] = useSearchParams();

  const [view, setView] = useState(prefill ? 'form' : 'browse'); // browse | detail | form
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [filter, setFilter] = useState('all'); // all | free | mine

  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await marketApi.getListings();
      const data = Array.isArray(response.data) ? response.data : [];
      setListings(data);
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
    const listing = listings.find((item) => String(item.id) === String(listingId));
    if (listing) { setSelectedId(listing.id); setView('detail'); }
  }, [searchParams, listings]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();

    return listings
      .filter((l) => {
        const status = l.status || STATUS.AVAILABLE;
        const mine = l.sellerId === me;

        // Sold items only show up under "My listings".
        if (filter !== 'mine' && status === STATUS.SOLD) return false;
        if (filter === 'mine' && !mine) return false;
        if (filter === 'free' && !(l.isFree || Number(l.price) === 0)) {
          return false;
        }
        if (category !== 'All' && l.category !== category) return false;
        if (q) {
          const haystack = `${l.title} ${l.description || ''}`.toLowerCase();
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

  const selected = listings.find((l) => l.id === selectedId) || null;

  // ── Handlers ─────────────────────────────────────────────
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
      const exists = prev.some((l) => l.id === saved.id);
      return exists
        ? prev.map((l) => (l.id === saved.id ? saved : l))
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
      l.id === id ? { ...l, ...(updated || {}), status } : l
    )
  );
};
  const handleDelete = async (id) => {
  await marketApi.remove(id, me);
  setListings((prev) => prev.filter((l) => l.id !== id));
  setSelectedId(null);
  setView('browse');
};

  // ── Render ───────────────────────────────────────────────
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
        isOwner={selected.sellerId === me}
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
            <ShoppingBag className="h-6 w-6 text-green-700" />
            <h2 className="text-xl font-bold text-gray-900">Second-hand</h2>
          </div>
          <button
            type="button"
            onClick={startSelling}
            className="flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            <Plus size={18} />
            Sell
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search items"
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          {[
            ['all', 'All'],
            ['free', 'Free'],
            ['mine', 'My listings'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === value
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {['All', ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                category === c
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Listings */}
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading listings...
          </div>
        ) : error ? (
          <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
            <button
              type="button"
              onClick={loadListings}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium"
            >
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 py-12 text-center">
            <p className="font-medium text-gray-700">No items found</p>
            <p className="mt-1 text-sm text-gray-500">
              {filter === 'mine'
                ? "You haven't listed anything yet."
                : 'Try a different search, or list something yourself.'}
            </p>
            <button
              type="button"
              onClick={startSelling}
              className="mt-4 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
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

  return <div className="mx-auto w-full max-w-2xl p-4 sm:p-6">{content}</div>;
}