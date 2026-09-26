import React from "react";
import { Link } from "react-router-dom";
import "./BreadCrumbs.css";
//icons
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import HomeIcon from "../../../assets/homeIcon.svg";
function BreadCrumbs({ labels }) {
  const getIcon = (item, last) => {
    switch (item.iconType) {
      case "home":
        return <HomeIcon className={`icon ${last? "last-container": "" }`} />;
      default:
        return <HomeOutlinedIcon className={`icon ${last? "last-container": "" }`} />;
    }
  };
  return (
    <div className="bread-crumbs">
      {labels?.map((item, i) => (
        <React.Fragment key={i}>
          {i !== labels.length - 1 ? (
            item.labelType === "icon" ? (
              <>
                <Link className="custom-link" to={item.to}>
                  {getIcon(item,false)}
                </Link>
                <span className="arrow">&gt;</span>
              </>
            ) : (
              <>
                <Link className="custom-link" to={item.to}>
                  {item.label}
                </Link>
                <span className="arrow">&gt;</span>
              </>
            )
          ) : item.labelType === "icon" ? (
            <>
              <div className="custom-link">
                {getIcon(item, true)}
              </div>
              <span className="arrow">&gt;</span>
            </>
          ) : (
            <>
              <div className="custom-link last-container">{item.label}</div>
              <span className="arrow">&gt;</span>
            </>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
export default BreadCrumbs;