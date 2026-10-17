import { useState, useEffect } from 'react';
import {
  Camera,
  Edit2,
  LogOut,
  Recycle,
  RefreshCw,
  ArrowRight,
  Bookmark,
  Award,
  MapPin,
  Instagram,
  User,
  Leaf,
  Trophy,
  X,
  Save,
  CheckCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { recycleApi } from '../api/api';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

// Points awarded by successful recycle/reuse actions.
const RECYCLE_POINTS = 3;
const REUSE_POINTS = 5;

const DEFAULT_PROFILE = {
  username: '',
  fullName: '',
  bio: '',
  location: '',
  instagram: '',
  email: '',
  profileImage: '',
};

const BADGES = [
  {
    id: 'eco-starter',
    name: 'Eco Starter',
    description: 'Earn 10 eco points',
    icon: '🌱',
    requirement: (stats) => stats.totalPoints >= 10,
  },
  {
    id: 'recycling-friend',
    name: 'Recycling Friend',
    description: 'Recycle 5 items',
    icon: '♻️',
    requirement: (stats) => stats.recycledItems >= 5,
  },
  {
    id: 'reuse-hero',
    name: 'Reuse Hero',
    description: 'Reuse 10 items',
    icon: '🔄',
    requirement: (stats) => stats.reusedItems >= 10,
  },
  {
    id: 'green-champion',
    name: 'Green Champion',
    description: 'Earn 100 eco points',
    icon: '🏆',
    requirement: (stats) => stats.totalPoints >= 100,
  },
  {
    id: 'planet-protector',
    name: 'Planet Protector',
    description: 'Earn 500 eco points',
    icon: '🌍',
    requirement: (stats) => stats.totalPoints >= 500,
  },
];

export default function Profile({
                                  user,
                                  onLogout,
                                  onEditProfile,
                                  userId,
                                }) {
  const [userStats, setUserStats] = useState(null);
  const [savedCount, setSavedCount] = useState(0);
  const [localReusedCount, setLocalReusedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [previewImage, setPreviewImage] = useState('');

  const me = userId || 'demo-user';

  const [form, setForm] = useState({
    ...DEFAULT_PROFILE,
    ...(user || {}),
  });

  useEffect(() => {
    setForm({
      ...DEFAULT_PROFILE,
      ...(user || {}),
    });
  }, [user]);

  // Load local storage reused count and listen for live updates from Reuse.jsx
  useEffect(() => {
    const storageKey = `three_r_reused_items_${me}`;

    const syncLocalReused = () => {
      const stored = Number(localStorage.getItem(storageKey) || 0);
      setLocalReusedCount(stored);
    };

    syncLocalReused();
    window.addEventListener('storage', syncLocalReused);

    return () => {
      window.removeEventListener('storage', syncLocalReused);
    };
  }, [me]);

  useEffect(() => {
    let active = true;

    async function loadProfileData() {
      setLoading(true);

      try {
        const response = await recycleApi.getStats(userId);
        if (active) {
          setUserStats(response.data);
        }
      } catch (error) {
        console.error('Failed to load user statistics:', error);
        if (active) setUserStats(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadProfileData();

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    let active = true;

    async function loadSavedCount() {
      try {
        const response = await fetch(
            `${API_BASE}/ideas/saved?userId=${encodeURIComponent(me)}`
        );

        if (!response.ok) return;

        const data = await response.json();

        if (active) {
          setSavedCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (error) {
        console.error('Failed to load saved ideas:', error);
      }
    }

    loadSavedCount();

    return () => {
      active = false;
    };
  }, [me]);

  // Item counts and dynamic points calculations
  const recycledItems = Number(
      userStats?.itemsRecycled ??
      userStats?.recycledItems ??
      user?.recycledItems ??
      0
  );

  const apiReusedItems = Number(
      userStats?.itemsReused ??
      userStats?.reusedItems ??
      user?.reusedItems ??
      0
  );

  const reusedItems = apiReusedItems + localReusedCount;

  const recyclePoints = Number(
      userStats?.recyclePoints ??
      userStats?.recyclingPoints ??
      (recycledItems * RECYCLE_POINTS)
  );

  const reusePoints = reusedItems * REUSE_POINTS;

  const calculatedTotal = recyclePoints + reusePoints;
  const totalPoints = Math.max(
      Number(userStats?.totalPoints ?? userStats?.points ?? user?.points ?? 0),
      calculatedTotal
  );

  const earnedBadges = BADGES.filter((badge) =>
      badge.requirement({
        totalPoints,
        recycledItems,
        reusedItems,
      })
  );

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const openEditor = () => {
    setSaveMessage('');
    setPreviewImage(user?.profileImage || '');
    setForm({
      ...DEFAULT_PROFILE,
      ...(user || {}),
    });
    setShowEditor(true);
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveMessage('Please choose an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setSaveMessage('Please choose an image smaller than 5 MB.');
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const image = String(reader.result || '');
      setPreviewImage(image);
      updateField('profileImage', image);
      setSaveMessage('');
    };

    reader.onerror = () => {
      setSaveMessage('Unable to read this image. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSaveMessage('');

    const updatedProfile = {
      ...form,
      username: form.username.trim(),
      fullName: form.fullName.trim(),
      bio: form.bio.trim(),
      location: form.location.trim(),
      instagram: form.instagram.trim().replace(/^@/, ''),
      email: form.email.trim(),
      profileImage: previewImage || form.profileImage || '',
    };

    try {
      if (onEditProfile) {
        await onEditProfile(updatedProfile);
      }

      setForm(updatedProfile);
      setShowEditor(false);
      setSaveMessage('');
    } catch (error) {
      console.error('Failed to save profile:', error);
      setSaveMessage('Could not save your profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="mx-auto max-w-5xl p-6 text-center text-gray-600">
          Loading profile...
        </div>
    );
  }

  const displayName = user?.username || user?.fullName || 'Eco Member';

  return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* WIDER 2-COLUMN GRID LAYOUT */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

          {/* LEFT COLUMN: PROFILE CARD */}
          <div className="space-y-5 lg:col-span-1">
            <section className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-500">Your eco profile</p>
                  <h2 className="truncate text-xl font-bold text-gray-900">
                    @{user?.username || 'eco_member'}
                  </h2>
                </div>

                <div className="flex shrink-0 items-center gap-2 rounded-full bg-green-50 px-3 py-1.5">
                  <Leaf size={16} className="text-green-600" />
                  <span className="font-bold text-green-700">
                  {totalPoints} pts
                </span>
                </div>
              </div>

              <div className="my-6 flex flex-col items-center text-center">
                <div className="relative">
                  <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-4 ring-green-100">
                    {(user?.profileImage || previewImage) ? (
                        <img
                            src={user?.profileImage || previewImage}
                            alt="Profile"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <Camera size={42} className="text-gray-400" />
                    )}
                  </div>

                  <button
                      type="button"
                      onClick={openEditor}
                      aria-label="Edit profile photo"
                      className="absolute bottom-0 right-0 rounded-full bg-green-600 p-2 text-white shadow hover:bg-green-700"
                  >
                    <Camera size={17} />
                  </button>
                </div>

                <h3 className="mt-4 text-xl font-bold text-gray-900">
                  {user?.fullName || displayName}
                </h3>

                {user?.bio && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
                      {user.bio}
                    </p>
                )}

                {user?.location && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin size={15} />
                      {user.location}
                    </p>
                )}

                {user?.instagram && (
                    <a
                        href={`https://www.instagram.com/${encodeURIComponent(
                            user.instagram.replace(/^@/, '')
                        )}/`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex items-center gap-2 text-sm font-medium text-pink-600 hover:underline"
                    >
                      <Instagram size={16} />
                      @{user.instagram.replace(/^@/, '')}
                    </a>
                )}
              </div>

              <button
                  type="button"
                  onClick={openEditor}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 font-semibold text-gray-800 transition hover:bg-gray-200"
              >
                <Edit2 size={18} />
                Edit Profile
              </button>

              <button
                  type="button"
                  onClick={onLogout}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-700 transition hover:bg-red-100"
              >
                <LogOut size={18} />
                Login Different Account
              </button>
            </section>
          </div>

          {/* RIGHT COLUMN: POINTS, BADGES & ACTIVITY SUMMARY */}
          <div className="space-y-6 lg:col-span-2">

            {/* ECO POINTS BREAKDOWN */}
            <section className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={23} className="text-amber-500" />
                <h3 className="text-xl font-bold text-gray-900">
                  Eco Points Breakdown
                </h3>
              </div>

              <div className="mb-5 rounded-xl bg-green-50 p-5 text-center">
                <p className="text-sm font-medium text-green-700">
                  Total points earned
                </p>
                <p className="mt-1 text-4xl font-extrabold text-green-700">
                  {totalPoints}
                </p>
                <p className="mt-1 text-sm text-green-700">
                  Every action makes a difference!
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-100 p-2">
                      <Recycle size={21} className="text-green-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Recycling
                      </p>
                      <p className="text-xs text-gray-500">
                        {recycledItems} items · {RECYCLE_POINTS} pts each
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-green-700">
                  +{recyclePoints}
                </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2">
                      <RefreshCw size={21} className="text-blue-700" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Reusing
                      </p>
                      <p className="text-xs text-gray-500">
                        {reusedItems} items · {REUSE_POINTS} pts each
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-blue-700">
                  +{reusePoints}
                </span>
                </div>
              </div>
            </section>

            {/* STAT SUMMARY CARDS (SIDE-BY-SIDE GRID) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* RECYCLED ITEMS */}
              <Link
                  to="/recycle-history"
                  className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-lg transition hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Recycle size={22} className="text-green-600" />
                    <ArrowRight size={18} className="text-green-700" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-green-600">
                    {recycledItems}
                  </p>
                  <p className="text-sm text-gray-500">Recycled Items</p>
                </div>
                <p className="mt-3 text-xs font-semibold text-green-700">
                  View activity
                </p>
              </Link>

              {/* SAVED IDEAS */}
              <Link
                  to="/saved-ideas"
                  className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-lg transition hover:shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <Bookmark size={22} className="text-green-600" />
                    <ArrowRight size={18} className="text-green-700" />
                  </div>
                  <p className="mt-3 text-3xl font-bold text-green-600">
                    {savedCount}
                  </p>
                  <p className="text-sm text-gray-500">Saved Ideas</p>
                </div>
                <p className="mt-3 text-xs font-semibold text-green-700">
                  View all saved
                </p>
              </Link>

              {/* REUSED ITEMS */}
              <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-lg">
                <div>
                  <RefreshCw size={22} className="text-blue-600" />
                  <p className="mt-3 text-3xl font-bold text-blue-600">
                    {reusedItems}
                  </p>
                  <p className="text-sm text-gray-500">Reused Items</p>
                </div>
                <p className="mt-3 text-xs font-semibold text-blue-600">
                  Second life given
                </p>
              </div>
            </div>

            {/* BADGES SECTION */}
            <section className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-xl font-bold text-gray-900">
                  <Award size={24} className="text-amber-500" />
                  My Badges
                </h3>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                {earnedBadges.length}/{BADGES.length}
              </span>
              </div>

              <p className="mb-5 text-sm text-gray-500">
                Keep recycling and reusing to unlock achievements.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                {BADGES.map((badge) => {
                  const earned = earnedBadges.some(
                      (item) => item.id === badge.id
                  );

                  return (
                      <div
                          key={badge.id}
                          className={`rounded-xl border p-3 text-center ${
                              earned
                                  ? 'border-green-200 bg-green-50'
                                  : 'border-gray-200 bg-gray-50 opacity-60'
                          }`}
                      >
                        <div className="text-2xl">{badge.icon}</div>
                        <p className="mt-1 text-xs font-bold text-gray-900 truncate">
                          {badge.name}
                        </p>
                        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-semibold">
                          {earned ? (
                              <span className="flex items-center gap-0.5 text-green-700">
                          <CheckCircle size={12} />
                          Unlocked
                        </span>
                          ) : (
                              <span className="text-gray-400">Locked</span>
                          )}
                        </div>
                      </div>
                  );
                })}
              </div>
            </section>

          </div>
        </div>

        {/* EDIT PROFILE MODAL */}
        {showEditor && (
            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                onClick={(event) => {
                  if (event.target === event.currentTarget && !saving) {
                    setShowEditor(false);
                  }
                }}
            >
              <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="edit-profile-title"
                  className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2
                        id="edit-profile-title"
                        className="text-xl font-bold text-gray-900"
                    >
                      Edit Profile
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Make your eco profile your own.
                    </p>
                  </div>

                  <button
                      type="button"
                      disabled={saving}
                      onClick={() => setShowEditor(false)}
                      aria-label="Close editor"
                      className="rounded-full p-2 hover:bg-gray-100"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-gray-100">
                      {previewImage ? (
                          <img
                              src={previewImage}
                              alt="Profile preview"
                              className="h-full w-full object-cover"
                          />
                      ) : (
                          <User size={38} className="text-gray-400" />
                      )}
                    </div>

                    <label className="mt-3 cursor-pointer rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100">
                  <span className="flex items-center gap-2">
                    <Camera size={16} />
                    Change photo
                  </span>
                      <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                      />
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      Image files up to 5 MB
                    </p>
                  </div>

                  <div>
                    <label
                        htmlFor="profile-username"
                        className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Username *
                    </label>
                    <input
                        id="profile-username"
                        required
                        maxLength={30}
                        value={form.username || ''}
                        onChange={(e) =>
                            updateField('username', e.target.value)
                        }
                        placeholder="e.g. alisha_eco"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div>
                    <label
                        htmlFor="profile-fullname"
                        className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Full name
                    </label>
                    <input
                        id="profile-fullname"
                        maxLength={80}
                        value={form.fullName || ''}
                        onChange={(e) =>
                            updateField('fullName', e.target.value)
                        }
                        placeholder="Your name"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div>
                    <label
                        htmlFor="profile-bio"
                        className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Bio
                    </label>
                    <textarea
                        id="profile-bio"
                        rows={3}
                        maxLength={160}
                        value={form.bio || ''}
                        onChange={(e) =>
                            updateField('bio', e.target.value)
                        }
                        placeholder="Tell the community about your sustainability journey..."
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                    <p className="mt-1 text-right text-xs text-gray-400">
                      {(form.bio || '').length}/160
                    </p>
                  </div>

                  <div>
                    <label
                        htmlFor="profile-location"
                        className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Location
                    </label>
                    <input
                        id="profile-location"
                        maxLength={100}
                        value={form.location || ''}
                        onChange={(e) =>
                            updateField('location', e.target.value)
                        }
                        placeholder="e.g. Selangor, Malaysia"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div>
                    <label
                        htmlFor="profile-instagram"
                        className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-700"
                    >
                      <Instagram size={16} />
                      Instagram username
                    </label>
                    <div className="flex items-center rounded-lg border border-gray-300 px-3 focus-within:border-green-500 focus-within:ring-2 focus-within:ring-green-100">
                      <span className="text-gray-400">@</span>
                      <input
                          id="profile-instagram"
                          maxLength={30}
                          value={form.instagram || ''}
                          onChange={(e) =>
                              updateField(
                                  'instagram',
                                  e.target.value.replace(/^@/, '')
                              )
                          }
                          placeholder="yourusername"
                          className="min-w-0 flex-1 border-0 px-2 py-2.5 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                        htmlFor="profile-email"
                        className="mb-1 block text-sm font-semibold text-gray-700"
                    >
                      Email
                    </label>
                    <input
                        id="profile-email"
                        type="email"
                        maxLength={254}
                        value={form.email || ''}
                        onChange={(e) =>
                            updateField('email', e.target.value)
                        }
                        placeholder="you@example.com"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Updating this field does not change your login
                      email unless your backend supports that feature.
                    </p>
                  </div>

                  {saveMessage && (
                      <p role="alert" className="text-sm text-red-600">
                        {saveMessage}
                      </p>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => setShowEditor(false)}
                        className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save size={17} />
                      {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                  </div>
                </form>
              </section>
            </div>
        )}
      </div>
  );
}