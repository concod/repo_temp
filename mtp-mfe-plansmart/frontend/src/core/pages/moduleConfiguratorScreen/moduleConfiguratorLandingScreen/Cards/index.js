import React, { useState } from "react";
import Calendar from "assets/Calendar.png";
import Selected from "assets/active.svg?url";
import StarLeft from "assets/star.svg?url";
import StarRight from "assets/Soft Star (1).svg?url";
import TextStar from "assets/Soft Star (2).svg?url";
import NotActiveCalendar from "assets/NotActiveCalendar.png";

export default function ProductCard({
  products,
  activeProduct,
  setActiveProduct,
}) {
  const handleSelected = (id) => {
    let res = products.filter((item) => item.id == id)[0];
    setActiveProduct(res);
  };
  return (
    <div className="product-cards">
      {products.map((item) => {
        return (
          <Product
            key={item.id}
            id={item.id}
            title={item.product}
            desc={item.small_description}
            handleSelected={handleSelected}
            activeProduct={activeProduct}
            selected={activeProduct.id == item.id}
          />
        );
      })}
    </div>
  );
}

function Product({
  id,
  title,
  desc,
  selected,
  active,
  handleSelected,
  activeProduct,
}) {
  const [hover, setHover] = useState(false);
  if (selected) {
    return (
      <div className="product-card selected">
        <div className="product-select-indicator">
          <img src={Selected} alt="product-select-indicator" />
        </div>
        <div className="product-select-star-left selected">
          <img src={StarLeft} alt="product-select-star-left" />
        </div>
        <div className="product-select-star-right selected">
          <img src={StarRight} alt="product-select-star-right" />
        </div>
        <div className="product-select-calendar">
          <img src={Calendar} alt="product-select-calendar" />
        </div>
        <div className="product-select-star-text selected">
          <img src={TextStar} alt="product-select-star-text" />
        </div>
        <div className="product-card-bottom">
          <div className="product-title selected">{title}</div>
          <div className="product-description">{desc}</div>
        </div>
      </div>
    );
  } else {
    return (
      <div
        className="product-card not-selected"
        onMouseOver={() => setHover(true)}
        onMouseOut={() => setHover(false)}
        onClick={() => handleSelected(id)}
      >
        <div className="product-select-star-left">
          <img src={StarLeft} alt="product-select-star-left" />
        </div>
        <div className="product-select-star-right">
          <img src={StarRight} alt="product-select-star-right" />
        </div>
        <div className="product-select-calendar">
          <img
            src={hover ? Calendar : NotActiveCalendar}
            alt="product-select-calendar"
          />
        </div>
        <div className="product-select-star-text">
          <img src={TextStar} alt="product-select-star-text" />
        </div>
        <div className="product-card-bottom">
          <div className="product-title">{title}</div>
          <div className="product-description">{desc}</div>
        </div>
      </div>
    );
  }
}
