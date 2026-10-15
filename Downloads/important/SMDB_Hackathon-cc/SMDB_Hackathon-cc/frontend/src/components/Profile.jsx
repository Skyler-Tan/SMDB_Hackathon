import { useState, useEffect } from 'react';
import { Camera, Edit2, LogOut, Recycle, RefreshCw } from 'lucide-react';
import { recycleApi } from '../api/api';

export default function Profile({ user, onLogout, onEditProfile, userId }) {
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, [userId]);

  const loadUserStats = async () => {
    setLoading(true);
    try {
      const response = await recycleApi.getStats(userId);
      setUserStats(response.data);
    } catch (err) {
      console.error('Failed to load user stats:', err);
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  const displayUser = userStats || user;

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">{user.username}</h2>
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">{user.points}pts</span>
            <button
              onClick={onEditProfile}
              className="text-gray-600 hover:text-gray-800"
            >
              <Edit2 size={20} />
            </button>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
              {user.profileImage ? (
                <img
                  src={user.profileImage}
                  alt="Profile"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <Camera size={48} className="text-gray-400" />
              )}
            </div>
            <button
              onClick={() => setShowImageUpload(true)}
              className="absolute bottom-0 right-0 bg-green-600 text-white p-2 rounded-full hover:bg-green-700"
            >
              <Camera size={16} />
            </button>
          </div>
        </div>

        {showImageUpload && (
          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    onEditProfile({ ...user, profileImage: reader.result });
                    setShowImageUpload(false);
                  };
                  reader.readAsDataURL(file);
                }
              }}
              className="w-full"
            />
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={onEditProfile}
            className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 py-3 px-4 rounded-lg transition"
          >
            <Edit2 size={20} />
            Edit Profile
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-100 hover:bg-red-200 text-red-700 py-3 px-4 rounded-lg transition"
          >
            <LogOut size={20} />
            Login Different Account
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Recycle size={24} className="text-green-600" />
          Recycled Items
        </h3>
        <div className="text-4xl font-bold text-green-600 mb-2">
          {displayUser?.itemsRecycled || user.recycledItems || 0}
        </div>
        <p className="text-gray-600">Items you've recycled</p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <RefreshCw size={24} className="text-blue-600" />
          Reused Items
        </h3>
        <div className="text-4xl font-bold text-blue-600 mb-2">
          {user.reusedItems || 0}
        </div>
        <p className="text-gray-600">Items you've reused</p>
      </div>
    </div>
  );
}
