export const CATEGORIES = [
  'Furniture',
  'Electronics',
  'Clothing',
  'Books',
  'Kitchen',
  'Toys & Kids',
  'Sports',
  'Home decor',
  'Other',
];

export const CONDITIONS = ['Like new', 'Good', 'Fair', 'For parts / repair'];

export const STATUS = {
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  SOLD: 'SOLD',
};

export const REPORT_REASONS = [
  'Spam or scam',
  'Prohibited item',
  'Wrong category',
  'Other',
];

export const formatPrice = (listing) => {
  if (!listing) return '';
  if (listing.isFree || Number(listing.price) === 0) return 'Free';
  return `${Number(listing.price || 0)} EcoPoints`;
};

export const timeAgo = (iso) => {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diffMs)) return '';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};