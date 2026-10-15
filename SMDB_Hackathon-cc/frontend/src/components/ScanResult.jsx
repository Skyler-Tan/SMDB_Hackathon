import { useEffect, useState } from 'react';
import {
  Check,
  X,
  RefreshCw,
  Recycle,
  AlertCircle,
  Loader2,
  Pencil,
  ArrowRight,
  Package,
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
  const [checking, setChecking] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [correctedName, setCorrectedName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Items already confirmed do not need another confirmation.
  const [reviewed, setReviewed] = useState(
    Boolean(result?.identificationConfirmed)
  );

  const resultId = result?.itemId ?? result?.id ?? null;
  const itemId = item?.itemId ?? item?.id ?? null;

  // Reset the component when a different item is selected.
  useEffect(() => {
    setItem(result || {});
    setBusy(false);
    setChecking(false);
    setShowEditForm(false);
    setCorrectedName(result?.name || result?.itemName || '');
    setErrorMessage('');
    setReviewed(Boolean(result?.identificationConfirmed));
  }, [resultId]);

  // Keep item information in sync when the parent updates the result.
  useEffect(() => {
    if (!result) return;

    setItem((previous) => ({
      ...previous,
      ...result,
    }));

    if (result.identificationConfirmed === true) {
      setReviewed(true);
    }
  }, [result]);

  const cleanNotes = (text) => {
    if (typeof text !== 'string') return '';

    return text
      .replace(/\s*Sources:\s*[\s\S]*$/i, '')
      .trim();
  };

  const status = String(
    item?.recyclingStatus ||
      (item?.recyclable === true
        ? 'RECYCLABLE'
        : item?.recyclable === false
          ? 'NOT_RECYCLABLE'
          : 'UNVERIFIED')
  ).toUpperCase();

  const isRecyclable =
    status === 'RECYCLABLE' ||
    status === 'RECYCLABLE_YES';

  const isNotRecyclable =
    status === 'NOT_RECYCLABLE' ||
    status === 'NON_RECYCLABLE' ||
    status === 'RECYCLABLE_NO';

  const isUnverified = !isRecyclable && !isNotRecyclable;

  const notes = cleanNotes(
    item?.notes ||
      item?.description ||
      item?.recyclingNotes ||
      ''
  );

  // Confirm the detected item without changing its name.
  const handleConfirm = async () => {
    if (!itemId) {
      setErrorMessage(
        'Item ID is missing. Please scan the item again.'
      );
      return;
    }

    setBusy(true);
    setErrorMessage('');

    try {
      const response = await scanApi.confirmIdentification(itemId);
      const updatedItem = response?.data;

      const nextItem = {
        ...item,
        ...(updatedItem || {}),
        identificationConfirmed: true,
      };

      setItem(nextItem);
      setReviewed(true);
      setShowEditForm(false);

      if (onConfirm) {
        onConfirm(nextItem);
      }
    } catch (error) {
      console.error('Failed to confirm identification:', error);

      setErrorMessage(
        error?.response?.data?.message ||
          'Could not confirm this item. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Save the corrected item name and confirm the identification.
  const handleEditSubmit = async (event) => {
    event.preventDefault();

    const name = correctedName.trim();

    if (!name) {
      setErrorMessage('Please enter the correct item name.');
      return;
    }

    if (!itemId) {
      setErrorMessage(
        'Item ID is missing. Please scan the item again.'
      );
      return;
    }

    setBusy(true);
    setErrorMessage('');

    try {
      const response = await scanApi.correctItemName(itemId, name);
      const updatedItem = response?.data;

      const nextItem = {
        ...item,
        ...(updatedItem || {}),
        name:
          updatedItem?.name ||
          updatedItem?.itemName ||
          name,
        identificationConfirmed: true,
      };

      setItem(nextItem);
      setReviewed(true);
      setShowEditForm(false);
      setCorrectedName('');

      if (onCorrect) {
        onCorrect(name);
      }

      if (onConfirm) {
        onConfirm(nextItem);
      }
    } catch (error) {
      console.error('Failed to correct item:', error);

      setErrorMessage(
        error?.response?.data?.message ||
          'Could not update this item. Please try again.'
      );
    } finally {
      setBusy(false);
    }
  };

  // Retry loading recycling information for an existing scanned item.
  const handleRetry = async () => {
    if (!itemId) {
      setErrorMessage(
        'Item ID is missing. Recycling information cannot be checked.'
      );
      return;
    }

    setChecking(true);
    setErrorMessage('');

    try {
      const response = await scanApi.loadRecycling(itemId);
      const updatedItem = response?.data;

      if (updatedItem) {
        const nextItem = {
          ...item,
          ...updatedItem,
          identificationConfirmed: true,
        };

        setItem(nextItem);

        if (onConfirm) {
          onConfirm(nextItem);
        }
      }
    } catch (error) {
      console.error('Failed to load recycling information:', error);

      setErrorMessage(
        error?.response?.data?.message ||
          'Could not retrieve recycling information. Please try again.'
      );
    } finally {
      setChecking(false);
    }
  };

  const handleRecycleClick = () => {
    if (onRecycle) {
      onRecycle();
    }
  };

  const handleReuseClick = () => {
    if (onReuse) {
      onReuse(item);
    }
  };

  if (!result) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      {/* Item details */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100">
            <Package className="h-6 w-6 text-green-700" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-gray-900">
              {item.name || item.itemName || 'Unknown item'}
            </h2>

            {item.brand && (
              <p className="mt-1 text-sm text-gray-600">
                Brand: {item.brand}
              </p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              {item.material && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {item.material}
                </span>
              )}

              {item.size && (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  {item.size}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

          <p className="flex-1">{errorMessage}</p>

          <button
            type="button"
            onClick={() => setErrorMessage('')}
            className="shrink-0"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Identification confirmation */}
      {!reviewed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />

            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Confirm item identification
              </h3>

              <p className="mt-1 text-sm text-gray-600">
                Check whether the detected item is correct before continuing.
                If it is incorrect, edit the item name first.
              </p>

              {!showEditForm ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}

                    Confirm
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(true);
                      setCorrectedName(
                        item.name || item.itemName || ''
                      );
                      setErrorMessage('');
                    }}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleEditSubmit}
                  className="mt-4 space-y-3"
                >
                  <label
                    htmlFor="corrected-item-name"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Correct item name
                  </label>

                  <input
                    id="corrected-item-name"
                    type="text"
                    value={correctedName}
                    onChange={(event) =>
                      setCorrectedName(event.target.value)
                    }
                    placeholder="e.g. plastic water bottle"
                    disabled={busy}
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                  <p className="text-xs text-gray-500">
                    Saving your correction will confirm the item and update
                    its identification through the existing backend API.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={busy || !correctedName.trim()}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}

                      Save and Confirm
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setCorrectedName(
                          item.name || item.itemName || ''
                        );
                        setErrorMessage('');
                      }}
                      disabled={busy}
                      className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recycling information */}
      {reviewed && (
        <div className="space-y-4">
          {checking ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />

              <h3 className="font-semibold text-gray-900">
                Checking recycling information...
              </h3>

              <p className="text-sm text-gray-600">
                Please wait while we retrieve the information.
              </p>
            </div>
          ) : (
            <div
              className={`rounded-2xl border p-5 ${
                isRecyclable
                  ? 'border-green-200 bg-green-50'
                  : isNotRecyclable
                    ? 'border-red-200 bg-red-50'
                    : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {isRecyclable ? (
                  <Check className="mt-0.5 h-6 w-6 shrink-0 text-green-700" />
                ) : isNotRecyclable ? (
                  <X className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
                ) : (
                  <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600" />
                )}

                <div className="min-w-0 flex-1">
                  <h3
                    className={`font-bold ${
                      isRecyclable
                        ? 'text-green-800'
                        : isNotRecyclable
                          ? 'text-red-800'
                          : 'text-amber-800'
                    }`}
                  >
                    {isRecyclable
                      ? 'Recyclable'
                      : isNotRecyclable
                        ? 'Not recyclable'
                        : 'Recycling status unverified'}
                  </h3>

                  <p className="mt-1 text-sm text-gray-700">
                    {isRecyclable
                      ? 'This item is marked as recyclable.'
                      : isNotRecyclable
                        ? 'This item is marked as not recyclable through the available recycling process.'
                        : 'We could not confirm the recycling status. Check local recycling guidance before disposing of this item.'}
                  </p>

                  {item.bin &&
                    String(item.bin).toLowerCase() !== 'unknown' && (
                      <p className="mt-3 text-sm text-gray-800">
                        <span className="font-semibold">
                          Recommended bin:
                        </span>{' '}
                        {item.bin}
                      </p>
                    )}

                  {notes && (
                    <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-700">
                      {notes}
                    </div>
                  )}

                  {isUnverified && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={checking}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 font-medium text-amber-800 transition hover:bg-amber-100 disabled:opacity-60"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Retry recycling check
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Available actions */}
          {!checking && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleRecycleClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                <Recycle className="h-5 w-5" />
                Recycle
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleReuseClick}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-green-600 bg-white px-5 py-3 font-semibold text-green-700 transition hover:bg-green-50"
              >
                <RefreshCw className="h-5 w-5" />
                Find reuse ideas
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}