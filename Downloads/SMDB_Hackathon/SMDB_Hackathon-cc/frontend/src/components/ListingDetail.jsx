import { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Package,
  Phone,
  Pencil,
  Trash2,
  Share2,
  Flag,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { marketApi } from '../api/api';
import {
  formatPrice,
  timeAgo,
  STATUS,
  REPORT_REASONS,
} from './Marketconstants';

export default function ListingDetail({
  listing,
  userId,
  isOwner,
  onBack,
  onEdit,
  onStatusChange,
  onDelete,
  onShareToCommunity, // optional: (listing) => void
}) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showContact, setShowContact] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [reported, setReported] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const photos = listing.photos || [];
  const status = listing.status || STATUS.AVAILABLE;
  const free = formatPrice(listing) === 'Free';
  const phoneDigits = String(listing.contact || '').replace(/[^\d+]/g, '');

  const changeStatus = async (next) => {
    setBusy(true);
    setError('');
    try {
      await onStatusChange(listing.id, next);
    } catch (err) {
      console.error('Status update failed:', err);
      setError('Could not update the status. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? This cannot be undone.')) return;
    setBusy(true);
    setError('');
    try {
      await onDelete(listing.id);
    } catch (err) {
      console.error('Delete failed:', err);
      setError('Could not delete the listing. Please try again.');
      setBusy(false);
    }
  };

  const submitReport = async () => {
    setBusy(true);
    setError('');
    try {
      await marketApi.report(listing.id, {
        reason,
        userId: userId || 'demo-user',
      });
      setReported(true);
      setShowReport(false);
    } catch (err) {
      console.error('Report failed:', err);
      setError('Could not send your report. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        Back to listings
      </button>

      {/* Gallery */}
      <div>
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100">
          {photos.length > 0 ? (
            <img
              src={photos[photoIndex]}
              alt={listing.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-300">
              <Package size={56} />
            </div>
          )}
          {status !== STATUS.AVAILABLE && (
            <span
              className={`absolute left-3 top-3 rounded-full px-3 py-1 text-sm font-semibold ${
                status === STATUS.SOLD
                  ? 'bg-gray-800 text-white'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {status === STATUS.SOLD ? 'Sold' : 'Reserved'}
            </span>
          )}
        </div>

        {photos.length > 1 && (
          <div className="mt-2 flex gap-2">
            {photos.map((src, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setPhotoIndex(index)}
                className={`relative h-16 w-16 overflow-hidden rounded-lg border-2 ${
                  index === photoIndex
                    ? 'border-green-600'
                    : 'border-transparent'
                }`}
                aria-label={`Show photo ${index + 1}`}
              >
                <img
                  src={src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="space-y-2">
        <p
          className={`text-2xl font-bold ${
            free ? 'text-green-700' : 'text-gray-900'
          }`}
        >
          {formatPrice(listing)}
        </p>
        <h2 className="text-xl font-semibold text-gray-900">{listing.title}</h2>

        <div className="flex flex-wrap gap-2">
          {listing.category && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {listing.category}
            </span>
          )}
          {listing.condition && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-800">
              {listing.condition}
            </span>
          )}
        </div>

        <p className="flex items-center gap-1 text-sm text-gray-500">
          <MapPin size={14} />
          {listing.location || 'Location not provided'}
          {listing.createdAt && <span>· {timeAgo(listing.createdAt)}</span>}
        </p>

        {listing.description && (
          <p className="whitespace-pre-line pt-2 text-sm leading-relaxed text-gray-700">
            {listing.description}
          </p>
        )}

        <p className="pt-2 text-xs text-gray-400">
          Listed by {listing.sellerName || listing.sellerId || 'a neighbour'}
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Buyer actions */}
      {!isOwner && (
        <div className="space-y-3">
          {!showContact ? (
            <button
              type="button"
              onClick={() => setShowContact(true)}
              disabled={status === STATUS.SOLD}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:bg-gray-400"
            >
              <Phone size={18} />
              {status === STATUS.SOLD ? 'Item sold' : 'Contact seller'}
            </button>
          ) : (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-gray-600">Contact the seller on</p>
              <a
                href={phoneDigits ? `tel:${phoneDigits}` : undefined}
                className="text-lg font-bold text-green-800"
              >
                {listing.contact}
              </a>
              <p className="mt-2 text-xs text-gray-500">
                Meet in a public place and check the item before paying.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {onShareToCommunity && (
              <button
                type="button"
                onClick={() => onShareToCommunity(listing)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-green-600 bg-white px-4 py-2.5 font-medium text-green-700 transition hover:bg-green-50"
              >
                <Share2 size={16} />
                Share to community
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowReport((v) => !v)}
              disabled={reported}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-60"
            >
              <Flag size={16} />
              {reported ? 'Reported' : 'Report'}
            </button>
          </div>

          {showReport && (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <label className="block text-sm font-medium text-gray-700">
                What's wrong with this listing?
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5"
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={submitReport}
                disabled={busy}
                className="w-full rounded-xl bg-gray-800 px-4 py-2.5 font-medium text-white transition hover:bg-gray-900 disabled:opacity-60"
              >
                Send report
              </button>
            </div>
          )}
        </div>
      )}

      {/* Owner actions */}
      {isOwner && (
        <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-700">Manage listing</p>

          <div className="grid grid-cols-3 gap-2">
            {[
              [STATUS.AVAILABLE, 'Available'],
              [STATUS.RESERVED, 'Reserved'],
              [STATUS.SOLD, 'Sold'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changeStatus(value)}
                disabled={busy || status === value}
                className={`flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-sm font-medium transition ${
                  status === value
                    ? 'bg-green-600 text-white'
                    : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {status === value && <CheckCircle size={14} />}
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onEdit(listing)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-100"
            >
              <Pencil size={16} />
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2.5 font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>

          {onShareToCommunity && (
            <button
              type="button"
              onClick={() => onShareToCommunity(listing)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-green-600 bg-white px-4 py-2.5 font-medium text-green-700 transition hover:bg-green-50"
            >
              <Share2 size={16} />
              Share to community
            </button>
          )}
        </div>
      )}
    </div>
  );
}