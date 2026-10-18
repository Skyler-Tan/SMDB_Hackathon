import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  ExternalLink,
  Loader2,
  Package,
  Play,
  Trash2,
  Wrench,
  AlertCircle,
} from 'lucide-react';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getYoutubeEmbedUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let videoId = null;

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[0];
    } else if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else {
        const parts = parsed.pathname.split('/').filter(Boolean);
        if (['embed', 'shorts', 'live'].includes(parts[0]) && parts[1]) {
          videoId = parts[1];
        }
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) return null;
    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function normalizeIdea(idea) {
  return {
    ...idea,
    materials: Array.isArray(idea.materials) ? idea.materials : [],
    tools: Array.isArray(idea.tools) ? idea.tools : [],
    steps: Array.isArray(idea.steps) ? idea.steps : [],
    embedUrl: getYoutubeEmbedUrl(idea.tutorialUrl),
  };
}

async function responseError(response, fallback) {
  try {
    const body = await response.json();
    return new Error(body.message || body.error || fallback);
  } catch {
    return new Error(fallback);
  }
}

export default function SavedIdeas({ userId }) {
  const navigate = useNavigate();
  const me = userId || 'demo-user';

  const [ideas, setIdeas] = useState([]);
  const [selected, setSelected] = useState(null);
  const [difficulty, setDifficulty] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/ideas/saved?userId=${encodeURIComponent(me)}`
      );

      if (!response.ok) {
        throw await responseError(response, 'Could not load saved ideas.');
      }

      const data = await response.json();
      setIdeas(Array.isArray(data) ? data.map(normalizeIdea) : []);
    } catch (err) {
      console.error('Failed to load saved ideas:', err);
      setError(err.message || 'Could not load saved ideas.');
    } finally {
      setLoading(false);
    }
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (idea) => {
    if (removingId) return;

    setRemovingId(idea.id);
    setError('');

    try {
      const response = await fetch(
        `${API_BASE}/ideas/saved/${idea.id}?userId=${encodeURIComponent(me)}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw await responseError(response, 'Could not remove this idea.');
      }

      setIdeas((previous) => previous.filter((entry) => entry.id !== idea.id));
      setSelected(null);
    } catch (err) {
      console.error('Failed to remove idea:', err);
      setError(err.message || 'Could not remove this idea.');
    } finally {
      setRemovingId(null);
    }
  };

  const filtered =
    difficulty === 'All'
      ? ideas
      : ideas.filter(
          (idea) =>
            (idea.difficulty || '').toLowerCase() === difficulty.toLowerCase()
        );

  // ---------- Detail view ----------
  if (selected) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 rounded-2xl bg-white p-5 shadow-lg sm:p-6">
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-green-700"
        >
          <ArrowLeft size={20} />
          Back to saved ideas
        </button>

        <div>
          <div className="mb-2 flex items-center gap-2 text-green-700">
            <Wrench size={22} />
            <span className="text-sm font-semibold">SAVED REUSE GUIDE</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {selected.title || 'DIY Reuse Idea'}
          </h2>

          {selected.itemName && (
            <p className="mt-1 text-sm text-gray-500">For: {selected.itemName}</p>
          )}

          {selected.summary && (
            <p className="mt-3 leading-relaxed text-gray-600">
              {selected.summary}
            </p>
          )}

          <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm capitalize text-green-800">
            {selected.difficulty || 'Difficulty not specified'}
          </span>

          {selected.finalProduct && (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <strong>Final product:</strong> {selected.finalProduct}
            </p>
          )}
        </div>

        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => remove(selected)}
          disabled={removingId === selected.id}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
        >
          {removingId === selected.id ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Trash2 size={18} />
          )}
          Remove from saved
        </button>

        {selected.embedUrl && (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Play size={19} className="text-red-600" />
              YouTube Video Tutorial
            </h3>

            <div className="overflow-hidden rounded-xl bg-black">
              <div className="aspect-video">
                <iframe
                  src={selected.embedUrl}
                  title={`YouTube tutorial for ${selected.title}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            <a
              href={selected.tutorialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:underline"
            >
              Watch on YouTube
              <ExternalLink size={15} />
            </a>
          </section>
        )}

        {selected.materials.length > 0 && (
          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Package size={19} />
              Materials Needed
            </h3>

            <ul className="list-inside list-disc space-y-2 text-gray-700">
              {selected.materials.map((value, index) => (
                <li key={`${value}-${index}`}>{value}</li>
              ))}
            </ul>
          </section>
        )}

        {selected.tools.length > 0 && (
          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Wrench size={19} />
              Tools Needed
            </h3>

            <ul className="list-inside list-disc space-y-2 text-gray-700">
              {selected.tools.map((value, index) => (
                <li key={`${value}-${index}`}>{value}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-xl border border-gray-200 p-4">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <BookOpen size={19} />
            Step-by-Step Instructions
          </h3>

          {selected.steps.length > 0 ? (
            <ol className="space-y-4">
              {selected.steps.map((step, index) => (
                <li key={`${index}-${step}`} className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-800">
                    {index + 1}
                  </span>

                  <span className="pt-1 leading-relaxed text-gray-700">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-gray-600">
              No step-by-step instructions were saved with this idea.
            </p>
          )}
        </section>

        {selected.sourceUrl && (
          <a
            href={selected.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline"
          >
            View project source
            <ExternalLink size={14} />
          </a>
        )}
      </div>
    );
  }

  // ---------- List view ----------
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl bg-white p-5 shadow-lg sm:p-6">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-3 inline-flex items-center gap-2 text-gray-600 hover:text-green-700"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="mb-2 flex items-center gap-2 text-green-700">
          <Bookmark size={22} />
          <span className="text-sm font-semibold">YOUR COLLECTION</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-900">Saved Ideas</h2>
        <p className="mt-1 text-gray-600">Reuse ideas you've kept for later</p>
      </div>

      <div className="grid grid-cols-4 gap-2 rounded-xl bg-gray-100 p-1">
        {DIFFICULTIES.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => setDifficulty(level)}
            aria-pressed={difficulty === level}
            className={`rounded-lg px-2 py-3 text-sm font-semibold transition sm:text-base ${
              difficulty === level
                ? 'bg-green-600 text-white shadow'
                : 'text-gray-600 hover:bg-white hover:text-green-700'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      )}

      {!loading && error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-2 text-sm font-medium text-red-700 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <Bookmark className="mx-auto mb-3 h-10 w-10 text-gray-400" />
          <h3 className="font-semibold text-gray-800">No saved ideas yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            {ideas.length === 0
              ? 'Tap Save on any reuse idea to keep it here.'
              : `You have no saved ${difficulty.toLowerCase()} ideas.`}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((idea) => (
            <button
              key={idea.id}
              type="button"
              onClick={() => setSelected(idea)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-green-300 hover:bg-green-50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="font-semibold text-gray-900">
                  {idea.title || 'DIY Reuse Idea'}
                </h4>

                <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                  {idea.difficulty || 'Unspecified'}
                </span>
              </div>

              {idea.itemName && (
                <p className="mt-1 text-xs text-gray-500">For: {idea.itemName}</p>
              )}

              {idea.summary && (
                <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                  {idea.summary}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-1 text-gray-600">
                  <BookOpen size={15} />
                  {idea.steps.length} steps
                </span>

                {idea.embedUrl && (
                  <span className="inline-flex items-center gap-1 text-red-600">
                    <Play size={15} />
                    YouTube tutorial
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}