import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { scanApi } from '../api/api';
import KeyInDetails from './KeyInDetails';
import History from './History';
import ScanResult from './ScanResult';
import Recycling from './Recycling';
import Reuse from './Reuse';

export default function Scan({ onScanComplete, userId }) {
  const [activeTab, setActiveTab] = useState('scan');

  // ── Camera / image state ─────────────────────────────────
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // ── Result / flow state ──────────────────────────────────
  const [scanResult, setScanResult] = useState(null);
  const [showRecycling, setShowRecycling] = useState(false);
  const [showReuse, setShowReuse] = useState(false);

  // ── History refresh ──────────────────────────────────────
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // ── File upload ──────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      setImage(reader.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  // ── Camera ───────────────────────────────────────────────
  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied or not available. Please use upload instead.');
    }
  };

  // Attach stream after <video> is in the DOM
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch((err) => {
        console.error('Video play error:', err);
        setError('Could not start the camera preview.');
      });
    }
  }, [showCamera]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError('Camera not ready. Please try again.');
      return;
    }
    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const data = canvas.toDataURL('image/jpeg', 0.9);
        setPreview(data);
        setImage(data.split(',')[1]);
        stopCamera();
      } else {
        setError('Failed to capture photo. Please try again.');
      }
    } catch (err) {
      setError('Failed to capture photo. Please try again.');
    }
  };

  // ── Scan ─────────────────────────────────────────────────
  const handleScan = async () => {
    if (!image) return;
    setLoading(true);
    setError(null);
    try {
      const response = await scanApi.scan(image, userId);
      const result = response.data;
      setScanResult(result);
      setPreview(null);
      setImage(null);
      // Also notify App.jsx if needed (e.g. stats update)
      onScanComplete?.(result);
    } catch (err) {
      setError('Failed to scan item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setPreview(null);
    setError(null);
    stopCamera();
  };

  // ── Result callbacks ─────────────────────────────────────
  const handleConfirm = (updatedResult) => {
    if (updatedResult && typeof updatedResult === 'object') {
      setScanResult(updatedResult);
    } else {
      setScanResult((r) => ({ ...r, identificationConfirmed: true }));
    }
  };

  const handleCorrect = (name) => {
    setScanResult((r) => ({ ...r, name, identificationConfirmed: true }));
  };

  // Some results (e.g. from Key in Details) may use `id` instead of `itemId`
  const itemId = scanResult?.itemId ?? scanResult?.id;

  const handleRecycle = () => {
    if (!itemId) {
      setError('This item has no ID yet, so it cannot be recycled. Please scan or select it again.');
      return;
    }
    setError(null);
    setShowRecycling(true);
  };

  const handleReuse = () => {
    if (!scanResult) return;
    setError(null);
    setShowReuse(true);
  };

  const closeRecycling = () => {
    setShowRecycling(false);
    setScanResult(null); // back to scan screen after recycling
  };

  const closeReuse = () => {
    setShowReuse(false);
  };

  const handleScanAnother = () => {
    setScanResult(null);
    setShowRecycling(false);
    setShowReuse(false);
    setError(null);
  };

  // Clicking a tab always leaves any result / flow and shows that tab
  const goToTab = (tab) => {
    setScanResult(null);
    setShowRecycling(false);
    setShowReuse(false);
    setError(null);
    setActiveTab(tab);
    if (tab === 'history') setHistoryRefreshKey((k) => k + 1);
  };

  // ── Render ───────────────────────────────────────────────

  const tabClass = (tab) =>
    `flex-1 py-3 px-4 rounded-lg font-medium transition ${
      activeTab === tab ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
    }`;

  // Tab bar is always visible
  const tabBar = (
    <div className="flex gap-2 mb-6">
      <button onClick={() => goToTab('scan')} className={tabClass('scan')}>
        Scan Items
      </button>
      <button onClick={() => goToTab('keyin')} className={tabClass('keyin')}>
        Key in Details
      </button>
      <button onClick={() => goToTab('history')} className={tabClass('history')}>
        History Items
      </button>
    </div>
  );

  let content;

  if (showRecycling && itemId) {
    // Recycling flow
    content = (
      <Recycling
        itemId={itemId}
        userId={userId}
        onClose={closeRecycling}
      />
    );
  } else if (showReuse && scanResult) {
    // Reuse flow
    content = (
      <Reuse
        item={{
          id: itemId,
          name: scanResult.name,
          material: scanResult.material,
          diyGuides: [],
        }}
        onClose={closeReuse}
      />
    );
  } else if (scanResult) {
    // Scan result
    content = (
      <>
        <ScanResult
          result={scanResult}
          onConfirm={handleConfirm}
          onCorrect={handleCorrect}
          onRecycle={handleRecycle}
          onReuse={handleReuse}
        />
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <button
          onClick={handleScanAnother}
          className="mt-4 w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-lg font-medium transition"
        >
          Scan Another Item
        </button>
      </>
    );
  } else {
    // Normal tabs
    content = (
      <>
        {/* ── Scan tab ── */}
        {activeTab === 'scan' && !preview && (
          <div className="space-y-4">
            {showCamera ? (
              <div className="relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-lg" />
                <button
                  onClick={stopCamera}
                  className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-2"
                >
                  <X size={20} />
                </button>
                <div className="flex justify-center mt-4">
                  <button
                    onClick={capturePhoto}
                    className="bg-white rounded-full p-4 shadow-lg border border-gray-200"
                    aria-label="Capture photo"
                  >
                    <div className="w-12 h-12 border-4 border-green-600 rounded-full" />
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={startCamera}
                  className="w-full flex items-center justify-center gap-3 bg-green-600 hover:bg-green-700 text-white py-4 px-6 rounded-lg font-medium transition"
                >
                  <Camera size={24} />
                  Use Camera
                </button>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg font-medium transition cursor-pointer"
                  >
                    <Upload size={24} />
                    Upload Photo
                  </label>
                </div>
              </>
            )}
          </div>
        )}

        {/* Preview — ready to submit */}
        {activeTab === 'scan' && preview && (
          <div className="space-y-4">
            <img src={preview} alt="Preview" className="w-full rounded-lg" />
            <div className="flex gap-3">
              <button
                onClick={handleScan}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium transition"
              >
                {loading ? 'Scanning...' : 'Scan Item'}
              </button>
              <button
                onClick={reset}
                className="bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition"
                aria-label="Discard photo"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* ── Key-in tab ── */}
        {activeTab === 'keyin' && (
          <KeyInDetails onItemSelect={(result) => setScanResult(result)} />
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <History userId={userId} refreshKey={historyRefreshKey} />
        )}

        {/* Error banner */}
        {error && (
          <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      {tabBar}
      {content}
    </div>
  );
}
