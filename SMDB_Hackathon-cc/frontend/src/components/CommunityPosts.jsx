import { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share2, TrendingUp } from 'lucide-react';
import { recycleApi } from '../api/api';

export default function CommunityPosts({ userId }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
  }, [userId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      // Static community posts always shown
      const communityPosts = [
        {
          id: 'c1',
          user: { username: 'alishasoteaali' },
          content: 'Just completed the Plastic Free Week challenge! 🎉 Who else is joining?',
          likes: 45,
          comments: 12,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: 'challenge',
        },
        {
          id: 'c2',
          user: { username: 'eco_warrior' },
          content: 'Recycled 50 bottles today! Every small action counts for our planet 🌍',
          likes: 89,
          comments: 23,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          type: 'recycle',
        },
        {
          id: 'c3',
          user: { username: 'green_life_my' },
          content: 'Did you know recycling one aluminium can saves enough energy to run a TV for 3 hours? ♻️',
          likes: 62,
          comments: 8,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'tip',
        },
      ];

      // Try to load the user's own recycle history as personal posts
      let historyPosts = [];
      try {
        const response = await recycleApi.getHistory(userId);
        const data = Array.isArray(response?.data) ? response.data : [];
        historyPosts = data.map((event) => ({
          id: event.id || String(Math.random()),
          user: { username: 'You' },
          content: `Just recycled ${event.quantity ?? 1}x ${event.itemName ?? 'item'}! Saved ${event.waterLiters ?? 0}L of water and ${event.co2Kg ?? 0}kg of CO₂. 🌱`,
          likes: 0,
          comments: 0,
          timestamp: event.createdAt ?? new Date().toISOString(),
          type: 'recycle',
        }));
      } catch {
        // History unavailable — still show community posts
      }

      setPosts([...communityPosts, ...historyPosts]);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">Loading community posts...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Community Posts</h2>
        <div className="flex items-center gap-2 text-green-600">
          <TrendingUp size={20} />
          <span className="font-semibold">Active</span>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600">No posts yet</p>
          <p className="text-sm text-gray-500 mt-2">Be the first to share your recycling journey!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">
                    {post.user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{post.user.username}</p>
                  <p className="text-xs text-gray-500">{formatTimeAgo(post.timestamp)}</p>
                </div>
                {post.type === 'challenge' && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                    Challenge
                  </span>
                )}
                {post.type === 'tip' && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                    Tip
                  </span>
                )}
              </div>

              <p className="text-gray-800 mb-3">{post.content}</p>

              {post.image && (
                <img
                  src={post.image}
                  alt="Post image"
                  className="w-full rounded-lg mb-3"
                />
              )}

              <div className="flex items-center gap-6 text-gray-600">
                <button className="flex items-center gap-2 hover:text-red-600 transition">
                  <Heart size={18} />
                  <span className="text-sm">{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-blue-600 transition">
                  <MessageCircle size={18} />
                  <span className="text-sm">{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-green-600 transition">
                  <Share2 size={18} />
                  <span className="text-sm">Share</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
