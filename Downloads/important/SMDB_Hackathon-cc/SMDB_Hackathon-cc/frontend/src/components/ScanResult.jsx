
import { useEffect, useState } from 'react';
import {
  Check,
  X,
  RefreshCw,
  Recycle,
  AlertCircle,
} from 'lucide-react';
import { scanApi } from '../api/api';

export default function ScanResult({
  result,
  onConfirm,
  onCorrect,
  onRecycle,
  onReuse,
}) {
  const [item, setItem] = useState(result || {});
  const [busy, setBusy] = useState(false);
  const [showCorrectInput, setShowCorrectInput] = useState(false);
  const [correctedName, setCorrectedName] = useState('');
  const [correctError, setCorrectError] = useState('');

  // Keep the displayed result synchronized with the parent.
  useEffect(() => {
    setItem(result || {});
  }, [result]);

  if (!item) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <p className="text-gray-600">No scan result available.</p>
      </div>
    );
  }

  const {
    itemId,
    name,
    brand,
    size,
    material,
    bin,
    notes,
    confidence,
  } = item;

  const confirmed = item.identificationConfirmed === true;

  const recyclingStatus = String(
    item.recyclingStatus ??
      (item.recyclable === true
        ? 'RECYCLABLE'
        : 'UNVERIFIED')
  ).toUpperCase();

  const isRecyclable = recyclingStatus === 'RECYCLABLE';
  const isNotRecyclable = recyclingStatus === 'NOT_RECYCLABLE';
  const isUnverified =
    !isRecyclable && !isNotRecyclable;

  const handleConfirm = async () => {
    if (!itemId || busy) return;

    setBusy(true);

    try {
      const response = await scanApi.confirmIdentification(itemId);
      const updatedItem = response.data || {};

      setItem((previous) => ({
        ...previous,
        ...updatedItem,
        identificationConfirmed: true,
      }));

      onConfirm?.({
        ...item,
        ...updatedItem,
        identificationConfirmed: true,
      });
    } catch (error) {
      console.error('Failed to confirm identification:', error);
      alert('Failed to confirm the item. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleCorrectSubmit = async () => {
    const trimmedName = correctedName.trim();

    if (!trimmedName || busy) return;

    if (!itemId) {
      setCorrectError('Missing item ID. Please scan the item again.');
      return;
    }

    setBusy(true);
    setCorrectError('');

    try {
      const response = await scanApi.correctItemName(
        itemId,
        trimmedName
      );

      const updatedItem = response.data || {};

      setItem((previous) => ({
        ...previous,
        ...updatedItem,
        name: updatedItem.name || trimmedName,
      }));

      setShowCorrectInput(false);
      setCorrectedName('');

      onCorrect?.(trimmedName, updatedItem);
    } catch (error) {
      console.error('Failed to correct item name:', error);
      setCorrectError(
        error.response?.data?.message ||
          'Failed to update the item. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  const confidenceValue =
    confidence == null
      ? null
      : confidence <= 1
        ? Math.round(confidence * 100)
        : Math.round(confidence);

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h3 className="text-xl font-bold mb-5 text-gray-900">
        Scan Result
      </h3>

      <div className="space-y-5">
        {/* Identified item */}
        <section>
          <p className="text-sm text-gray-500">
            Identified as:
          </p>

          <h4 className="text-2xl font-semibold text-gray-900 mt-1">
            {name || 'Unknown item'}
          </h4>

          {brand && (
            <p className="text-sm text-gray-600 mt-1">
              Brand: {brand}
            </p>
          )}

          {size && (
            <p className="text-sm text-gray-600">
              Size: {size}
            </p>
          )}

          {material && (
            <p className="text-sm text-gray-600">
              Material: {material}
            </p>
          )}

          {confidenceValue != null && (
            <p className="text-xs text-gray-400 mt-2">
              Confidence: {confidenceValue}%
            </p>
          )}
        </section>

        {/* Identification confirmation */}
        {!confirmed && (
          <section className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800 mb-3">
              Please check whether the identified item is correct.
            </p>

            {!showCorrectInput ? (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-3 rounded-lg font-medium transition"
                >
                  <Check size={18} />
                  {busy ? 'Saving...' : 'Confirm'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowCorrectInput(true)}
                  disabled={busy}
                  className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-400 text-white py-3 px-3 rounded-lg font-medium transition"
                >
                  <RefreshCw size={18} />
                  Correct
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label
                  htmlFor="corrected-item-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Enter the correct item name
                </label>

                <input
                  id="corrected-item-name"
                  type="text"
                  value={correctedName}
                  onChange={(event) =>
                    setCorrectedName(event.target.value)
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleCorrectSubmit();
                    }
                  }}
                  placeholder="e.g. paper receipt"
                  maxLength={150}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />

                {correctError && (
                  <p className="text-sm text-red-600">
                    {correctError}
                  </p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCorrectSubmit}
                    disabled={busy || !correctedName.trim()}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-3 rounded-lg text-sm font-medium"
                  >
                    {busy ? 'Saving...' : 'Save correction'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowCorrectInput(false);
                      setCorrectedName('');
                      setCorrectError('');
                    }}
                    disabled={busy}
                    className="bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Recycling status */}
        {isRecyclable && (
          <section className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Check className="text-green-600" size={22} />
              <h4 className="font-semibold text-green-800">
                Recyclable
              </h4>
            </div>

            {bin && bin.toLowerCase() !== 'unknown' && (
              <p className="text-sm text-green-700">
                Recommended bin: {bin}
              </p>
            )}

            {notes && (
              <p className="text-sm text-green-700 mt-2 whitespace-pre-line">
                {notes}
              </p>
            )}
          </section>
        )}

        {isNotRecyclable && (
          <section className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <X className="text-red-600" size={22} />
              <h4 className="font-semibold text-red-800">
                Not Recyclable
              </h4>
            </div>

            {notes && (
              <p className="text-sm text-red-700 whitespace-pre-line">
                {notes}
              </p>
            )}
          </section>
        )}

        {isUnverified && (
          <section className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle
                className="text-amber-600 shrink-0"
                size={22}
              />
              <h4 className="font-semibold text-amber-800">
                Recycling Status Unverified
              </h4>
            </div>

            <p className="text-sm text-amber-800">
              We couldn't confirm whether this item is accepted for
              recycling. Check your local recycling guidelines before
              placing it in a recycling bin.
            </p>

            {notes && (
              <p className="text-sm text-amber-700 mt-2 whitespace-pre-line">
                {notes}
              </p>
            )}
          </section>
        )}

        {/* Recycle and reuse actions */}
        <section className="flex gap-3">
          <button
            type="button"
            onClick={onRecycle}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition"
          >
            <Recycle size={20} />
            Recycle
          </button>

          <button
            type="button"
            onClick={onReuse}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition"
          >
            Reuse
          </button>
        </section>
      </div>
    </div>
  );
}
