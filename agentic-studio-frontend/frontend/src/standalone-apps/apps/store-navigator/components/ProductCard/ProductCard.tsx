import { useNavigate } from "react-router-dom";
import "./ProductCard.scss";
export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  image: string;
  price: number;
  description: string;
  stockCount: number;
  zoneId: string;
  aisleId: string;
  bayId: string;
  shelfId: string;
  levels: number[];
  departmentId?: string; // Legacy fields for backward compatibility
}

const ProductCard = ({ product }: { product: Product }) => {
  const { id, name, image, price, stockCount } = product;
  const navigate = useNavigate();

  return (
    <div
      className="product-card"
      onClick={() => navigate(`/apps/navigator/product/${id}`)}
    >
      <div className="product-card__image-container">
        <img src={image} alt={name} className="product-card__image" />
        {/* Absolute positioned stock chip */}
        <span
          className={`stock-badge ${
            stockCount > 0 ? "in-stock" : "out-of-stock"
          }`}
        >
          {stockCount > 0 ? "In stock" : "Out of stock"}
        </span>
      </div>

      <div className="product-card__content">
        <h3 className="product-card__name">{name}</h3>
        <p className="product-card__price">{price}</p>

        <button
          className="product-card__map-button"
          onClick={(e) => {
            e.stopPropagation(); // Prevents navigating to product page
            navigate(`/apps/navigator/store/${id}`);
          }}
          disabled={stockCount === 0}
        >
          <i className="fa-solid fa-location-arrow"></i> Locate in Store
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
