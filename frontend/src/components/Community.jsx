import { useState, useEffect } from 'react';
import { Trophy, Medal, Award } from 'lucide-react';
import { recycleApi } from '../api/api';
import CommunityPosts from './CommunityPosts';

export default function Community({ userId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Challenges - these would come from a backend endpoint in a real implementation
  const challenges = [
    { id: 1, title: 'Plastic Free Week', participants: 234, endDate: '2 days left' },
    { id: 2, title: 'Recycle 50 Items', participants: 189, endDate: '5 days left' },
    { id: 3, title: 'Zero Waste Challenge', participants: 156, endDate: '1 week left' },
  ];

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      // Note: Backend doesn't have a dedicated leaderboard endpoint yet
      // This would need to be added to the backend
      // For now, showing empty state
      setLeaderboard([]);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={24} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={24} className="text-gray-400" />;
    if (rank === 3) return <Medal size={24} className="text-amber-600" />;
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
  };

  const getRankBackground = (rank) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-400';
    if (rank === 2) return 'bg-gray-50 border-gray-300';
    if (rank === 3) return 'bg-amber-50 border-amber-400';
    return 'bg-white border-gray-200';
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">Loading community data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">Community</h2>
      <p className="mb-6 text-sm text-gray-500">Share your progress, swap ideas and celebrate greener habits together.</p>
      <CommunityPosts userId={userId} />

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Award size={24} className="text-green-600" />
          Active Challenges
        </h3>
        <div className="space-y-3">
          {challenges.map((challenge) => (
            <div
              key={challenge.id}
              className="p-4 bg-green-50 rounded-lg border border-green-200"
            >
              <h4 className="font-semibold">{challenge.title}</h4>
              <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                <span>{challenge.participants} participants</span>
                <span className="text-green-600 font-medium">{challenge.endDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Top Recyclers</h3>
        {leaderboard.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            <p>Leaderboard data not available</p>
            <p className="text-sm mt-2">Backend endpoint needed for leaderboard</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user) => (
              <div
                key={user.rank}
                className={`p-4 rounded-lg border-2 flex items-center gap-4 ${getRankBackground(user.rank)}`}
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  {getRankIcon(user.rank)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{user.username}</p>
                  <p className="text-sm text-gray-600">{user.badges} badges</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">{user.points}</p>
                  <p className="text-xs text-gray-600">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
