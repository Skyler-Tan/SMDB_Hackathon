import { useState, useEffect } from 'react';
import { Trophy, Star, Award } from 'lucide-react';
import { recycleApi } from '../api/api';

export default function Rewards({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [userId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await recycleApi.getStats(userId);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">Loading rewards...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600">No stats data available</p>
          <p className="text-sm text-gray-500 mt-2">Start recycling to see your rewards!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Your Rewards</h2>

      <div className="bg-gradient-to-r from-green-500 to-blue-500 text-white p-6 rounded-lg mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={32} />
          <span className="text-lg font-semibold">Total Points</span>
        </div>
        <p className="text-4xl font-bold">{stats.points || 0}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Items Recycled</p>
          <p className="text-2xl font-bold text-green-600">{stats.itemsRecycled || 0}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Water Saved</p>
          <p className="text-2xl font-bold text-blue-600">{(stats.waterLiters || 0).toFixed(1)}L</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">CO₂ Reduced</p>
          <p className="text-2xl font-bold text-green-600">{(stats.co2Kg || 0).toFixed(1)}kg</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Materials Saved</p>
          <p className="text-2xl font-bold text-yellow-600">{(stats.materialGrams || 0).toFixed(1)}g</p>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award size={24} />
          Badges
        </h3>
        {stats.badges && stats.badges.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {stats.badges.map((badge, index) => (
              <div
                key={index}
                className="p-4 rounded-lg text-center bg-yellow-100 border-2 border-yellow-400"
              >
                <div className="text-4xl mb-2">🏆</div>
                <p className="text-sm font-medium">{badge}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg p-6 text-center text-gray-600">
            <p>No badges earned yet</p>
            <p className="text-sm mt-2">Keep recycling to earn badges!</p>
          </div>
        )}
      </div>
    </div>
  );
}
