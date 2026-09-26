import { getCatalogueProductIdentifier } from "../advancedEditorUtils";
import type { EditorController } from "./types";

interface CatalogueSectionProps {
    controller: EditorController;
}

export function CatalogueSection({ controller }: CatalogueSectionProps) {
    const {
        isCatalogueModalOpen,
        isCatalogueSearching,
        isCatalogueProcessing,
        catalogueKeyword,
        catalogueResults,
        catalogueError,
        catalogueSelectionLoadingId,
        catalogueProcessingMessage,
        catalogueToast,
        closeCatalogueModal,
        setCatalogueKeyword,
        handleCatalogueSearchSubmit,
        handleCatalogueProductSelect,
    } = controller;

    return (
        <>
            {isCatalogueModalOpen && (
                <div className="advanced-editor-catalogue-modal" role="dialog" aria-modal="true" aria-label="Add products from catalogue">
                    <div className="advanced-editor-catalogue-modal__card">
                        <header className="advanced-editor-catalogue-modal__header">
                            <div>
                                <h3>Add Products from Catalogue</h3>
                                <p>Search by UPC or product name and add directly to canvas.</p>
                            </div>
                            <button
                                type="button"
                                onClick={closeCatalogueModal}
                                aria-label="Close catalogue search"
                                disabled={Boolean(catalogueSelectionLoadingId || isCatalogueProcessing)}
                            >
                                ×
                            </button>
                        </header>

                        <div className="advanced-editor-catalogue-modal__search-row">
                            <input
                                type="text"
                                value={catalogueKeyword}
                                onChange={(event) => setCatalogueKeyword(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        handleCatalogueSearchSubmit();
                                    }
                                }}
                                placeholder="UPC or product name"
                                disabled={Boolean(catalogueSelectionLoadingId || isCatalogueProcessing)}
                            />
                            <button
                                type="button"
                                onClick={handleCatalogueSearchSubmit}
                                disabled={isCatalogueSearching || Boolean(catalogueSelectionLoadingId || isCatalogueProcessing)}
                            >
                                {isCatalogueSearching ? "Searching..." : "Search"}
                            </button>
                        </div>

                        <div className="advanced-editor-catalogue-modal__results">
                            {isCatalogueSearching && (
                                <div className="advanced-editor-catalogue-modal__state">
                                    <div className="advanced-editor-catalogue-modal__spinner" aria-hidden="true" />
                                    <p>Searching catalogue...</p>
                                </div>
                            )}

                            {!isCatalogueSearching && catalogueResults.length > 0 && (
                                <div className="advanced-editor-catalogue-modal__list">
                                    {catalogueResults.map((product) => {
                                        const productId = getCatalogueProductIdentifier(product);
                                        const isThisProductLoading = catalogueSelectionLoadingId === productId;

                                        return (
                                            <article key={productId} className="advanced-editor-catalogue-modal__item">
                                                <div className="advanced-editor-catalogue-modal__thumb" aria-hidden="true">
                                                    <img src={product.image_url} alt="" loading="lazy" />
                                                </div>

                                                <div className="advanced-editor-catalogue-modal__meta">
                                                    <p>UPC {product.upc}</p>
                                                    <h4>{product.product_name}</h4>
                                                    <small>
                                                        {product.Brand || "Unknown brand"}
                                                        {product.product_category ? ` • ${product.product_category}` : ""}
                                                    </small>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        void handleCatalogueProductSelect(product);
                                                    }}
                                                    disabled={Boolean(catalogueSelectionLoadingId || isCatalogueProcessing)}
                                                >
                                                    {isThisProductLoading ? "Adding..." : "Add to canvas"}
                                                </button>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}

                            {!isCatalogueSearching && !catalogueResults.length && (
                                <div className="advanced-editor-catalogue-modal__state">
                                    <p>
                                        {catalogueError
                                            ? catalogueError
                                            : "Enter at least 3 characters to search catalogue products."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isCatalogueProcessing && (
                <div className="advanced-editor-catalogue-processing" role="status" aria-live="polite">
                    <div className="advanced-editor-catalogue-processing__card">
                        <div className="advanced-editor-catalogue-modal__spinner" aria-hidden="true" />
                        <h3>Processing, Please Wait...</h3>
                        <p>{catalogueProcessingMessage || "Working on your selected product..."}</p>
                    </div>
                </div>
            )}

            {catalogueToast && (
                <div
                    className={`advanced-editor-catalogue-toast ${catalogueToast.type === "error" ? "is-error" : ""}`}
                    role="status"
                    aria-live="polite"
                >
                    {catalogueToast.message}
                </div>
            )}
        </>
    );
}
