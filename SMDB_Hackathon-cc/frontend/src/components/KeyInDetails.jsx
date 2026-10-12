import { useState } from 'react';
import { Search, Check } from 'lucide-react';
import { catalogApi } from '../api/api';

export default function KeyInDetails({ onItemSelect }) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadCatalog = async () => {
    setLoading(true);
    try {
      const response = await catalogApi.getAll();
      setItems(response.data);
      setFilteredItems(response.data);
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    loadCatalog();
  }, []);

  const handleSearch = (value) => {
    setSearch(value);
    if (value) {
      setFilteredItems(
        items.filter(item =>
          item.name.toLowerCase().includes(value.toLowerCase()) ||
          item.material?.toLowerCase().includes(value.toLowerCase())
        )
      );
    } else {
      setFilteredItems(items);
    }
  };

  const handleSelect = (item) => {
    setSelectedItem(item);
    onItemSelect({ item, identificationConfirmed: true });
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Key in Item Details</h2>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search items by name or material..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {loading ? (
        <div className="text-center text-gray-600">Loading catalog...</div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left"
            >
              <div className="flex-1">
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-gray-600">{item.material}</p>
                {item.brand && <p className="text-xs text-gray-500">{item.brand}</p>}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm ${
                item.recyclable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {item.recyclable ? 'Recyclable' : 'Not Recyclable'}
              </div>
            </button>
          ))}
        </div>
      )}

      {filteredItems.length === 0 && !loading && (
        <div className="text-center text-gray-500 mt-8">
          No items found matching "{search}"
        </div>
      )}
    </div>
  );
}
