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
      // For now, we'll use history data to create posts
      // In a real app, this would be a dedicated posts endpoint
      const response = await recycleApi.getHistory(userId);
      const historyPosts = response.data.map(event => ({
        id: event.id,
        user: { username: 'You', avatar: null },
        content: `Just recycled ${event.quantity}x ${event.itemName}! Saved ${event.waterLiters}L of water and ${event.co2Kg}kg of CO₂.`,
        image: null,
        likes: Math.floor(Math.random() * 50),
        comments: Math.floor(Math.random() * 20),
        timestamp: event.createdAt,
        type: 'recycle'
      }));
      
      // Add some community posts (in real app, these would come from backend)
      const communityPosts = [
        {
          id: '1',
          user: { username: 'alishasoteaali', avatar: null },
          content: 'Just completed the Plastic Free Week challenge! 🎉 Who else is joining?',
          image: null,
          likes: 45,
          comments: 12,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: 'challenge'
        },
        {
          id: '2',
          user: { username: 'eco_warrior', avatar: null },
          content: 'Recycled 50 bottles today! Every small action counts for our planet 🌍',
          image: null,
          likes: 89,
          comments: 23,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          type: 'recycle'
        }
      ];
      
      setPosts([...communityPosts, ...historyPosts]);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

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
