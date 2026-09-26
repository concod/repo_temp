import storeIcon from "../../assets/store.png";
import elevatorIcon from "../../assets/elevator.png";
import floorIcon from "../../assets/floor.png";
import locationIcon from "../../assets/location.png";
import type { Aisle, Bay, Shelf, Zone } from "../../types/store.types";
import "./RouteDetails.scss";
import { getAisleColor } from "../../utils/storeHelpers";

const RouteDetails = ({
  productLocation,
}: {
  productLocation: {
    zone: Zone;
    aisle: Aisle;
    bay: Bay;
    shelf: Shelf | null;
  } | null;
}) => {
  if (!productLocation) {
    return <p>No details found</p>;
  }

  return (
    <div className="route-details-wrapper">
      {/* Entrance Step */}
      <div className="route-container">
        <div className="icon">
          <img src={storeIcon} alt="Store" />
        </div>
        <div className="detail">Store Entrance</div>
      </div>

      {/* Elevator Step */}
      {productLocation.bay.floor > 0 && (
        <div className="route-container">
          <div className="icon">
            <img src={elevatorIcon} alt="Elevator" />
          </div>
          <div className="detail">Take Elevator</div>
        </div>
      )}

      {/* Floor Step */}
      <div className="route-container">
        <div className="icon">
          <img src={floorIcon} alt="Floor" />
        </div>
        <div className="detail">Floor {productLocation.bay.floor + 1}</div>
      </div>

      {/* Location Detail Step */}
      <div className="route-container">
        <div className="icon">
          <img src={locationIcon} alt="Location" />
        </div>
        <div className="detail">
          <div className="destination-list">
            <div className="dest-card">
              <h4>Zone</h4>
              <span>{productLocation.zone.name}</span>
            </div>
            <div className="dest-card">
              <h4
                style={{
                  color: getAisleColor(productLocation.aisle.id),
                }}
              >
                Aisle
              </h4>
              <span>{productLocation.aisle.name}</span>
            </div>
            <div className="dest-card">
              <h4 style={{ color: "#185bf6ff" }}>Bay</h4>
              <span>{productLocation.bay.name}</span>
            </div>
            <div className="dest-card">
              <h4 style={{ color: "#059669" }}>Shelf</h4>
              <span>{productLocation.shelf?.name || "N/A"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteDetails;
