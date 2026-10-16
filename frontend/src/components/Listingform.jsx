import { useState } from 'react';
import { ArrowLeft, ImagePlus, X, Loader2, AlertCircle } from 'lucide-react';
import { marketApi } from '../api/api';
import { CATEGORIES, CONDITIONS } from './marketConstants';

const MAX_PHOTOS = 4;

// Shrinks a photo before upload so the request body stays small.
const resizeImage = (file, max = 1024) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

const inputClass =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:opacity-60';

export default function ListingForm({
  userId,
  user,
  initial = null, // existing listing when editing
  prefill = null, // { name, material } coming from a scan / reuse flow
  onSaved,
  onCancel,
}) {
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title ?? prefill?.name ?? '');
  const [description, setDescription] = useState(
    initial?.description ??
      (prefill?.material ? `Material: ${prefill.material}.` : '')
  );
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES[0]);
  const [condition, setCondition] = useState(
    initial?.condition ?? CONDITIONS[1]
  );
  const [isFree, setIsFree] = useState(Boolean(initial?.isFree));
  const [price, setPrice] = useState(
    initial && !initial.isFree ? String(initial.price ?? '') : ''
  );
  const [location, setLocation] = useState(initial?.location ?? '');
  const [contact, setContact] = useState(initial?.contact ?? '');
  const [photos, setPhotos] = useState(initial?.photos ?? []);

  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState('');

  const handlePhotos = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;

    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) {
      setError(`You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }

    setPhotoBusy(true);
    setError('');
    try {
      const resized = await Promise.all(
        files.slice(0, room).map((file) => resizeImage(file))
      );
      setPhotos((prev) => [...prev, ...resized]);
    } catch (err) {
      console.error('Photo error:', err);
      setError('Could not read one of the photos. Please try another.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = (index) =>
    setPhotos((prev) => prev.filter((_, i) => i !== index));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!title.trim()) return setError('Please enter a title.');
    if (!isFree) {
      const value = Number(price);
      if (!price || Number.isNaN(value) || value <= 0) {
        return setError('Enter a price above 0, or tick "Give away for free".');
      }
    }
    if (!location.trim()) return setError('Please enter a pickup location.');
    if (!contact.trim()) {
      return setError('Please add a phone number or other way to contact you.');
    }
    
    const sellerName =
      user?.name ||
     user?.username ||
     user?.email?.split('@')[0] ||
      userId ||
     'demo-user';

    const payload = {
      title: title.trim(),
      description: description.trim(),
      category,
      condition,
      isFree,
      price: isFree ? 0 : Number(price),
      location: location.trim(),
      contact: contact.trim(),
      photos,
      sellerId: userId || 'demo-user',
    };

    setBusy(true);
    try {
      const response = isEdit
        ? await marketApi.update(initial.id, payload)
        : await marketApi.create(payload);
      onSaved(response.data);
    } catch (err) {
      console.error('Save listing failed:', err);
      const msg = err.response?.data?.message;
      setError(
        typeof msg === 'string'
          ? msg
          : 'Could not save your listing. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100"
          aria-label="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Edit listing' : 'Sell or give away an item'}
        </h2>
      </div>

      {/* Photos */}
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700">
          Photos ({photos.length}/{MAX_PHOTOS})
        </p>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((src, index) => (
            <div
              key={index}
              className="relative aspect-square overflow-hidden rounded-xl bg-gray-100"
            >
              <img
                src={src}
                alt={`Photo ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                aria-label="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 transition hover:border-green-500 hover:text-green-600">
              {photoBusy ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <ImagePlus size={22} />
              )}
              <span className="text-xs">Add</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotos}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Wooden study desk"
          maxLength={80}
          disabled={busy}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={busy}
            className={inputClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Condition
          </label>
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            disabled={busy}
            className={inputClass}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Price (RM)
        </label>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={isFree ? '' : price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={isFree ? 'Free' : '0.00'}
          disabled={busy || isFree}
          className={inputClass}
        />
        <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => setIsFree(e.target.checked)}
            disabled={busy}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          Give away for free
        </label>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          maxLength={1000}
          placeholder="Size, age, any defects, why you're selling..."
          disabled={busy}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Pickup location
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Petaling Jaya, Selangor"
          disabled={busy}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Contact (phone / WhatsApp)
        </label>
        <input
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="e.g. 012-345 6789"
          disabled={busy}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-gray-500">
          Only shown when someone taps "Contact seller".
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy || photoBusy}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-medium text-white transition hover:bg-green-700 disabled:bg-gray-400"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {busy ? 'Saving...' : isEdit ? 'Save changes' : 'Post listing'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl bg-gray-200 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}