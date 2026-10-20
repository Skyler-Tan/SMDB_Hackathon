<<<<<<< HEAD

=======
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
import { useState, useEffect } from 'react';
import {
  Heart,
  MessageCircle,
  Share2,
  TrendingUp,
  Trash2,
  Plus,
  X,
  Pencil,
  MoreVertical,
  Send,
<<<<<<< HEAD
=======
  Users,
  Sparkles,
  MessageSquare,
  ShoppingBag,
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
} from 'lucide-react';
import { recycleApi, marketApi } from '../api/api';
import { Link } from 'react-router-dom';

export default function CommunityPosts({ userId }) {
  const [posts, setPosts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('34district-local-posts') || '[]');
    } catch {
      return [];
    }
  });
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [newPostType, setNewPostType] = useState('tip');
  const [salePrice, setSalePrice] = useState('');
  const [marketListings, setMarketListings] = useState([]);
  const [selectedListingId, setSelectedListingId] = useState('');
  const [postFilter, setPostFilter] = useState('all');
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Edit post state
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  // Liked post IDs (local state)
  const [likedPosts, setLikedPosts] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [postComments, setPostComments] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('34district-comments') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    loadPosts();
    marketApi.getListings().then((response) => setMarketListings(Array.isArray(response?.data) ? response.data : [])).catch((error) => console.error('Could not load marketplace listings:', error));
  }, [userId]);

  const loadPosts = async () => {
    setLoading(true);

    try {
      const communityPosts = [
        {
          id: 'c1',
          user: { username: 'alishasoteaali' },
          content:
              'Just completed the Plastic Free Week challenge! 🎉 Who else is joining?',
          likes: 45,
          comments: 12,
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          type: 'challenge',
        },
        {
          id: 'c2',
          user: { username: 'eco_warrior' },
          content:
              'Recycled 50 bottles today! Every small action counts for our planet 🌍',
          likes: 89,
          comments: 23,
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          type: 'recycle',
        },
        {
          id: 'c3',
          user: { username: 'green_life_my' },
          content:
              'Did you know recycling one aluminium can saves enough energy to run a TV for 3 hours? ♻️',
          likes: 62,
          comments: 8,
          timestamp: new Date(Date.now() - 86400000).toISOString(),
          type: 'fact',
        },
      ];

      let historyPosts = [];

      try {
        if (userId != null) {
          const response = await recycleApi.getHistory(userId);
          const data = Array.isArray(response?.data) ? response.data : [];


          historyPosts = data.map((event) => ({
            id: `history-${event.id}`,
            user: { username: 'You' },
            content: `Just recycled ${event.quantity ?? 1}x ${
                event.itemName ?? 'item'
            }! Saved ${event.waterLiters ?? 0}L of water and ${
                event.co2Kg ?? 0
            }kg of CO₂. 🌱`,
            likes: 0,
            comments: 0,
            timestamp: event.createdAt ?? new Date().toISOString(),
            type: 'recycle',
            isOwnPost: true,
            isHistoryPost: true,
          }));
        }
      } catch (error) {
        console.error('Could not load recycling history:', error);
      }

      setPosts((previousPosts) => {
        const localPosts = previousPosts.filter((post) => post.isLocal);

        return [...localPosts, ...communityPosts, ...historyPosts];

      });
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('34district-comments', JSON.stringify(postComments));
  }, [postComments]);

  useEffect(() => {
    localStorage.setItem(
        '34district-local-posts',
        JSON.stringify(posts.filter((post) => post.isLocal))
    );
  }, [posts]);

  const handleAddComment = (postId) => {
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;
    setPostComments((current) => ({
      ...current,
      [postId]: [
        ...(current[postId] || []),
        {
          id: `${Date.now()}-${Math.random()}`,
          username: 'You',
          content,
          timestamp: new Date().toISOString(),
        },
      ],
    }));
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    setPosts((current) =>
        current.map((post) =>
            post.id === postId
                ? { ...post, comments: (post.comments || 0) + 1 }
                : post
        )
    );
>>>>>>> 108441e8e7b5f5940425f1ca3557d4300791be7d
  };

  const handleShare = async (post) => {
    try {
      if (navigator.share)
        await navigator.share({
          title: '34district community post',
          text: post.content,
        });
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(post.content);
        alert('Post copied to clipboard!');
      } else window.prompt('Copy this post to share:', post.content);
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Could not share post:', error);
    }
    setOpenMenuId(null);
  };

  const handleAddPost = () => {
    const content = newPost.trim();

    if (!content) return;

    const post = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,

      user: { username: 'You' },
      content,
      likes: 0,
      comments: 0,
      timestamp: new Date().toISOString(),
      type: newPostType,
      ...(newPostType === 'for-sale' && salePrice.trim() ? { price: salePrice.trim() } : {}),
      ...(newPostType === 'for-sale' && selectedListingId ? { listingId: selectedListingId, listingTitle: marketListings.find((listing) => String(listing.id) === String(selectedListingId))?.title } : {}),
      isLocal: true,
      isOwnPost: true,
    };

    setPosts((previousPosts) => [post, ...previousPosts]);
    setNewPost('');
    setNewPostType('tip');
    setSalePrice('');
    setSelectedListingId('');
    setShowCreatePost(false);
  };

  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setEditedContent(post.content);
    setShowCreatePost(false);
  };

  const handleSaveEdit = () => {
    const content = editedContent.trim();

    if (!content || !editingPostId) return;

    setPosts((previousPosts) =>
        previousPosts.map((post) =>
            post.id === editingPostId
                ? {
                  ...post,
                  content,
                  editedAt: new Date().toISOString(),
                }
                : post
        )
    );

    setEditingPostId(null);
    setEditedContent('');
  };


  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditedContent('');
  };

  const handleDeletePost = (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) {
      return;
    }

    setPosts((previousPosts) =>
        previousPosts.filter((post) => post.id !== postId)
    );

    if (editingPostId === postId) {
      handleCancelEdit();
    }
  };

  // Like or unlike a post

  const handleLike = (postId) => {
    const alreadyLiked = likedPosts.includes(postId);

    setLikedPosts((previous) =>
        alreadyLiked
            ? previous.filter((id) => id !== postId)
            : [...previous, postId]
    );

    setPosts((previousPosts) =>
        previousPosts.map((post) =>
            post.id === postId
                ? {
                  ...post,
                  likes: Math.max(0, post.likes + (alreadyLiked ? -1 : 1)),
                }
                : post
        )
    );
  };

  const formatTimeAgo = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '';

    const diffMs = Math.max(0, Date.now() - date.getTime());
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
        <div className="mx-auto max-w-5xl p-6 text-center text-gray-500">
          Loading community posts...
        </div>
    );
  }

  return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Community Posts
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Share ideas, milestones, and sustainable habits with the community.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-green-700">
            <TrendingUp size={20} />
            <span className="font-semibold text-sm">Active Feed</span>
          </div>
        </div>

        {/* RESPONSIVE LAYOUT (Single column on mobile, 2-column on wide screens) */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          {/* LEFT COLUMN: SIDEBAR (4 Columns wide on md+) */}
          <div className="space-y-5 md:col-span-4">
            <button
                type="button"
                onClick={() => setShowCreatePost((previous) => !previous)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-5 py-3.5 font-semibold text-white shadow transition hover:bg-green-700"
            >
              {showCreatePost ? <X size={20} /> : <Plus size={20} />}
              {showCreatePost ? 'Close Form' : 'Create Post'}
            </button>

            <section className="rounded-2xl bg-white p-5 shadow-lg border border-gray-100">
              <div className="mb-3 flex items-center gap-2 text-green-700">
                <Users size={20} />
                <h3 className="font-bold text-gray-900 text-base">Eco Hub</h3>
              </div>

              <p className="text-xs leading-relaxed text-gray-600">
                Connect with fellow members, participate in local eco challenges, and share daily recycling achievements!
              </p>

              <hr className="my-3 border-gray-100" />

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-amber-500" />
                  Total Shared
                </span>
                  <span className="font-bold text-gray-800">{posts.length}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <MessageSquare size={15} className="text-blue-500" />
                  Discussions
                </span>
                  <span className="font-bold text-gray-800">
                  {Object.values(postComments).reduce(
                      (acc, curr) => acc + curr.length,
                      0
                  )}
                </span>
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: MAIN FEED (8 Columns wide on md+) */}
          <div className="space-y-5 md:col-span-8">
            {/* Create Post Form */}
            {showCreatePost && (
                <div className="rounded-2xl bg-white p-5 shadow-lg border border-gray-100">
                  <h3 className="mb-3 text-base font-semibold text-gray-900">
                    Share with the community
                  </h3>

                  <label className="mb-2 block text-sm font-semibold text-gray-800" htmlFor="post-type">Post type</label>
                  <select id="post-type" value={newPostType} onChange={(event) => setNewPostType(event.target.value)} className="mb-3 w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100">
                    <option value="challenge">Challenge</option>
                    <option value="tip">Tips & Advice</option>
                    <option value="fact">Random Fact</option>
                    <option value="recycle">Recycling Achievement</option>
                    <option value="community">General Discussion</option>
                    <option value="for-sale">For Sale / Marketplace</option>
                  </select>
                  {newPostType === 'for-sale' && <div className="mb-3"><label htmlFor="sale-price" className="mb-1 block text-sm font-semibold text-gray-800">Price (optional)</label><input id="sale-price" type="text" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} placeholder="e.g. RM 25 or negotiable" className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" /></div>}
                  {newPostType === 'for-sale' && <div className="mb-3"><label htmlFor="market-listing" className="mb-1 block text-sm font-semibold text-gray-800">Link an existing Market listing (optional)</label><select id="market-listing" value={selectedListingId} onChange={(event) => { const id = event.target.value; setSelectedListingId(id); const listing = marketListings.find((item) => String(item.id) === id); if (listing) { if (!salePrice.trim() && (listing.price != null || listing.isFree)) setSalePrice(listing.isFree ? 'Free' : `RM ${listing.price}`); } }} className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"><option value="">No linked listing</option>{marketListings.filter((listing) => (listing.status || 'AVAILABLE') !== 'SOLD').map((listing) => <option key={listing.id} value={listing.id}>{listing.title}</option>)}</select><p className="mt-1 text-xs text-gray-500">Readers can open the linked listing directly in Market.</p></div>}
                  <textarea
                      value={newPost}
                      onChange={(event) => setNewPost(event.target.value)}
                      placeholder="Share your recycling journey..."
                      rows={4}
                      maxLength={1000}
                      className="w-full resize-none rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                  <div className="mt-1 text-right text-xs text-gray-500">
                    {newPost.length}/1000
                  </div>

                  <div className="mt-3 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => {
                          setNewPost('');
                          setNewPostType('tip');
                          setSalePrice('');
                          setShowCreatePost(false);
                        }}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleAddPost}
                        disabled={!newPost.trim()}
                        className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Publish
                    </button>
                  </div>
                </div>
            )}

            {/* Feed filters */}
            <div className="community-filter-panel rounded-2xl border p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2"><div><p className="text-sm font-bold">Browse posts</p><p className="text-xs opacity-70">Filter the feed by topic</p></div><span className="rounded-full bg-green-50 px-4 py-2 text-green-700 text-xs font-semibold">
            {posts.filter((post) => postFilter === 'all' || post.type === postFilter).length} posts</span></div>
              <div className="flex flex-wrap gap-2">{[{value:'all',label:'All posts'},{value:'challenge',label:'Challenges'},{value:'tip',label:'Tips'},{value:'fact',label:'Random facts'},{value:'recycle',label:'Recycling'},{value:'community',label:'Discussion'},{value:'for-sale',label:'For sale'}].map((option) => <button key={option.value} type="button" onClick={() => setPostFilter(option.value)} className={`community-filter-chip rounded-full border px-3 py-1.5 text-xs font-semibold transition ${postFilter === option.value ? 'is-selected' : ''}`}>{option.label}</button>)}</div>
            </div>
            {posts.filter((post) => postFilter === 'all' || post.type === postFilter).length === 0 ? (
                <div className="rounded-2xl bg-white p-8 text-center shadow-lg border border-gray-100">
                  <p className="text-base font-medium text-gray-600">No posts yet</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Be the first to share your recycling journey!
                  </p>
                </div>
            ) : (
                <div className="space-y-4">
                  {posts.filter((post) => postFilter === 'all' || post.type === postFilter).map((post) => (
                      <div
                          key={post.id}
                          className="rounded-2xl bg-white p-5 shadow-lg border border-gray-100 transition hover:shadow-xl"
                      >
                        {/* Post Header */}
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 font-semibold text-green-700">
                              {(post.user?.username || '?').charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 truncate">
                                {post.user?.username || 'Unknown user'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatTimeAgo(post.timestamp)}
                                {post.editedAt && ' · edited'}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className={`community-post-type rounded-full px-2.5 py-1 text-xs font-semibold type-${post.type || 'community'} ${({ challenge: 'bg-purple-100 text-purple-700', tip: 'bg-blue-100 text-blue-700', fact: 'bg-amber-100 text-amber-800', recycle: 'bg-green-100 text-green-700', community: 'bg-slate-100 text-slate-700', 'for-sale': 'bg-pink-100 text-pink-700' })[post.type] || 'bg-slate-100 text-slate-700'}`}>
                              {({ challenge: 'Challenge', tip: 'Tips & Advice', fact: 'Random Fact', recycle: 'Recycling', community: 'Discussion', 'for-sale': 'For Sale' })[post.type] || 'Community'}
                            </span>

                            {/* Options Dropdown Menu */}
                            <div className="relative">
                              <button
                                  type="button"
                                  onClick={() =>
                                      setOpenMenuId(
                                          openMenuId === post.id ? null : post.id
                                      )
                                  }
                                  className="rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                                  aria-label="Post options"
                              >
                                <MoreVertical size={18} />
                              </button>

                              {openMenuId === post.id && (
                                  <div className="absolute right-0 top-8 z-20 min-w-36 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                                    {post.isOwnPost && editingPostId !== post.id && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                              handleStartEdit(post);
                                              setOpenMenuId(null);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                                        >
                                          <Pencil size={15} /> Edit post
                                        </button>
                                    )}
                                    {post.isOwnPost && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                              handleDeletePost(post.id);
                                              setOpenMenuId(null);
                                            }}
                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 size={15} /> Delete post
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleShare(post)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                      <Share2 size={15} /> Share post
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                          setOpenCommentsId(
                                              openCommentsId === post.id ? null : post.id
                                          );
                                          setOpenMenuId(null);
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                      <MessageCircle size={15} /> View comments
                                    </button>
                                  </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Edit Form or Post Content */}
                        {editingPostId === post.id ? (
                            <div className="mb-3">
                      <textarea
                          value={editedContent}
                          onChange={(event) =>
                              setEditedContent(event.target.value)
                          }
                          rows={4}
                          maxLength={1000}
                          autoFocus
                          className="w-full resize-none rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />

                              <div className="mt-1 text-right text-xs text-gray-500">
                                {editedContent.length}/1000
                              </div>

                              <div className="mt-2 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={handleCancelEdit}
                                    className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSaveEdit}
                                    disabled={!editedContent.trim()}
                                    className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  Save Changes
                                </button>
                              </div>
                            </div>
                        ) : (
                            <>
                              {post.type === 'for-sale' && post.price && <p className="mb-2 inline-flex rounded-lg bg-pink-50 px-3 py-1.5 text-sm font-bold text-pink-700">Price: {post.price}</p>}
                              {post.type === 'for-sale' && post.listingId && <Link to={`/market?listingId=${encodeURIComponent(post.listingId)}`} className="community-listing-link mb-3 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition"><ShoppingBag size={16} /> View Market listing: {post.listingTitle || 'Open listing'} <span aria-hidden="true">→</span></Link>}
                              <p className="mb-3 leading-relaxed text-sm text-gray-800 whitespace-pre-wrap break-words">{post.content}</p>
                            </>
                        )}

                        {/* Optional Image */}
                        {post.image && (
                            <img
                                src={post.image}
                                alt="Post attachment"
                                className="mb-3 max-h-80 w-full rounded-xl object-cover"
                            />
                        )}

                        {/* Like, Comment and Share Bar */}
                        <div className="flex items-center gap-6 border-t border-gray-100 pt-3 text-gray-600">
                          <button
                              type="button"
                              onClick={() => handleLike(post.id)}
                              className={`flex items-center gap-1.5 text-xs font-medium transition ${
                                  likedPosts.includes(post.id)
                                      ? 'text-red-600'
                                      : 'hover:text-red-600'
                              }`}
                              aria-label="Like post"
                          >
                            <Heart
                                size={17}
                                fill={
                                  likedPosts.includes(post.id) ? 'currentColor' : 'none'
                                }
                            />
                            <span>{post.likes}</span>
                          </button>

                          <button
                              type="button"
                              onClick={() =>
                                  setOpenCommentsId(
                                      openCommentsId === post.id ? null : post.id
                                  )
                              }
                              className="flex items-center gap-1.5 text-xs font-medium transition hover:text-blue-600"
                              aria-label="View comments"
                          >
                            <MessageCircle size={17} />
                            <span>{post.comments}</span>
                          </button>

                          <button
                              type="button"
                              onClick={() => handleShare(post)}
                              className="flex items-center gap-1.5 text-xs font-medium transition hover:text-green-600"
                              aria-label="Share post"
                          >
                            <Share2 size={17} />
                            <span>Share</span>
                          </button>
                        </div>

                        {/* Comments Section */}
                        {openCommentsId === post.id && (
                            <div className="mt-3 border-t border-gray-100 pt-3">
                              <h4 className="mb-2 text-xs font-bold text-gray-800">
                                Comments ({(postComments[post.id] || []).length})
                              </h4>
                              <div className="mb-3 space-y-2">
                                {(postComments[post.id] || []).length === 0 ? (
                                    <p className="text-xs text-gray-500">
                                      No comments yet. Start the conversation.
                                    </p>
                                ) : (
                                    (postComments[post.id] || []).map((comment) => (
                                        <div key={comment.id} className="flex gap-2">
                                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
                                            {comment.username.charAt(0)}
                                          </div>
                                          <div className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2">
                                            <p className="text-[11px] font-semibold text-gray-700">
                                              {comment.username}
                                            </p>
                                            <p className="text-xs text-gray-800 whitespace-pre-wrap break-words">
                                              {comment.content}
                                            </p>
                                          </div>
                                        </div>
                                    ))
                                )}
                              </div>
                              <form
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    handleAddComment(post.id);
                                  }}
                                  className="flex gap-2"
                              >
                                <input
                                    value={commentDrafts[post.id] || ''}
                                    onChange={(event) =>
                                        setCommentDrafts((current) => ({
                                          ...current,
                                          [post.id]: event.target.value,
                                        }))
                                    }
                                    maxLength={500}
                                    placeholder="Write a comment..."
                                    className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    type="submit"
                                    disabled={!(commentDrafts[post.id] || '').trim()}
                                    className="rounded-xl bg-green-600 px-3 py-1.5 text-white disabled:opacity-40"
                                    aria-label="Send comment"
                                >
                                  <Send size={15} />
                                </button>
                              </form>
                            </div>
                        )}
                      </div>
                  ))}
                </div>
            )}
          </div>
        </div>
      </div>
  );
}
