
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
} from 'lucide-react';
import { recycleApi } from '../api/api';

export default function CommunityPosts({ userId }) {
  const [posts, setPosts] = useState(() => { try { return JSON.parse(localStorage.getItem('34district-local-posts') || '[]'); } catch { return []; } });
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Edit post state
  const [editingPostId, setEditingPostId] = useState(null);
  const [editedContent, setEditedContent] = useState('');

  // Liked post IDs (local state)
  const [likedPosts, setLikedPosts] = useState([]);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [postComments, setPostComments] = useState(() => { try { return JSON.parse(localStorage.getItem('34district-comments') || '{}'); } catch { return {}; } });

  useEffect(() => {
    loadPosts();
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
          type: 'tip',
        },
      ];

      let historyPosts = [];

      try {
        if (userId != null) {
          const response = await recycleApi.getHistory(userId);
          const data = Array.isArray(response?.data)
              ? response.data
              : [];

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
        const localPosts = previousPosts.filter(
            (post) => post.isLocal
        );

        return [
          ...localPosts,
          ...communityPosts,
          ...historyPosts,
        ];
      });
    } catch (error) {
      console.error('Failed to load posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { localStorage.setItem('34district-comments', JSON.stringify(postComments)); }, [postComments]);
  useEffect(() => { localStorage.setItem('34district-local-posts', JSON.stringify(posts.filter((post) => post.isLocal))); }, [posts]);

  const handleAddComment = (postId) => {
    const content = (commentDrafts[postId] || '').trim();
    if (!content) return;
    setPostComments((current) => ({ ...current, [postId]: [...(current[postId] || []), { id: `${Date.now()}-${Math.random()}`, username: 'You', content, timestamp: new Date().toISOString() }] }));
    setCommentDrafts((current) => ({ ...current, [postId]: '' }));
    setPosts((current) => current.map((post) => post.id === postId ? { ...post, comments: (post.comments || 0) + 1 } : post));
  };

  const handleShare = async (post) => {
    try {
      if (navigator.share) await navigator.share({ title: '34district community post', text: post.content });
      else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(post.content); alert('Post copied to clipboard!'); }
      else window.prompt('Copy this post to share:', post.content);
    } catch (error) { if (error.name !== 'AbortError') console.error('Could not share post:', error); }
    setOpenMenuId(null);
  };

  // Create a new post
  const handleAddPost = () => {
    const content = newPost.trim();

    if (!content) return;

    const post = {
      id: `local-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      user: { username: 'You' },
      content,
      likes: 0,
      comments: 0,
      timestamp: new Date().toISOString(),
      type: 'community',
      isLocal: true,
      isOwnPost: true,
    };

    setPosts((previousPosts) => [post, ...previousPosts]);
    setNewPost('');
    setShowCreatePost(false);
  };

  // Open the edit form
  const handleStartEdit = (post) => {
    setEditingPostId(post.id);
    setEditedContent(post.content);
    setShowCreatePost(false);
  };

  // Save edited post
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

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingPostId(null);
    setEditedContent('');
  };

  // Delete a post
  const handleDeletePost = (postId) => {
    if (
        !window.confirm('Are you sure you want to delete this post?')
    ) {
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
                  likes: Math.max(
                      0,
                      post.likes + (alreadyLiked ? -1 : 1)
                  ),
                }
                : post
        )
    );
  };

  // Format timestamp
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
        <div className="max-w-md mx-auto p-6 text-center text-gray-500">
          Loading community posts...
        </div>
    );
  }

  return (
      <div className="max-w-md mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <h2 className="text-2xl font-bold">Community Posts</h2>

          <div className="flex items-center gap-2 text-green-600">
            <TrendingUp size={20} />
            <span className="font-semibold">Active</span>
          </div>
        </div>

        {/* Create Post Button */}
        <button
            type="button"
            onClick={() => setShowCreatePost((previous) => !previous)}
            className="w-full flex items-center justify-center gap-2
          bg-green-600 hover:bg-green-700 text-white font-semibold
          py-3 px-4 rounded-lg mb-5 transition"
        >
          {showCreatePost ? <X size={20} /> : <Plus size={20} />}
          {showCreatePost ? 'Close Form' : 'Create Post'}
        </button>

        {/* Create Post Form */}
        {showCreatePost && (
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Share with the community
              </h3>

              <textarea
                  value={newPost}
                  onChange={(event) => setNewPost(event.target.value)}
                  placeholder="Share your recycling journey..."
                  rows={4}
                  maxLength={1000}
                  className="w-full border border-gray-300 rounded-lg p-3
              resize-none focus:outline-none focus:ring-2
              focus:ring-green-500"
              />

              <div className="text-right text-xs text-gray-500 mt-1">
                {newPost.length}/1000
              </div>

              <div className="flex justify-end gap-2 mt-3">
                <button
                    type="button"
                    onClick={() => {
                      setNewPost('');
                      setShowCreatePost(false);
                    }}
                    className="px-4 py-2 rounded-lg border border-gray-300
                hover:bg-gray-100"
                >
                  Cancel
                </button>

                <button
                    type="button"
                    onClick={handleAddPost}
                    disabled={!newPost.trim()}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white
                hover:bg-green-700 disabled:opacity-50"
                >
                  Publish
                </button>
              </div>
            </div>
        )}

        {/* Empty State */}
        {posts.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">No posts yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Be the first to share your recycling journey!
              </p>
            </div>
        ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                  <div
                      key={post.id}
                      className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
                  >
                    {/* Post Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-10 h-10 flex-shrink-0 bg-green-100
                  rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold">
                    {(post.user?.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                  </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold break-words">
                          {post.user?.username || 'Unknown user'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTimeAgo(post.timestamp)}
                          {post.editedAt && ' · edited'}
                        </p>
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

                    {/* Edit Form or Post Content */}
                    {editingPostId === post.id ? (
                        <div className="mb-4">
                  <textarea
                      value={editedContent}
                      onChange={(event) =>
                          setEditedContent(event.target.value)
                      }
                      rows={4}
                      maxLength={1000}
                      autoFocus
                      className="w-full border border-gray-300 rounded-lg p-3
                      resize-none focus:outline-none focus:ring-2
                      focus:ring-blue-500"
                  />

                          <div className="text-right text-xs text-gray-500 mt-1">
                            {editedContent.length}/1000
                          </div>

                          <div className="flex justify-end gap-2 mt-3">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                className="px-3 py-2 rounded-lg border border-gray-300
                        hover:bg-gray-100"
                            >
                              Cancel
                            </button>

                            <button
                                type="button"
                                onClick={handleSaveEdit}
                                disabled={!editedContent.trim()}
                                className="px-3 py-2 rounded-lg bg-blue-600 text-white
                        hover:bg-blue-700 disabled:opacity-50"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                    ) : (
                        <p className="text-gray-800 mb-3 whitespace-pre-wrap break-words">
                          {post.content}
                        </p>
                    )}

                    {/* Optional Image */}
                    {post.image && (
                        <img
                            src={post.image}
                            alt="Post attachment"
                            className="w-full rounded-lg mb-3 object-cover"
                        />
                    )}

                    {/* YouTube-style post actions menu */}
                    <div className="relative mb-2 flex justify-end">
                      <button type="button" onClick={() => setOpenMenuId(openMenuId === post.id ? null : post.id)} className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900" aria-label="Post options" aria-expanded={openMenuId === post.id}><MoreVertical size={20}/></button>
                      {openMenuId === post.id && <div className="absolute right-0 top-10 z-20 min-w-40 rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
                        {post.isOwnPost && editingPostId !== post.id && <button type="button" onClick={() => { handleStartEdit(post); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"><Pencil size={16}/> Edit post</button>}
                        {post.isOwnPost && <button type="button" onClick={() => { handleDeletePost(post.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"><Trash2 size={16}/> Delete post</button>}
                        <button type="button" onClick={() => handleShare(post)} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"><Share2 size={16}/> Share post</button>
                        <button type="button" onClick={() => { setOpenCommentsId(openCommentsId === post.id ? null : post.id); setOpenMenuId(null); }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"><MessageCircle size={16}/> View comments</button>
                      </div>}
                    </div>

                    {/* Like, Comment and Share */}
                    <div className="flex items-center gap-6 text-gray-600">
                      <button
                          type="button"
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-2 transition ${
                              likedPosts.includes(post.id)
                                  ? 'text-red-600'
                                  : 'hover:text-red-600'
                          }`}
                          aria-label="Like post"
                      >
                        <Heart
                            size={18}
                            fill={
                              likedPosts.includes(post.id)
                                  ? 'currentColor'
                                  : 'none'
                            }
                        />
                        <span className="text-sm">{post.likes}</span>
                      </button>

                      <button
                          type="button"
                          onClick={() => setOpenCommentsId(openCommentsId === post.id ? null : post.id)}
                          className="flex items-center gap-2 hover:text-blue-600 transition"
                          aria-label="View comments"
                      >
                        <MessageCircle size={18} />
                        <span className="text-sm">{post.comments}</span>
                      </button>

                      <button type="button" onClick={() => handleShare(post)} className="flex items-center gap-2 transition hover:text-green-600" aria-label="Share post"><Share2 size={18}/><span className="text-sm">Share</span></button>
                    </div>
                    {openCommentsId === post.id && <div className="mt-4 border-t border-gray-100 pt-4">
                      <h4 className="mb-3 text-sm font-bold text-gray-800">Comments ({(postComments[post.id] || []).length})</h4>
                      <div className="mb-3 space-y-3">{(postComments[post.id] || []).length === 0 ? <p className="text-sm text-gray-500">No comments yet. Start the conversation.</p> : (postComments[post.id] || []).map((comment) => <div key={comment.id} className="flex gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">{comment.username.charAt(0)}</div><div className="min-w-0 flex-1 rounded-xl bg-gray-50 px-3 py-2"><p className="text-xs font-semibold text-gray-700">{comment.username}</p><p className="whitespace-pre-wrap break-words text-sm text-gray-800">{comment.content}</p></div></div>)}</div>
                      <form onSubmit={(event) => { event.preventDefault(); handleAddComment(post.id); }} className="flex gap-2"><input value={commentDrafts[post.id] || ''} onChange={(event) => setCommentDrafts((current) => ({ ...current, [post.id]: event.target.value }))} maxLength={500} placeholder="Write a comment..." className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"/><button type="submit" disabled={!(commentDrafts[post.id] || '').trim()} className="rounded-xl bg-green-600 px-3 py-2 text-white disabled:opacity-40" aria-label="Send comment"><Send size={17}/></button></form>
                    </div>}
                  </div>
              ))}
            </div>
        )}
      </div>
  );
}
