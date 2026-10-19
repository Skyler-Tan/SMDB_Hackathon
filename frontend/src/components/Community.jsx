import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Users, TrendingUp } from 'lucide-react';
import CommunityPosts from './CommunityPosts';

export default function Community({ userId }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  // Challenges - mock data for active community challenges
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
      // Backend doesn't have a dedicated leaderboard endpoint yet
      setLeaderboard([]);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy size={20} className="text-yellow-500" />;
    if (rank === 2) return <Medal size={20} className="text-gray-400" />;
    if (rank === 3) return <Medal size={20} className="text-amber-600" />;
    return <span className="text-xs font-bold text-gray-600">#{rank}</span>;
  };

  const getRankBackground = (rank) => {
    if (rank === 1) return 'bg-yellow-50 border-yellow-300';
    if (rank === 2) return 'bg-gray-50 border-gray-200';
    if (rank === 3) return 'bg-amber-50 border-amber-300';
    return 'bg-white border-gray-200';
  };

  if (loading) {
    return (
        <div className="mx-auto max-w-5xl p-6 text-center text-gray-500">
          Loading community data...
        </div>
    );
  }

  return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Community Hub</h2>
            <p className="mt-1 text-sm text-gray-500">
              Share your progress, swap ideas, and celebrate greener habits together.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-green-700">
            <TrendingUp size={20} />
            <span className="font-semibold text-sm">Active Community</span>
          </div>
        </div>

        {/* WIDER 2-COLUMN GRID LAYOUT */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">

          {/* MAIN COLUMN: COMMUNITY POSTS FEED (8 Spans on md+) */}
          <div className="md:col-span-8">
            <CommunityPosts userId={userId} />
          </div>

          {/* SIDE COLUMN: ACTIVE CHALLENGES & TOP RECYCLERS (4 Spans on md+) */}
          <div className="space-y-6 md:col-span-4">

            {/* ACTIVE CHALLENGES CARD */}
            <section className="community-panel rounded-2xl bg-white p-5 shadow-lg border border-gray-100">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <Award size={20} className="text-green-600" />
                  Active Challenges
                </h3>
                <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                {challenges.length} Active
              </span>
              </div>

              <div className="space-y-2.5">
                {challenges.map((challenge) => (
                    <div
                        key={challenge.id}
                        className="community-challenge-card rounded-xl border p-3 transition"
                    >
                      <h4 className="community-challenge-title text-xs font-semibold text-gray-900">{challenge.title}</h4>
                      <div className="community-challenge-meta mt-1.5 flex items-center justify-between text-[11px] text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users size={13} className="text-gray-400" />
                      {challenge.participants} joined
                    </span>
                        <span className="font-semibold text-green-700">{challenge.endDate}</span>
                      </div>
                    </div>
                ))}
              </div>
            </section>

            {/* TOP RECYCLERS LEADERBOARD CARD */}
            <section className="community-panel rounded-2xl bg-white p-5 shadow-lg border border-gray-100">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <Trophy size={20} className="text-amber-500" />
                  Top Recyclers
                </h3>
              </div>

              {leaderboard.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-gray-500">
                    <p className="text-xs font-semibold text-gray-700">Leaderboard coming soon</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      Backend integration for rankings is under construction.
                    </p>
                  </div>
              ) : (
                  <div className="space-y-2.5">
                    {leaderboard.map((user) => (
                        <div
                            key={user.rank}
                            className={`flex items-center gap-3 rounded-xl border p-3 ${getRankBackground(
                                user.rank
                            )}`}
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                            {getRankIcon(user.rank)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-900 truncate">{user.username}</p>
                            <p className="text-[10px] text-gray-500">{user.badges} badges earned</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-green-600">{user.points}</p>
                            <p className="text-[9px] text-gray-400 uppercase font-medium">pts</p>
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </section>

          </div>
        </div>
      </div>
  );
}