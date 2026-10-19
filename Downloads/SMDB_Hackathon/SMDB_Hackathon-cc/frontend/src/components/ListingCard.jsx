import { MapPin, Package } from 'lucide-react';
import { formatPrice, timeAgo, STATUS } from './Marketconstants';

export default function ListingCard({ listing, onOpen }) {
  const photo = listing.photos?.[0];
  const status = listing.status || STATUS.AVAILABLE;
  const free = formatPrice(listing) === 'Free';

  return (
    <button
      type="button"
      onClick={() => onOpen(listing)}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-md"
    >
      <div className="relative aspect-square w-full bg-gray-100">
        {photo ? (
          <img
            src={photo}
            alt={listing.title}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <Package size={40} />
          </div>
        )}

        {status !== STATUS.AVAILABLE && (
          <span
            className={`absolute left-2 top-2 rounded-full px-2.5 py-1 text-xs font-semibold ${
              status === STATUS.SOLD
                ? 'bg-gray-800 text-white'
                : 'bg-amber-500 text-white'
            }`}
          >
            {status === STATUS.SOLD ? 'Sold' : 'Reserved'}
          </span>
        )}
      </div>

      <div className="space-y-1 p-3">
        <p
          className={`text-base font-bold ${
            free ? 'text-green-700' : 'text-gray-900'
          }`}
        >
          {formatPrice(listing)}
        </p>
        <p className="truncate text-sm font-medium text-gray-800">
          {listing.title}
        </p>
        <p className="text-xs text-gray-500">{listing.condition}</p>
        <div className="flex items-center justify-between gap-2 text-xs text-gray-400">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{listing.location || '—'}</span>
          </span>
          <span className="shrink-0">{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </button>
  );
}