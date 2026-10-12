import { useState, useEffect } from 'react';
import { Droplet, Factory, Leaf, Plus, Minus } from 'lucide-react';
import { scanApi } from '../api/api';

export default function Recycling({ itemId, onClose }) {
  const [data, setData] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Recycling Impact</h3>
      
      <div className="mb-6">
        <p className="text-lg font-semibold">{itemName}</p>
        <p className="text-sm text-gray-600">Quantity: {quantity}</p>
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
            {[...Array(Math.min(5, Math.ceil((waterLiters * quantity) / 10)))].map((_, i) => (
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
          Points Earned: {rewardPoints * quantity}
        </p>
      </div>

      <button
        onClick={onClose}
        className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition"
      >
        Done
      </button>
    </div>
  );
}
