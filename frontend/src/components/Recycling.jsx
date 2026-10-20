<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { Droplet, Factory, CheckCircle, Plus, Minus } from 'lucide-react';
import { scanApi, recycleApi } from '../api/api';

export default function Recycling({ itemId, userId, onClose }) {
=======

import { useState, useEffect } from 'react';
import {
  Droplet,
  Factory,
  CheckCircle,
  Plus,
  Minus,
  Recycle as RecycleIcon,
  Award,
} from 'lucide-react';
import { scanApi, recycleApi } from '../api/api';

export default function Recycling({
                                    itemId,
                                    userId,
                                    onClose,
                                    onRecycled,
                                  }) {
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recycling, setRecycling] = useState(false);
  const [recycleResult, setRecycleResult] = useState(null);
<<<<<<< HEAD
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRecyclingInfo();
  }, [itemId]);

  const loadRecyclingInfo = async () => {
  try {
    console.log('Loading recycling info for item:', itemId);
    console.log('Calling POST /api/recycling/' + itemId);

    const response = await scanApi.loadRecycling(itemId);

    console.log('Recycling API response:', response.data);
    setData(response.data);
  } catch (err) {
    console.error('Failed to load recycling info:', err);
    console.error('Response status:', err.response?.status);
    console.error('Response data:', err.response?.data);
  } finally {
    setLoading(false);
  }
};

  const handleConfirmRecycle = async () => {
    setRecycling(true);
    setError(null);
    try {
      const response = await recycleApi.recycle({
        itemId,
        userId: userId || 'demo-user',
        quantity,
      });
      setRecycleResult(response.data);
    } catch (err) {
      console.error('Recycle failed:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Failed to record recycling. Please try again.';
      setError(typeof msg === 'string' ? msg : 'Failed to record recycling. Please try again.');
=======
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadRecyclingInfo() {
      setLoading(true);
      setError('');

      if (!itemId) {
        setError('Item ID is missing. Please scan or select an item again.');
        setLoading(false);
        return;
      }

      try {
        const response = await scanApi.loadRecycling(itemId);

        if (active) {
          setData(response.data);
        }
      } catch (err) {
        console.error('Failed to load recycling information:', err);

        if (active) {
          setError(
              err.response?.data?.message ||
              'Could not load recycling information. Check your backend connection and try again.'
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecyclingInfo();

    return () => {
      active = false;
    };
  }, [itemId]);

  const itemName = data?.name || 'Recyclable item';
  const waterLiters = Number(data?.waterLiters ?? 0);
  const co2Kg = Number(data?.co2Kg ?? 0);
  const materialGrams = Number(data?.materialGrams ?? 0);
  const rewardPoints = Number(data?.rewardPoints ?? 0);
  const recyclable = data?.recyclable;

  const pointsToEarn = rewardPoints * quantity;

  const handleConfirmRecycle = async () => {
    if (recycling) return;

    if (!itemId) {
      setError('Missing item ID. Please scan the item again.');
      return;
    }

    if (!userId) {
      setError(
          'User ID is missing. Please log in again before recycling.'
      );
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError('Quantity must be at least 1.');
      return;
    }

    if (recyclable === false) {
      setError(
          'This item is not marked as recyclable. Recycling was not submitted.'
      );
      return;
    }

    setRecycling(true);
    setError('');

    try {
      const response = await recycleApi.recycle({
        itemId,
        userId,
        quantity,
      });

      const result = response?.data;

      if (!result || typeof result !== 'object') {
        throw new Error(
            'The server returned an invalid recycling response.'
        );
      }

      // Use the actual reward returned by the backend.
      // The calculated preview is only a fallback for older APIs.
      const pointsEarned = Number(
          result.pointsThisTurn ?? pointsToEarn
      );

      const normalizedResult = {
        ...result,
        itemName: result.itemName || itemName,
        pointsThisTurn: pointsEarned,
        waterLitersThisTurn: Number(
            result.waterLitersThisTurn ??
            waterLiters * quantity
        ),
        co2KgThisTurn: Number(
            result.co2KgThisTurn ?? co2Kg * quantity
        ),
        newBadges: Array.isArray(result.newBadges)
            ? result.newBadges
            : [],
      };

      setRecycleResult(normalizedResult);

      // Refresh parent statistics only after success.
      if (onRecycled) {
        try {
          await onRecycled(normalizedResult);
        } catch (refreshError) {
          // Recycling succeeded; do not show it as failed
          // just because refreshing the profile failed.
          console.error(
              'Could not refresh profile statistics:',
              refreshError
          );
        }
      }
    } catch (err) {
      console.error('Recycle request failed:', {
        message: err.message,
        status: err.response?.status,
        response: err.response?.data,
        itemId,
        userId,
      });

      const serverMessage =
          err.response?.data?.message ||
          (typeof err.response?.data === 'string'
              ? err.response.data
              : null);

      let message =
          serverMessage ||
          err.message ||
          'Failed to record recycling. Please try again.';

      if (!err.response) {
        message =
            'Cannot reach the recycling server. Check that your backend is running and your API URL is correct.';
      } else if (err.response.status === 400) {
        message =
            serverMessage ||
            'Invalid recycling request. Check the item ID, user ID, and quantity.';
      } else if (err.response.status === 401 ||
          err.response.status === 403) {
        message =
            'You are not authorized to recycle this item. Please log in again.';
      } else if (err.response.status === 404) {
        message =
            'The recycling endpoint or item was not found. Check your API URL and backend route.';
      }

      setError(message);
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
    } finally {
      setRecycling(false);
    }
  };

  if (loading) {
    return (
<<<<<<< HEAD
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">Loading recycling information...</div>
      </div>
=======
        <div className="mx-auto max-w-md p-6 text-center">
          Loading recycling information...
        </div>
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
    );
  }

  if (!data) {
    return (
<<<<<<< HEAD
      <div className="max-w-md mx-auto p-6">
        <div className="text-center text-red-600">Failed to load recycling information</div>
      </div>
    );
  }

  // Backend returns flat ScanResponse structure
  const itemName = data.name;
  const waterLiters = data.waterLiters || 0;
  const co2Kg = data.co2Kg || 0;
  const materialGrams = data.materialGrams || 0;
  const rewardPoints = data.rewardPoints || 0;
  const recyclable = data.recyclable;

  // Success screen after confirming recycle
  if (recycleResult) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <CheckCircle className="mx-auto text-green-500 mb-3" size={56} />
          <h3 className="text-xl font-bold text-green-700">Recycled!</h3>
          <p className="text-gray-600 mt-1">{recycleResult.itemName}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6 text-center">
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-700 font-bold">{recycleResult.waterLitersThisTurn?.toFixed(1)} L</p>
            <p className="text-xs text-gray-500">Water saved</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-green-700 font-bold">{recycleResult.co2KgThisTurn?.toFixed(2)} kg</p>
            <p className="text-xs text-gray-500">CO₂ reduced</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <p className="text-yellow-700 font-bold">+{recycleResult.pointsThisTurn} pts</p>
            <p className="text-xs text-gray-500">Points earned</p>
          </div>
        </div>

        {recycleResult.newBadges?.length > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
            <p className="font-semibold text-purple-800 mb-2">🏆 New badges earned!</p>
            {recycleResult.newBadges.map(badge => (
              <span key={badge} className="inline-block bg-purple-200 text-purple-800 text-sm px-3 py-1 rounded-full mr-2 mb-1">{badge}</span>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg font-medium transition"
        >
          Done
        </button>
      </div>
=======
        <div className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-lg">
          <p className="text-center text-red-600">
            {error || 'Failed to load recycling information.'}
          </p>
          <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-lg bg-gray-200 py-3 font-semibold"
          >
            Back
          </button>
        </div>
    );
  }

  // SUCCESS SCREEN
  if (recycleResult) {
    return (
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-lg">
          <div className="mb-6 text-center">
            <CheckCircle
                className="mx-auto mb-3 text-green-500"
                size={56}
            />
            <h3 className="text-2xl font-bold text-green-700">
              Recycled Successfully!
            </h3>
            <p className="mt-1 text-gray-600">
              {recycleResult.itemName}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Quantity: {quantity}
            </p>
          </div>

          <div className="mb-6 rounded-xl bg-green-50 p-5 text-center">
            <Award
                size={32}
                className="mx-auto mb-2 text-yellow-500"
            />
            <p className="text-sm font-medium text-green-700">
              Eco points earned
            </p>
            <p className="text-4xl font-extrabold text-green-700">
              +{recycleResult.pointsThisTurn}
            </p>
            <p className="mt-2 text-sm text-gray-600">
              Keep recycling to unlock your next badge!
            </p>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 text-center">
            <div className="rounded-lg bg-blue-50 p-4">
              <Droplet
                  size={22}
                  className="mx-auto mb-2 text-blue-500"
              />
              <p className="font-bold text-blue-700">
                {recycleResult.waterLitersThisTurn.toFixed(1)} L
              </p>
              <p className="text-xs text-gray-500">Water saved</p>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <RecycleIcon
                  size={22}
                  className="mx-auto mb-2 text-green-600"
              />
              <p className="font-bold text-green-700">
                {recycleResult.co2KgThisTurn.toFixed(2)} kg
              </p>
              <p className="text-xs text-gray-500">CO₂ reduced</p>
            </div>
          </div>

          {recycleResult.newBadges.length > 0 && (
              <div className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-4">
                <h4 className="mb-3 font-bold text-purple-800">
                  🏆 New badges unlocked!
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recycleResult.newBadges.map((badge, index) => {
                    const name =
                        typeof badge === 'string'
                            ? badge
                            : badge.name || badge.title || 'Eco Badge';

                    return (
                        <span
                            key={`${name}-${index}`}
                            className="rounded-full bg-purple-200 px-3 py-1 text-sm font-semibold text-purple-800"
                        >
                    🏅 {name}
                  </span>
                    );
                  })}
                </div>
              </div>
          )}

          <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
          >
            Done
          </button>
        </div>
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
    );
  }

  return (
<<<<<<< HEAD
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Recycling Impact</h3>
      
      <div className="mb-6">
        <p className="text-lg font-semibold">{itemName}</p>
        <p className="text-sm text-gray-600">How many are you recycling?</p>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setQuantity(Math.max(1, quantity - 1))}
          className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg"
        >
          <Minus size={20} />
        </button>
        <span className="flex-1 flex items-center justify-center text-xl font-bold">
          {quantity}
        </span>
        <button
          onClick={() => setQuantity(quantity + 1)}
          className="bg-gray-200 hover:bg-gray-300 p-2 rounded-lg"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="mb-6">
        <h4 className="font-semibold mb-3 text-blue-600">Water Saved</h4>
        <div className="flex items-center gap-4 bg-blue-50 p-6 rounded-lg">
          <div className="flex gap-1">
            {[...Array(Math.min(5, Math.max(1, Math.ceil((waterLiters * quantity) / 10))))].map((_, i) => (
              <Droplet key={i} className="text-blue-500" size={24} />
            ))}
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-800">
=======
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-xl font-bold">
          Recycling Impact
        </h3>

        <div className="mb-6">
          <p className="text-lg font-semibold">{itemName}</p>
          <p className="text-sm text-gray-600">
            How many are you recycling?
          </p>
        </div>

        {/* QUANTITY */}
        <div className="mb-6 flex items-center gap-3">
          <button
              type="button"
              onClick={() =>
                  setQuantity((current) => Math.max(1, current - 1))
              }
              disabled={recycling || quantity <= 1}
              aria-label="Decrease quantity"
              className="rounded-lg bg-gray-200 p-3 hover:bg-gray-300 disabled:opacity-40"
          >
            <Minus size={20} />
          </button>

          <span className="flex flex-1 items-center justify-center text-2xl font-bold">
          {quantity}
        </span>

          <button
              type="button"
              onClick={() =>
                  setQuantity((current) => Math.min(100, current + 1))
              }
              disabled={recycling || quantity >= 100}
              aria-label="Increase quantity"
              className="rounded-lg bg-gray-200 p-3 hover:bg-gray-300 disabled:opacity-40"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* WATER SAVED */}
        <div className="mb-6">
          <h4 className="mb-3 font-semibold text-blue-600">
            Water Saved
          </h4>
          <div className="flex items-center gap-4 rounded-lg bg-blue-50 p-5">
            <div className="flex gap-1">
              {Array.from({
                length: Math.min(
                    5,
                    Math.max(
                        0,
                        Math.ceil((waterLiters * quantity) / 10)
                    )
                ),
              }).map((_, index) => (
                  <Droplet
                      key={index}
                      className="text-blue-500"
                      size={23}
                  />
              ))}
            </div>
            <p className="text-2xl font-bold text-blue-800">
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
              {(waterLiters * quantity).toFixed(1)} L
            </p>
          </div>
        </div>
<<<<<<< HEAD
      </div>

      <div className="mb-6">
        <h4 className="font-semibold mb-3 text-gray-600">Pollution / Greenhouse Gases</h4>
        <div className="flex items-center gap-4 bg-gray-50 p-6 rounded-lg">
          <div className="text-4xl">💨</div>
          <div>
            <p className="text-sm text-gray-600">CO₂ Reduced</p>
            <p className="text-3xl font-bold text-green-800">
              {(co2Kg * quantity).toFixed(1)} kg
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-4 bg-green-50 p-4 rounded-lg">
          <Factory className="text-green-600" size={32} />
          <div>
            <p className="text-sm text-gray-600">Materials Saved</p>
            <p className="text-xl font-bold text-green-800">
              {(materialGrams * quantity / 1000).toFixed(1)} kg
            </p>
          </div>
        </div>
      </div>

      <div className="bg-green-100 p-4 rounded-lg mb-4">
        <p className="text-green-800 font-semibold">
          Points to Earn: {rewardPoints * quantity}
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {!recyclable && (
        <div className="bg-yellow-50 border border-yellow-300 text-yellow-800 px-4 py-3 rounded mb-4 text-sm">
          This item may not be recyclable in a household bin. Recycling will be blocked by the server if so.
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleConfirmRecycle}
          disabled={recycling}
          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition"
        >
          {recycling ? 'Recording...' : 'Confirm Recycle'}
        </button>
        <button
          onClick={onClose}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium transition"
        >
          Cancel
        </button>
      </div>
    </div>
=======

        {/* CO2 */}
        <div className="mb-6">
          <h4 className="mb-3 font-semibold text-gray-600">
            Pollution / Greenhouse Gases
          </h4>
          <div className="flex items-center gap-4 rounded-lg bg-gray-50 p-5">
            <span className="text-3xl">💨</span>
            <div>
              <p className="text-sm text-gray-600">CO₂ reduced</p>
              <p className="text-2xl font-bold text-green-800">
                {(co2Kg * quantity).toFixed(2)} kg
              </p>
            </div>
          </div>
        </div>

        {/* MATERIAL */}
        <div className="mb-6 flex items-center gap-4 rounded-lg bg-green-50 p-4">
          <Factory className="text-green-600" size={32} />
          <div>
            <p className="text-sm text-gray-600">Materials saved</p>
            <p className="text-xl font-bold text-green-800">
              {((materialGrams * quantity) / 1000).toFixed(2)} kg
            </p>
          </div>
        </div>

        {/* POINTS PREVIEW */}
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex items-center justify-between">
          <span className="font-semibold text-green-800">
            Points to earn
          </span>
            <span className="text-2xl font-extrabold text-green-700">
            +{pointsToEarn}
          </span>
          </div>
          <p className="mt-2 text-xs text-green-700">
            {rewardPoints} points per item × {quantity} item(s).
            Final points are confirmed by the server.
          </p>
        </div>

        {recyclable === false && (
            <div className="mb-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
              This item is marked as non-recyclable. You cannot
              confirm recycling for this item.
            </div>
        )}

        {error && (
            <div
                role="alert"
                className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
        )}

        <div className="flex gap-3">
          <button
              type="button"
              onClick={handleConfirmRecycle}
              disabled={recycling || recyclable === false}
              className="flex-1 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {recycling ? 'Recording...' : 'Confirm Recycle'}
          </button>

          <button
              type="button"
              onClick={onClose}
              disabled={recycling}
              className="rounded-lg bg-gray-200 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
  );
}
