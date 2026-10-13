import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { scanApi } from '../api/api';

export default function History({ userId, refreshKey }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadHistory();
  }, [userId, refreshKey]);

  const loadHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await scanApi.getScanHistory(userId);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to load history:', err);
      setError('Failed to load history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatusIcon = ({ status }) => {
    if (status === 'RECYCLABLE') return <CheckCircle size={18} className="text-green-500" />;
    if (status === 'NOT_RECYCLABLE') return <XCircle size={18} className="text-red-500" />;
    return <HelpCircle size={18} className="text-yellow-500" />;
  };

  const statusLabel = (status) => {
    if (status === 'RECYCLABLE') return 'Recyclable';
    if (status === 'NOT_RECYCLABLE') return 'Not Recyclable';
    return 'Unverified';
  };

  const statusColors = (status) => {
    if (status === 'RECYCLABLE') return 'bg-green-100 text-green-800';
    if (status === 'NOT_RECYCLABLE') return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="text-center text-gray-600">Loading history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Scan History</h2>

      {history.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-600">No scan history yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Start scanning items to see your history here
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg p-4 shadow-sm border border-gray-200"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.name || 'Unknown item'}</p>
                  <p className="text-sm text-gray-500">
                    {[item.material, item.brand].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap flex items-center gap-1 ${statusColors(item.recyclingStatus)}`}>
                  <StatusIcon status={item.recyclingStatus} />
                  {statusLabel(item.recyclingStatus)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
                <Calendar size={13} />
                <span>{formatDate(item.scannedAt)}</span>
                {item.bin && item.bin !== 'unknown' && (
                  <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                    Bin: {item.bin}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
