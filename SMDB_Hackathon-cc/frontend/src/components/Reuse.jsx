import { useState, useEffect, useCallback } from 'react';
import {
  Wrench,
  Play,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Loader2,
  BookOpen,
  Package,
  X,
  ExternalLink,
} from 'lucide-react';

const DIFFICULTIES = ['All', 'Easy', 'Medium', 'Hard'];

function getYoutubeEmbedUrl(url) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    let videoId = null;

    if (host === 'youtu.be' || host.endsWith('.youtu.be')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[0];
    } else if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com')
    ) {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v');
      } else {
        const parts = parsed.pathname.split('/').filter(Boolean);

        if (
          ['embed', 'shorts', 'live'].includes(parts[0]) &&
          parts[1]
        ) {
          videoId = parts[1];
        }
      }
    }

    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

export default function Reuse({ item, onClose }) {
  const [guides, setGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const itemName = item?.name || item?.itemName || 'this item';
  const material = item?.material || '';
  const itemId = item?.id || item?._id || item?.itemId;

  const loadGuides = useCallback(async () => {
    if (!itemId) {
      setGuides([]);
      setError(
        'The scanned item ID is missing. Please scan and confirm the item again.'
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setSelectedGuide(null);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';

      const response = await fetch(`${apiBase}/reuse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId,
          difficulty: 'all',
        }),
      });

      if (!response.ok) {
        let message = `Unable to load reuse ideas (HTTP ${response.status}).`;

        try {
          const body = await response.json();
          message = body.message || body.error || message;
        } catch {
          // Keep the default error message.
        }

        throw new Error(message);
      }

      const data = await response.json();
      const ideas = Array.isArray(data?.ideas) ? data.ideas : [];

      const mapped = ideas.map((idea, index) => ({
        ...idea,
        id: `${idea.sourceUrl || idea.title || 'idea'}-${index}`,
        materials: Array.isArray(idea.materials) ? idea.materials : [],
        tools: Array.isArray(idea.tools) ? idea.tools : [],
        steps: Array.isArray(idea.steps) ? idea.steps : [],
        embedUrl: getYoutubeEmbedUrl(idea.tutorialUrl),
      }));

      setGuides(mapped);
    } catch (err) {
      console.error('Failed to load reuse ideas:', err);
      setGuides([]);
      setError(
        err.message || 'Unable to load reuse ideas. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [itemId]);

  useEffect(() => {
    loadGuides();
  }, [loadGuides]);

  const close = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const filteredGuides =
    selectedDifficulty === 'All'
      ? guides
      : guides.filter(
          (guide) =>
            (guide.difficulty || '').toLowerCase() ===
            selectedDifficulty.toLowerCase()
        );

  const groupedGuides = {
    All: filteredGuides,
    Easy: filteredGuides.filter(
      (guide) => (guide.difficulty || '').toLowerCase() === 'easy'
    ),
    Medium: filteredGuides.filter(
      (guide) => (guide.difficulty || '').toLowerCase() === 'medium'
    ),
    Hard: filteredGuides.filter(
      (guide) => (guide.difficulty || '').toLowerCase() === 'hard'
    ),
  };

  if (selectedGuide) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-5 rounded-2xl bg-white p-5 shadow-lg sm:p-6">
        <button
          type="button"
          onClick={() => setSelectedGuide(null)}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-green-700"
        >
          <ArrowLeft size={20} />
          Back to all ideas
        </button>

        <div>
          <div className="mb-2 flex items-center gap-2 text-green-700">
            <Wrench size={22} />
            <span className="text-sm font-semibold">
              DIY REUSE GUIDE
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {selectedGuide.title || 'DIY Reuse Idea'}
          </h2>

          {selectedGuide.summary && (
            <p className="mt-3 leading-relaxed text-gray-600">
              {selectedGuide.summary}
            </p>
          )}

          <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm capitalize text-green-800">
            {selectedGuide.difficulty || 'Difficulty not specified'}
          </span>

          {selectedGuide.finalProduct && (
            <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">
              <strong>Final product:</strong> {selectedGuide.finalProduct}
            </p>
          )}
        </div>

        {selectedGuide.embedUrl ? (
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 font-semibold text-gray-900">
              <Play size={19} className="text-red-600" />
              YouTube Video Tutorial
            </h3>

            <div className="overflow-hidden rounded-xl bg-black">
              <div className="aspect-video">
                <iframe
                  src={selectedGuide.embedUrl}
                  title={`YouTube tutorial for ${selectedGuide.title}`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                />
              </div>
            </div>

            <a
              href={selectedGuide.tutorialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:underline"
            >
              Watch on YouTube
              <ExternalLink size={15} />
            </a>
          </section>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-medium text-amber-900">
              No matching YouTube video found
            </p>
            <p className="mt-1 text-sm text-amber-800">
              We couldn't find a valid YouTube video for this idea.
              We won't display an ordinary website as a video tutorial.
            </p>
          </div>
        )}

        {selectedGuide.materials.length > 0 && (
          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Package size={19} />
              Materials Needed
            </h3>

            <ul className="list-inside list-disc space-y-2 text-gray-700">
              {selectedGuide.materials.map((value, index) => (
                <li key={`${value}-${index}`}>{value}</li>
              ))}
            </ul>
          </section>
        )}

        {selectedGuide.tools.length > 0 && (
          <section className="rounded-xl border border-gray-200 p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              <Wrench size={19} />
              Tools Needed
            </h3>

            <ul className="list-inside list-disc space-y-2 text-gray-700">
              {selectedGuide.tools.map((value, index) => (
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

          {selectedGuide.steps.length > 0 ? (
            <ol className="space-y-4">
              {selectedGuide.steps.map((step, index) => (
                <li
                  key={`${index}-${step}`}
                  className="flex items-start gap-3"
                >
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
              The search results did not provide step-by-step instructions.
              Use the video tutorial if one is available.
            </p>
          )}
        </section>

        {selectedGuide.sourceUrl && (
          <a
            href={selectedGuide.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:underline"
          >
            View project source
            <ExternalLink size={14} />
          </a>
        )}

        <button
          type="button"
          onClick={close}
          className="w-full rounded-xl bg-gray-800 px-5 py-3 font-semibold text-white hover:bg-gray-900"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl bg-white p-5 shadow-lg sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-green-700">
            <Wrench size={22} />
            <span className="text-sm font-semibold">
              GIVE ITEMS A SECOND LIFE
            </span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Reuse Ideas
          </h2>

          <p className="mt-1 text-gray-600">
            DIY projects for {itemName}
          </p>

          {material && (
            <span className="mt-3 inline-flex rounded-full bg-green-100 px-3 py-1 text-sm capitalize text-green-800">
              {material}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={close}
          aria-label="Close reuse ideas"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
        >
          <X size={20} />
        </button>
      </div>

      {!loading && !error && (
        <div className="sticky top-0 z-10 -mx-1 rounded-xl bg-white px-1 pb-2 pt-1">
          <div className="grid grid-cols-4 gap-2 rounded-xl bg-gray-100 p-1">
            {DIFFICULTIES.map((difficulty) => (
              <button
                key={difficulty}
                type="button"
                onClick={() => setSelectedDifficulty(difficulty)}
                aria-pressed={selectedDifficulty === difficulty}
                className={`rounded-lg px-2 py-3 text-sm font-semibold transition sm:text-base ${
                  selectedDifficulty === difficulty
                    ? 'bg-green-600 text-white shadow'
                    : 'text-gray-600 hover:bg-white hover:text-green-700'
                }`}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          <p className="font-medium text-gray-800">
            Finding Easy, Medium and Hard projects...
          </p>
          <p className="text-sm text-gray-500">
            Searching for reuse instructions and YouTube tutorials.
          </p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-red-600" />

            <div>
              <p className="font-medium text-red-800">
                Could not load reuse ideas
              </p>
              <p className="mt-1 break-words text-sm text-red-700">
                {error}
              </p>

              <button
                type="button"
                onClick={loadGuides}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                <RefreshCw size={16} />
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              {selectedDifficulty === 'All'
                ? 'All Reuse Ideas'
                : `${selectedDifficulty} Reuse Ideas`}
            </h3>

            <span className="text-sm text-gray-500">
              {filteredGuides.length}{' '}
              {filteredGuides.length === 1 ? 'idea' : 'ideas'}
            </span>
          </div>

          {filteredGuides.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
              <Wrench className="mx-auto mb-3 h-10 w-10 text-gray-400" />
              <h3 className="font-semibold text-gray-800">
                No {selectedDifficulty === 'All'
                  ? ''
                  : `${selectedDifficulty.toLowerCase()} `}
                reuse ideas found
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {selectedDifficulty === 'All'
                  ? `No suitable projects were returned for ${itemName}.`
                  : `No ${selectedDifficulty.toLowerCase()} projects were found for ${itemName}. Try another difficulty.`}
              </p>

              {selectedDifficulty !== 'All' && (
                <button
                  type="button"
                  onClick={() => setSelectedDifficulty('All')}
                  className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  View All Ideas
                </button>
              )}

              <button
                type="button"
                onClick={loadGuides}
                className="mt-4 ml-2 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <RefreshCw size={16} />
                Search Again
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGuides.map((guide) => (
                <button
                  key={guide.id}
                  type="button"
                  onClick={() => setSelectedGuide(guide)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-green-300 hover:bg-green-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-gray-900">
                          {guide.title || 'DIY Reuse Idea'}
                        </h4>

                        <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                          {guide.difficulty || 'Unspecified'}
                        </span>
                      </div>

                      {guide.summary && (
                        <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                          {guide.summary}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-3 text-sm">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <BookOpen size={15} />
                          {guide.steps.length} steps
                        </span>

                        {guide.embedUrl && (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <Play size={15} />
                            YouTube tutorial
                          </span>
                        )}
                      </div>
                    </div>

                    <ArrowLeft
                      size={18}
                      className="mt-1 shrink-0 rotate-180 text-green-700"
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={close}
        className="w-full rounded-xl bg-gray-800 px-5 py-3 font-semibold text-white hover:bg-gray-900"
      >
        Close
      </button>
    </div>
  );
}