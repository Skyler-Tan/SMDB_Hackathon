import { useState, useEffect } from 'react';
import { Droplet, Factory, CheckCircle, Plus, Minus } from 'lucide-react';
import { scanApi, recycleApi } from '../api/api';

export default function Recycling({ itemId, userId, onClose }) {
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recycling, setRecycling] = useState(false);
  const [recycleResult, setRecycleResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadRecyclingInfo();
  }, [itemId]);

  const loadRecyclingInfo = async () => {
    try {
      const response = await scanApi.loadRecycling(itemId);
      setData(response.data);
    } catch (err) {
      console.error('Failed to load recycling info:', err);
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
    } finally {
      setRecycling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">Loading recycling information...</div>
      </div>
    );
  }

  if (!data) {
    return (
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
    );
  }

  return (
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
              {(waterLiters * quantity).toFixed(1)} L
            </p>
          </div>
        </div>
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
  );
}
