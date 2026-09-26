import { useProductStore } from "../../store/productStore";
import ProductCardDetailed from "../ProductCardDetailed/ProductCardDetailed";
import "./SearchModalInMap.scss";
import { useMemo, useState } from "react";
import sparkle from "../../assets/sparkle.png";
import { useDebounce } from "../../../../../hooks/useDebounce";
import { useFetchSearchResults } from "../../hooks/useFetchSearchResults";
import Fuse from "fuse.js";

const SearchModalInMap = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { products } = useProductStore();
  const debouncedSearchQuery = useDebounce(searchQuery);
  const { data, loading } = useFetchSearchResults(debouncedSearchQuery);

  const fuse = useMemo(() => {
    return new Fuse(products, {
      keys: [
        { name: "name", weight: 1.0 }, // Name is most important
        { name: "category", weight: 0.7 },
      ],
      threshold: 0.4, // Adjust this for "fuzziness" (0.1 is strict, 0.6 is very loose)
      distance: 100, // How far off a match can be
      ignoreLocation: true, // Finds matches anywhere in the string
    });
  }, [products]);

  // Priority: API results (searchResult) > Local Fuzzy Search
  const searchResults = useMemo(() => {
    // IF SEARCH IS EMPTY: Show all products
    if (!searchQuery.trim()) {
      return products.filter((p) => p.stockCount > 0);
    }

    // IF SEARCHING: Priority: API results > Local Fuzzy Search
    if (data?.productIds && data.productIds.length > 0) {
      return products
        .filter((p) => data.productIds.includes(p.id))
        .filter((p) => p.stockCount > 0);
    }

    // Fallback to local fuzzy search
    return fuse
      .search(searchQuery)
      .map((result) => result.item)
      .filter((p) => p.stockCount > 0);
  }, [fuse, searchQuery, data, products]);

  // 3. Identify Recommendations and Filter Duplicates
  const recommendedProducts = useMemo(() => {
    // Only show recommendations if we have a search query and API suggestions
    if (!searchQuery.trim() || !data?.suggestedProductIds) return [];

    const searchResultIds = new Set(searchResults.map((p) => p.id));

    return products
      .filter(
        (p) =>
          data.suggestedProductIds!.includes(p.id) && !searchResultIds.has(p.id)
      )
      .filter((p) => p.stockCount > 0);
  }, [data, searchResults, products, searchQuery]);

  const dismissKeyboard = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent page reload
    dismissKeyboard(); // Close keyboard
  };

  // const filteredProducts = useMemo(() => {
  //   if (!searchQuery.trim()) return products;

  //   // Fuse returns an array of objects: { item: Product, refIndex: number, score: number }
  //   return fuse.search(searchQuery).map((result) => result.item);
  // }, [fuse, searchQuery, products]);

  return (
    <div className="search-modal">
      <div className="search-modal__header">
        <form
          action="."
          onSubmit={handleSearchSubmit}
          className="search-input-wrapper"
        >
          <img src={sparkle} />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            enterKeyHint="search"
          />
          <div className="spinner-placeholder">
            {loading && <div className="spinner"></div>}
          </div>
        </form>
      </div>

      <div
        className="search-modal__results"
        onTouchStart={dismissKeyboard}
        onScroll={dismissKeyboard}
      >
        {/* --- Primary List (All Products or Search Results) --- */}
        <div className="results-section">
          {searchResults.length > 0 ? (
            searchResults.map((product) => (
              <ProductCardDetailed key={product.id} product={product} />
            ))
          ) : loading ? (
            <p className="no-results">Searching for "{searchQuery}"</p>
          ) : (
            <p className="no-results">"No products found for {searchQuery}"</p>
          )}
        </div>

        {/* --- Recommendations Section (Only when searching) --- */}
        {recommendedProducts.length > 0 && (
          <div className="recommendation-section">
            <h3 className="section-title">Recommended products</h3>
            {recommendedProducts.map((product) => (
              <ProductCardDetailed key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchModalInMap;
