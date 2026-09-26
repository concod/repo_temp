import { useLocation, useNavigate } from "react-router-dom";
import type { Product } from "../ProductCard/ProductCard";
import "./ProductCardDetailed.scss";

const ProductCardDetailed = ({ product }: { product: Product }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      className="search-product-card"
      onClick={() => {
        if (location.pathname.includes("store")) {
          navigate(`/apps/navigator/store/${product.id}`);
        } else {
          navigate(`/apps/navigator/product/${product.id}`);
        }
      }}
    >
      <img
        src={product.image}
        alt={product.name}
        className="search-product-card__image"
      />
      <div className="search-product-card__info">
        <div className="search-product-card__header">
          <h4 className="search-product-card__name">{product.name}</h4>
          {/* Stock Chip */}
          <span
            className={`stock-chip ${
              product.stockCount > 0 ? "in-stock" : "out-of-stock"
            }`}
          >
            {product.stockCount > 0 ? "In stock" : "Out of stock"}
          </span>
        </div>

        <p className="search-product-card__category">{product.category}</p>
        <span className="search-product-card__price">${product.price}</span>
      </div>
      <i className="fa-solid fa-chevron-right search-product-card__arrow"></i>
    </div>
  );
};

export default ProductCardDetailed;
