import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { scanApi } from '../api/api';
import KeyInDetails from './KeyInDetails';
import History from './History';

export default function Scan({ onScanComplete, userId }) {
  const [activeTab, setActiveTab] = useState('scan');
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
        setImage(reader.result.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setShowCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Camera access denied or not available. Please use upload instead.');
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
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
        const imageData = canvas.toDataURL('image/jpeg', 0.9);
        setPreview(imageData);
        setImage(imageData.split(',')[1]);
        stopCamera();
      } else {
        setError('Failed to capture photo. Please try again.');
      }
    } catch (err) {
      console.error('Capture error:', err);
      setError('Failed to capture photo. Please try again.');
    }
  };

  const handleScan = async () => {
    if (!image) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await scanApi.scan(image);
      onScanComplete(response.data);
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

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
            activeTab === 'scan' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Scan Items
        </button>
        <button
          onClick={() => setActiveTab('keyin')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
            activeTab === 'keyin' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Key in Details
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
            activeTab === 'history' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          History Items
        </button>
      </div>

      {activeTab === 'scan' && !preview ? (
        <div className="space-y-4">
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

          {showCamera && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <button
                onClick={capturePhoto}
                className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-4 shadow-lg"
              >
                <div className="w-12 h-12 border-4 border-green-600 rounded-full" />
              </button>
              <button
                onClick={stopCamera}
                className="absolute top-4 right-4 bg-red-600 text-white rounded-full p-2"
              >
                <X size={20} />
              </button>
            </div>
          )}
        </div>
      ) : null}

      {activeTab === 'keyin' && (
        <KeyInDetails onItemSelect={onScanComplete} />
      )}

      {activeTab === 'history' && (
        <History userId={userId} />
      )}

      {activeTab === 'scan' && preview ? (
        <div className="space-y-4">
          <img
            src={preview}
            alt="Preview"
            className="w-full rounded-lg"
          />
          
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
            >
              <X size={20} />
            </button>
          </div>
        </div>
      ) : null}

      {error && (
        <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
