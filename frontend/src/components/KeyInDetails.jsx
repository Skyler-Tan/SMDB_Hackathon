import { useEffect, useState } from 'react';
import {
  Search,
  Check,
  Package,
  AlertCircle,
} from 'lucide-react';
import { catalogApi, scanApi } from '../api/api';

export default function KeyInDetails({
  onItemSelect,
  userId,
}) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadCatalog = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await catalogApi.getAll();

        if (!cancelled) {
          setItems(
            Array.isArray(response.data)
              ? response.data
              : []
          );
        }
      } catch (err) {
        console.error(
          'Failed to load catalog:',
          err.response?.data || err
        );

        if (!cancelled) {
          setError(
            'Could not load the item catalog. Please try again.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedSearch = search.trim().toLowerCase();

  const filteredItems = items.filter((item) => {
    const searchableFields = [
      item.name,
      item.brand,
      item.size,
      item.material,
      item.bin,
      item.description,
    ];

    return searchableFields.some((field) =>
      String(field ?? '')
        .toLowerCase()
        .includes(normalizedSearch)
    );
  });

  const handleSelect = async (item) => {
    const catalogId = item.itemId ?? item.id;

    if (!catalogId) {
      setError('This catalog item has no ID.');
      return;
    }

    if (selecting) {
      return;
    }

    setSelectedId(catalogId);
    setError('');
    setSelecting(true);

    try {
      const response = await scanApi.loadCatalogRecycling(
        catalogId,
        userId
      );

      const recyclingItem = response.data;

      if (!recyclingItem?.itemId) {
        throw new Error(
          'The backend did not return a scanned item ID.'
        );
      }

      // Use the scanned-item ID returned by the backend,
      // not the original catalog ID.
      onItemSelect({
        ...item,
        ...recyclingItem,
        itemId: recyclingItem.itemId,
        id: recyclingItem.itemId,
        name: recyclingItem.name || item.name || 'Unknown item',
        brand: recyclingItem.brand || item.brand || '',
        size: recyclingItem.size || item.size || '',
        material: recyclingItem.material || item.material || '',
        bin: recyclingItem.bin || 'unknown',
        recyclable: recyclingItem.recyclable === true,
        recyclingStatus:
          recyclingItem.recyclingStatus || 'UNVERIFIED',
        notes:
          recyclingItem.notes ||
          recyclingItem.description ||
          item.description ||
          '',
        identificationConfirmed: true,
        manualEntry: true,
      });
    } catch (err) {
      console.error(
        'Failed to load catalog recycling information:',
        err.response?.data || err
      );

      const backendMessage =
        err.response?.data?.message ||
        err.response?.data?.error;

      setError(
        backendMessage ||
          err.message ||
          'Could not load recycling information. Check your backend connection and try again.'
      );
    } finally {
      setSelecting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="rounded-xl bg-green-100 p-3">
          <Package
            size={26}
            className="text-green-700"
          />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Key in Item Details
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Select an item to view its recycling information.
          </p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />

        <input
          type="text"
          placeholder="Search name, brand, size or material..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={selecting}
          className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-60"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />
          <p>{error}</p>
        </div>
      )}

      {selecting && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Checking recycling information. Please wait...
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-gray-500">
          Loading catalog...
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-gray-500">
            {filteredItems.length} item
            {filteredItems.length !== 1 ? 's' : ''} found
          </p>

          <div className="max-h-[480px] space-y-3 overflow-y-auto">
            {filteredItems.map((item, index) => {
              const id = item.itemId ?? item.id ?? item.name ?? index;

              const isRecyclable =
                item.recyclable === true;

              const isNotRecyclable =
                item.recyclable === false &&
                item.recyclingStatus === 'NOT_RECYCLABLE';

              return (
                <button
                  key={id}
                  type="button"
                  disabled={selecting}
                  onClick={() => handleSelect(item)}
                  className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-green-400 hover:bg-green-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-gray-100 p-3">
                      <Package
                        size={22}
                        className="text-gray-600"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-gray-900">
                          {item.name || 'Unnamed item'}
                        </p>

                        {selectedId === id && selecting && (
                          <span className="shrink-0 text-xs text-green-700">
                            Checking...
                          </span>
                        )}

                        {selectedId === id && !selecting && (
                          <Check
                            size={20}
                            className="shrink-0 text-green-600"
                          />
                        )}
                      </div>

                      {item.brand &&
                        item.brand.toLowerCase() !== 'unknown' && (
                          <p className="mt-1 text-sm text-gray-600">
                            Brand: {item.brand}
                          </p>
                        )}

                      {item.size &&
                        item.size.toLowerCase() !== 'unknown' && (
                          <p className="text-sm text-gray-600">
                            Size: {item.size}
                          </p>
                        )}

                      {item.material &&
                        item.material.toLowerCase() !== 'unknown' && (
                          <p className="text-sm text-gray-600">
                            Material: {item.material}
                          </p>
                        )}

                      {item.bin &&
                        item.bin.toLowerCase() !== 'unknown' && (
                          <p className="mt-1 text-xs text-gray-500">
                            Recommended bin: {item.bin}
                          </p>
                        )}

                      <div className="mt-3">
                        {isRecyclable ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                            Recyclable
                          </span>
                        ) : isNotRecyclable ? (
                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                            Not recyclable
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                            Check when selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-10 text-center text-gray-500">
              <Package
                size={36}
                className="mx-auto mb-3 text-gray-300"
              />

              <p className="font-medium">
                No items found
              </p>

              <p className="mt-1 text-sm">
                Try searching for another name, brand, size or material.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}