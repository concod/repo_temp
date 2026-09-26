import PropTypes from "prop-types";
import Tooltip from "@mui/material/Tooltip";
import Star from "assets/oms/viewManagement/star.svg";
import StarFilledIcon from "assets/oms/viewManagement/starFilled.svg";

function ListingViewStarButton({ isDefault, disabled, onClick }) {
  return (
    <div className="default-button">
      <Tooltip title="Set as default" placement="top">
        <span>
          <button
            type="button"
            className="listing-view-star-button"
            onClick={(event) => {
              event.stopPropagation();
              onClick();
            }}
            disabled={disabled}
            aria-label="Set as default"
          >
            {isDefault ? <StarFilledIcon /> : <Star />}
          </button>
        </span>
      </Tooltip>
    </div>
  );
}

ListingViewStarButton.propTypes = {
  disabled: PropTypes.bool,
  isDefault: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
};

export default ListingViewStarButton;
