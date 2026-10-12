import { useState, useEffect } from 'react';
import { Calendar, Recycle, RefreshCw } from 'lucide-react';
import { recycleApi } from '../api/api';

export default function History({ userId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await recycleApi.getHistory(userId);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Scan History</h2>

      {history.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600">No scan history yet</p>
          <p className="text-sm text-gray-500 mt-2">Start scanning items to see your history here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="font-semibold">{event.itemName}</p>
                  <p className="text-sm text-gray-600">{event.material}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-600 font-bold">+{event.pointsEarned} pts</p>
                  <p className="text-xs text-gray-500">Qty: {event.quantity}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Calendar size={16} />
                <span>{formatDate(event.createdAt)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="bg-blue-50 p-2 rounded">
                  <p className="text-blue-600 font-semibold">{event.waterLiters}L</p>
                  <p className="text-xs text-gray-600">Water</p>
                </div>
                <div className="bg-green-50 p-2 rounded">
                  <p className="text-green-600 font-semibold">{event.co2Kg}kg</p>
                  <p className="text-xs text-gray-600">CO₂</p>
                </div>
                <div className="bg-yellow-50 p-2 rounded">
                  <p className="text-yellow-600 font-semibold">{event.materialGrams}g</p>
                  <p className="text-xs text-gray-600">Material</p>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm">
                {event.bin && (
                  <span className="bg-gray-100 px-2 py-1 rounded text-gray-700">
                    Bin: {event.bin}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
