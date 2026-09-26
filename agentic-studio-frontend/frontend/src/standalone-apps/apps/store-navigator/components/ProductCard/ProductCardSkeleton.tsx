import "./ProductCardSkeleton.scss"; // Using the same SCSS file

const ProductCardSkeleton = () => {
  return (
    <div className="product-card skeleton">
      <div className="product-card__image-container skeleton__box">
        {/* Placeholder for the badge */}
        <div className="skeleton__badge" />
      </div>

      <div className="product-card__content">
        {/* Placeholder for Name (2 lines) */}
        <div className="skeleton__line skeleton__line--title" />
        <div className="skeleton__line skeleton__line--title-short" />

        {/* Placeholder for Price */}
        <div className="skeleton__line skeleton__line--price" />

        {/* Placeholder for Button */}
        <div className="skeleton__button" />
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
