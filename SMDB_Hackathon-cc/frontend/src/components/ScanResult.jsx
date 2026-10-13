import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { scanApi } from '../api/api';

/** Normalise confidence: backend may return 0–1 float or 0–100 integer */
function toPercent(confidence) {
  const v = Number(confidence);
  if (!Number.isFinite(v)) return 0;
  const p = v <= 1 ? v * 100 : v;
  return Math.max(0, Math.min(100, p));
}

/** Map percentage to level — mirrors Angular getConfidenceLevel() */
function getLevel(pct) {
  if (pct >= 80) return 'high';
  if (pct >= 60) return 'medium';
  return 'low';
}

const LEVEL_STYLES = {
  high:   { pill: 'bg-green-100 text-green-800',  label: 'High confidence'   },
  medium: { pill: 'bg-yellow-100 text-yellow-800', label: 'Medium confidence' },
  low:    { pill: 'bg-red-100 text-red-800',       label: 'Low confidence'    },
};

/** Condition ring colour based on score — mirrors Angular ring-* classes */
function ringColor(score) {
  if (score >= 80) return { ring: 'border-green-500',  text: 'text-green-500'  };
  if (score >= 60) return { ring: 'border-green-400',  text: 'text-green-400'  };
  if (score >= 40) return { ring: 'border-yellow-400', text: 'text-yellow-400' };
  return               { ring: 'border-red-500',   text: 'text-red-500'   };
}

function barColor(score) {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-green-400';
  if (score >= 40) return 'bg-yellow-400';
  return 'bg-red-500';
}

export default function ScanResult({ result, onConfirm, onCorrect, onRecycle, onReuse }) {
  const {
    itemId, name, brand, size, material,
    recyclable, bin, notes, identificationConfirmed,
    confidence, conditionScore, conditionLabel, conditionTips = [],
  } = result;

  const confidencePct = toPercent(confidence);
  const level = getLevel(confidencePct);

  // If backend already confirmed (high confidence auto-confirm) treat as confirmed
  const [confirmed, setConfirmed] = useState(!!identificationConfirmed);
  const [showCorrectInput, setShowCorrectInput] = useState(false);
  const [correctedName, setCorrectedName] = useState('');
  const [correctError, setCorrectError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [recyclingData, setRecyclingData] = useState(
    // Use whatever the initial result already has
    { recyclable, bin, notes }
  );
  const [recyclingLoading, setRecyclingLoading] = useState(false);

  // Auto-run recycling check whenever the item becomes confirmed
  useEffect(() => {
    if (!confirmed || !itemId) return;
    // Only fetch if recycling status is still UNVERIFIED
    if (result.recyclingStatus && result.recyclingStatus !== 'UNVERIFIED') {
      setRecyclingData({ recyclable: result.recyclable, bin: result.bin, notes: result.notes });
      return;
    }
    setRecyclingLoading(true);
    scanApi.loadRecycling(itemId)
      .then((res) => {
        const d = res.data;
        setRecyclingData({ recyclable: d.recyclable, bin: d.bin, notes: d.notes });
        // Propagate updated result upward so Scan.jsx state stays in sync
        onConfirm({ ...result, ...d, identificationConfirmed: true });
      })
      .catch((err) => {
        console.error('Recycling check failed:', err);
      })
      .finally(() => setRecyclingLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed, itemId]);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await scanApi.confirmIdentification(itemId);
      setConfirmed(true);
      // recycling check fires via useEffect when confirmed becomes true
    } catch (err) {
      console.error('Failed to confirm:', err);
    } finally {
      setBusy(false);
    }
  };

  const handleCorrectSubmit = async () => {
    const trimmed = correctedName.trim();
    if (!trimmed) { setCorrectError('Please enter a name.'); return; }
    setBusy(true);
    setCorrectError(null);
    try {
      await scanApi.correctItemName(itemId, trimmed);
      setConfirmed(true);
      setShowCorrectInput(false);
      setCorrectedName('');
      onCorrect(trimmed);
      // recycling check fires via useEffect
    } catch (err) {
      console.error('Failed to correct:', err);
      setCorrectError('Failed to update. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const levelStyles = LEVEL_STYLES[level];
  const ringStyle   = conditionScore != null ? ringColor(conditionScore) : null;

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg space-y-4">
      {/* ── Header ── */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">
          AI Scan Result
        </p>
        <h2 className="text-2xl font-bold">{name}</h2>
      </div>

      {/* ── Item details ── */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {brand && brand !== 'unknown' && (
          <div><span className="text-gray-500">Brand</span><p className="font-semibold">{brand}</p></div>
        )}
        {size && size !== 'unknown' && (
          <div><span className="text-gray-500">Size</span><p className="font-semibold">{size}</p></div>
        )}
        {material && (
          <div><span className="text-gray-500">Material</span><p className="font-semibold">{material}</p></div>
        )}
        <div>
          <span className="text-gray-500">AI confidence</span>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="font-semibold">{confidencePct.toFixed(0)}%</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${levelStyles.pill}`}>
              {levelStyles.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Condition / Recyclability score card — mirrors Angular condition-card ── */}
      {conditionScore != null && (
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <p className="text-xs font-semibold tracking-widest text-green-600 uppercase">
                Recyclability Score
              </p>
              <p className="font-bold text-gray-900 mt-0.5">{conditionLabel}</p>
            </div>
            {/* Circular ring */}
            <div className={`flex items-baseline justify-center gap-0.5 w-16 h-16 rounded-full border-4 shrink-0 ${ringStyle.ring}`}>
              <span className={`text-xl font-bold ${ringStyle.text}`}>{conditionScore}</span>
              <span className="text-xs text-gray-400">/100</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barColor(conditionScore)}`}
              style={{ width: `${conditionScore}%` }}
            />
          </div>

          {/* Tips */}
          {conditionTips.length > 0 && (
            <ul className="space-y-1 border-t border-gray-200 pt-3">
              {conditionTips.map((tip, i) => (
                <li key={i} className="text-xs text-gray-500 pl-3 relative before:content-['›'] before:absolute before:left-0 before:text-green-500 before:font-bold">
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Confirmation panel for medium / low confidence ── */}
      {!confirmed && (
        <div className={`rounded-xl p-4 border ${level === 'low' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}`}>
          {level === 'low' ? (
            <>
              <p className="text-xs font-semibold tracking-widest text-red-600 uppercase mb-1">Low confidence</p>
              <h3 className="font-bold text-gray-900 mb-1">We're not sure about this item</h3>
              <p className="text-sm text-gray-600">The AI may have identified the item incorrectly. Please check before continuing.</p>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-widest text-yellow-700 uppercase mb-1">Please confirm</p>
              <h3 className="font-bold text-gray-900 mb-1">Is this the correct item?</h3>
              <p className="text-sm text-gray-600">The AI identified this as <strong>{name}</strong>. Is that correct?</p>
            </>
          )}

          {!showCorrectInput ? (
            <div className="flex gap-3 mt-3">
              <button
                onClick={handleConfirm}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2.5 px-4 rounded-lg font-semibold transition text-sm"
              >
                <Check size={16} />
                Yes, correct
              </button>
              <button
                onClick={() => setShowCorrectInput(true)}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2.5 px-4 rounded-lg font-semibold transition text-sm"
              >
                No, change it
              </button>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <label className="text-sm font-medium text-gray-700">What is the correct item?</label>
              <input
                type="text"
                value={correctedName}
                onChange={(e) => setCorrectedName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCorrectSubmit()}
                placeholder="e.g. plastic water bottle"
                maxLength={150}
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400">Enter a clear item name, e.g. aluminium can, paper receipt.</p>
              {correctError && <p className="text-xs text-red-600">{correctError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCorrectSubmit}
                  disabled={busy || !correctedName.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-3 rounded-lg text-sm font-semibold transition"
                >
                  {busy ? 'Saving...' : 'Confirm corrected item'}
                </button>
                <button
                  onClick={() => { setShowCorrectInput(false); setCorrectError(null); }}
                  disabled={busy}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-semibold transition"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recyclability status — only after confirmed ── */}
      {confirmed && (
        <>
          {recyclingLoading ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full shrink-0" />
              <p className="text-sm text-gray-600">Checking recyclability...</p>
            </div>
          ) : recyclingData.recyclable ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="font-semibold text-green-800">Recyclable ✓</p>
              <p className="text-green-700 text-sm">Bin: {recyclingData.bin}</p>
              {recyclingData.notes && <p className="text-sm text-green-600 mt-1">{recyclingData.notes}</p>}
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-red-800">Not Recyclable</p>
              {recyclingData.notes && <p className="text-red-700 text-sm">{recyclingData.notes}</p>}
            </div>
          )}

          {!recyclingLoading && (
            <div className="flex gap-3">
              <button
                onClick={onRecycle}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition"
              >
                Recycle
              </button>
              <button
                onClick={onReuse}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-semibold transition"
              >
                Reuse
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
