import { Check, X, RefreshCw } from 'lucide-react';
import { scanApi } from '../api/api';

export default function ScanResult({ result, onConfirm, onCorrect, onRecycle, onReuse }) {
  // Backend returns flat ScanResponse, not nested under "item"
  const itemId = result.itemId;
  const name = result.name;
  const brand = result.brand;
  const size = result.size;
  const material = result.material;
  const recyclable = result.recyclable;
  const bin = result.bin;
  const notes = result.notes;
  const identificationConfirmed = result.identificationConfirmed;
  const confidence = result.confidence;

  const handleConfirm = async () => {
    try {
      await scanApi.confirmIdentification(itemId);
      onConfirm();
    } catch (err) {
      console.error('Failed to confirm:', err);
    }
  };

  const handleCorrect = async (correctedName) => {
    try {
      await scanApi.correctItemName(itemId, correctedName);
      onCorrect(correctedName);
    } catch (err) {
      console.error('Failed to correct:', err);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Scan Result</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600">Identified as:</p>
          <p className="text-2xl font-semibold">{name}</p>
          {brand && <p className="text-sm text-gray-500">{brand}</p>}
          {size && <p className="text-sm text-gray-500">{size}</p>}
          {material && <p className="text-sm text-gray-500">{material}</p>}
          {confidence && (
            <p className="text-xs text-gray-400 mt-1">
              Confidence: {Math.round(confidence * 100)}%
            </p>
          )}
        </div>

        {!identificationConfirmed && (
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition"
            >
              <Check size={20} />
              Confirm
            </button>
            <button
              onClick={() => {
                const correctedName = prompt('Enter correct item name:');
                if (correctedName) handleCorrect(correctedName);
              }}
              className="flex-1 flex items-center justify-center gap-2 bg-yellow-600 hover:bg-yellow-700 text-white py-3 px-4 rounded-lg font-medium transition"
            >
              <RefreshCw size={20} />
              Correct
            </button>
          </div>
        )}

        {recyclable && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="font-semibold text-green-800">Recyclable!</p>
            <p className="text-green-700">Bin: {bin}</p>
            {notes && <p className="text-sm text-green-600 mt-2">{notes}</p>}
          </div>
        )}

        {!recyclable && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-semibold text-red-800">Not Recyclable</p>
            {notes && <p className="text-red-700">{notes}</p>}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onRecycle}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition"
          >
            Recycle
          </button>
          <button
            onClick={onReuse}
            className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-lg font-medium transition"
          >
            Reuse
          </button>
        </div>
      </div>
    </div>
  );
}
