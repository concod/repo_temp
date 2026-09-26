import { Link, useNavigate, useParams } from "react-router-dom";
import "./Product.scss";
import { useProductStore } from "../../store/productStore";
import { motion } from "framer-motion";
import TopNavbar from "../../components/Layout/TopNavbar";
import { useFetchProductRecommendation } from "../../hooks/useFetchProductRecommendation";
import ProductCard from "../../components/ProductCard/ProductCard";
import ProductCardSkeleton from "../../components/ProductCard/ProductCardSkeleton";
import { useEffect, useRef } from "react";

const Product = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { products, isLoading } = useProductStore();
  const {
    data: productRecommendation,
    loading: productRecommendationLoading,
    error,
  } = useFetchProductRecommendation(productId || "");
  const pageRef = useRef<HTMLDivElement>(null);

  const activeProduct = products.find((p) => p.id === productId);

  const recommendedProductIds = productRecommendation?.productIds || [];

  const recommendedProductList = products.filter((p) =>
    recommendedProductIds.includes(p.id)
  );

  useEffect(() => {
    pageRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [productId]);

  if (isLoading) {
    return (
      <div className="loading_container">
        <div className="spinner" style={{ width: "32px", height: "32px" }} />
      </div>
    );
  }

  if (!activeProduct) {
    return (
      <motion.div
        className="product-page-error"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2>Product not found</h2>
        <Link to="/apps/navigator/home">Back to Home</Link>
      </motion.div>
    );
  }

  const { id, name, category, sku, image, price, description, stockCount } =
    activeProduct;

  return (
    <>
      <TopNavbar />
      <motion.div
        ref={pageRef}
        className="product-page"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <div className="product-page__container">
          {/* Image Section */}
          <div className="product-page__image-wrapper">
            <img src={image} alt={name} className="product-page__image" />
          </div>

          {/* Info Section */}
          <div className="product-page__details">
            <div className="product-page__header">
              <span className="product-page__category">{category}</span>
              <div
                className={`product-page__stock-chip ${
                  stockCount > 0 ? "in-stock" : "out-of-stock"
                }`}
              >
                {stockCount > 0 ? "In stock" : "Out of stock"}
              </div>
            </div>

            <h1 className="product-page__name">{name}</h1>
            <p className="product-page__sku">SKU: {sku}</p>
            <p className="product-page__price">${price.toFixed(2)}</p>

            <div className="product-page__description">
              <h3>Description</h3>
              <p>{description}</p>
            </div>

            <button
              className="product-page__locate-btn"
              disabled={stockCount === 0}
              onClick={() => navigate(`/apps/navigator/store/${id}`)}
            >
              <i className="fa-solid fa-location-arrow"></i> Locate in Store
            </button>
          </div>
        </div>

        {productRecommendationLoading ? (
          <div className="product-page__recommendations">
            <h2 className="recommendations-title">You might also like</h2>
            <div className="recommendations-scroll">
              <motion.div
                className="recommendations-scroll__item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <ProductCardSkeleton />
              </motion.div>

              <motion.div
                className="recommendations-scroll__item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <ProductCardSkeleton />
              </motion.div>
              <motion.div
                className="recommendations-scroll__item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <ProductCardSkeleton />
              </motion.div>
            </div>
          </div>
        ) : (
          !error &&
          recommendedProductList.length > 0 && (
            <div className="product-page__recommendations">
              <h2 className="recommendations-title">You might also like</h2>
              <div className="recommendations-scroll">
                {recommendedProductList.map((recommendedProduct) => (
                  <motion.div
                    key={recommendedProduct.id}
                    className="recommendations-scroll__item"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <ProductCard product={recommendedProduct} />
                  </motion.div>
                ))}
              </div>
            </div>
          )
        )}
      </motion.div>
    </>
  );
};

export default Product;
