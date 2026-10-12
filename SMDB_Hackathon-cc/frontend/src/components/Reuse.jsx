import { useState, useEffect } from 'react';
import { Wrench, Clock, Play, ArrowLeft } from 'lucide-react';

export default function Reuse({ item, onClose }) {
  const [difficulty, setDifficulty] = useState('all');
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guides, setGuides] = useState([]);
  const [loading, setLoading] = useState(true);

  const difficulties = ['easy', 'medium', 'hard'];

  useEffect(() => {
    loadGuides();
  }, [item.material, difficulty]);

  const loadGuides = async () => {
    if (!item.material) {
      setGuides([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Call backend DIY endpoint
      const response = await fetch(`/api/diy?material=${encodeURIComponent(item.material)}&difficulty=${difficulty === 'all' ? 'easy' : difficulty}`);
      if (response.ok) {
        const data = await response.json();
        setGuides(data);
      } else {
        setGuides([]);
      }
    } catch (err) {
      console.error('Failed to load DIY guides:', err);
      setGuides([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = guides;

  if (selectedGuide) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <button
          onClick={() => setSelectedGuide(null)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4"
        >
          <ArrowLeft size={20} />
          Back to Guides
        </button>

        <h3 className="text-2xl font-bold mb-2">{selectedGuide.title}</h3>
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
          <span className="capitalize">{selectedGuide.difficulty}</span>
          <span>•</span>
          <span>{selectedGuide.estimatedTime}</span>
        </div>

        {selectedGuide.youtubeUrl && (
          <a
            href={selectedGuide.youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded-lg font-medium transition mb-6"
          >
            <Play size={20} />
            Watch Video Tutorial
          </a>
        )}

        <div className="mb-6">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Wrench size={20} />
            Tools Needed
          </h4>
          <ul className="list-disc list-inside space-y-1">
            {selectedGuide.tools?.map((tool, i) => (
              <li key={i}>{tool}</li>
            ))}
          </ul>
        </div>

        <div className="mb-6">
          <h4 className="font-semibold mb-2">Materials Needed</h4>
          <ul className="list-disc list-inside space-y-1">
            {selectedGuide.materials?.map((material, i) => (
              <li key={i}>{material}</li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Clock size={20} />
            Steps
          </h4>
          <ol className="list-decimal list-inside space-y-2">
            {selectedGuide.steps?.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="text-center">Loading DIY guides...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h3 className="text-xl font-bold mb-4">Reuse Ideas for {item.name}</h3>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setDifficulty('all')}
          className={`px-4 py-2 rounded-full whitespace-nowrap ${
            difficulty === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200'
          }`}
        >
          All
        </button>
        {difficulties.map((diff) => (
          <button
            key={diff}
            onClick={() => setDifficulty(diff)}
            className={`px-4 py-2 rounded-full whitespace-nowrap capitalize ${
              difficulty === diff ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}
          >
            {diff}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredGuides.map((guide) => (
          <button
            key={guide.id}
            onClick={() => setSelectedGuide(guide)}
            className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition"
          >
            <h4 className="font-semibold">{guide.title}</h4>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
              <span className="capitalize">{guide.difficulty}</span>
              <span>•</span>
              <span>{guide.estimatedTime}</span>
            </div>
          </button>
        ))}
      </div>

      {filteredGuides.length === 0 && (
        <div className="text-center text-gray-500 mt-8">
          No DIY guides available for {item.material || 'this item'}.
        </div>
      )}

      <button
        onClick={onClose}
        className="w-full mt-6 bg-gray-600 hover:bg-gray-700 text-white py-3 px-6 rounded-lg font-medium transition"
      >
        Close
      </button>
    </div>
  );
}
