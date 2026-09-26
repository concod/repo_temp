import { Link, useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./StoreMap.scss";
import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "../../../../../components/Modal";
import sparkle from "../../assets/sparkle.png";
import SearchModalInMap from "../../components/SearchModal/SearchModalInMap";
import { useMapStore } from "../../store/mapStore";
import { useProductStore } from "../../store/productStore";
import {
  calculateShelfPositions,
  findBayById,
  getAllFloors,
  getProductLocation,
} from "../../utils/storeHelpers";
import { findShortestPath } from "../../utils/pathfinder";
import type { Bay, PathNode } from "../../types/store.types";
import Store3D from "../../components/Store3D/Store3D";
import RouteDetails from "./RouteDetails";
import locationInfo from "../../assets/location-info.png";

const StoreMap = () => {
  const { productId } = useParams<{ productId: string }>();
  const [searchWindowOpen, setSearchWindowOpen] = useState(false);
  const [locationInfoModalOpen, setLocationInfoModalOpen] = useState(false);
  const navigate = useNavigate();
  const { map: storeConfig, isLoading: isStoreLoading } = useMapStore();
  const { products, isLoading: isProductsLoading } = useProductStore();
  const [currentFloor, setCurrentFloor] = useState(0);

  const activeProduct = products.find((p) => p.id === productId);

  useEffect(() => {
    setSearchWindowOpen(false);
  }, [productId]);

  const targetBay: Bay | undefined | null = useMemo(() => {
    if (!storeConfig || !activeProduct) return null;
    const bayId = activeProduct.bayId || activeProduct.departmentId;
    return bayId ? findBayById(storeConfig, bayId) : null;
  }, [storeConfig, activeProduct]);

  const productLocation = useMemo(() => {
    if (!storeConfig || !activeProduct) return null;
    return getProductLocation(storeConfig, activeProduct);
  }, [storeConfig, activeProduct]);

  const navigationPath = useMemo(() => {
    if (!storeConfig || !activeProduct || !targetBay) return [];

    const shelfIndex = targetBay.shelves.findIndex(
      (s) => s.id === activeProduct.shelfId
    );
    const validShelfIndex = shelfIndex === -1 ? 0 : shelfIndex;

    const targetShelf = targetBay.shelves[validShelfIndex];
    const closedSides = targetShelf?.closedSides ?? [];

    // Determine which sides are closed/open
    const isFrontClosed = closedSides.includes("front");
    const isBackClosed =
      closedSides === undefined ||
      closedSides.length === 0 ||
      closedSides.includes("back");
    const isLeftClosed = closedSides.includes("left");
    const isRightClosed = closedSides.includes("right");

    const frontOpen = !isFrontClosed;
    const backOpen = !isBackClosed;
    const leftOpen = !isLeftClosed;
    const rightOpen = !isRightClosed;

    const bayShape = targetBay.shape || "rectangle";
    const safeDistance = 0.8;

    let targetXFinal: number;
    let targetZ: number;

    if (bayShape === "circle") {
      // Circle bay: use shelf position calculation
      const shelfPositions = calculateShelfPositions(targetBay);
      const shelfPos = shelfPositions[validShelfIndex] || shelfPositions[0];

      if (!shelfPos) {
        // Fallback
        targetXFinal = targetBay.column + targetBay.width / 2;
        targetZ = targetBay.row + targetBay.depth / 2;
      } else {
        const rotation = shelfPos.rotation;
        const shelfWorldX = shelfPos.worldX;
        const shelfWorldZ = shelfPos.worldZ;
        const shelfWidth = shelfPos.shelfWidth;
        const shelfDepth = shelfPos.shelfDepth;

        const cosR = Math.cos(rotation);
        const sinR = Math.sin(rotation);

        // Calculate distances from bay edge (circle perimeter) to each open side
        const calculateSideDistance = (
          side: "front" | "back" | "left" | "right"
        ): number => {
          const bayCenterX = targetBay.column + targetBay.width / 2;
          const bayCenterZ = targetBay.row + targetBay.depth / 2;
          const bayRadius = Math.min(targetBay.width, targetBay.depth) / 2;

          let sideX: number, sideZ: number;

          if (side === "front") {
            sideX = shelfWorldX + (shelfDepth / 2) * sinR;
            sideZ = shelfWorldZ + (shelfDepth / 2) * cosR;
          } else if (side === "back") {
            sideX = shelfWorldX - (shelfDepth / 2) * sinR;
            sideZ = shelfWorldZ - (shelfDepth / 2) * cosR;
          } else if (side === "left") {
            sideX = shelfWorldX - (shelfWidth / 2) * cosR;
            sideZ = shelfWorldZ + (shelfWidth / 2) * sinR;
          } else {
            sideX = shelfWorldX + (shelfWidth / 2) * cosR;
            sideZ = shelfWorldZ - (shelfWidth / 2) * sinR;
          }

          // Distance from bay edge (circle perimeter)
          // Find closest point on circle perimeter to the side face point
          const dx = sideX - bayCenterX;
          const dz = sideZ - bayCenterZ;
          const distFromCenter = Math.hypot(dx, dz);

          if (distFromCenter === 0) return bayRadius; // At center, distance is radius

          // Closest point on circle perimeter
          const closestX = bayCenterX + (dx / distFromCenter) * bayRadius;
          const closestZ = bayCenterZ + (dz / distFromCenter) * bayRadius;

          // Distance from side face to closest point on circle perimeter
          return Math.hypot(sideX - closestX, sideZ - closestZ);
        };

        // Find best open side with minimal distance from bay edge
        const sideDistances = [
          {
            side: "front" as const,
            dist: calculateSideDistance("front"),
            open: frontOpen,
          },
          {
            side: "back" as const,
            dist: calculateSideDistance("back"),
            open: backOpen,
          },
          {
            side: "left" as const,
            dist: calculateSideDistance("left"),
            open: leftOpen,
          },
          {
            side: "right" as const,
            dist: calculateSideDistance("right"),
            open: rightOpen,
          },
        ];

        const openSides = sideDistances.filter((s) => s.open);
        const bestSide =
          openSides.length > 0
            ? openSides.sort((a, b) => a.dist - b.dist)[0].side
            : "front"; // Fallback

        // Calculate endpoint position on the best open side
        if (bestSide === "front") {
          targetXFinal = shelfWorldX + (shelfDepth / 2 + safeDistance) * sinR;
          targetZ = shelfWorldZ + (shelfDepth / 2 + safeDistance) * cosR;
        } else if (bestSide === "back") {
          targetXFinal = shelfWorldX - (shelfDepth / 2 + safeDistance) * sinR;
          targetZ = shelfWorldZ - (shelfDepth / 2 + safeDistance) * cosR;
        } else if (bestSide === "left") {
          targetXFinal = shelfWorldX - (shelfWidth / 2 + safeDistance) * cosR;
          targetZ = shelfWorldZ + (shelfWidth / 2 + safeDistance) * sinR;
        } else {
          targetXFinal = shelfWorldX + (shelfWidth / 2 + safeDistance) * cosR;
          targetZ = shelfWorldZ - (shelfWidth / 2 + safeDistance) * sinR;
        }
      }
    } else {
      // Rectangle bay logic (original)
      const numShelves = targetBay.shelves.length;
      const shelfSpacing = targetBay.shelfSpacing ?? 0;
      const totalSpacing = shelfSpacing * Math.max(0, numShelves - 1);
      const availableWidth = targetBay.width - totalSpacing;
      const unitWidth =
        numShelves > 0 ? availableWidth / numShelves : targetBay.width;

      // X: Center of the specific shelf
      const targetX =
        targetBay.column +
        unitWidth / 2 +
        validShelfIndex * (unitWidth + shelfSpacing);

      // Calculate exact face positions
      const shelfCenterZ = targetBay.row + targetBay.depth / 2;
      const shelfDepth = targetBay.depth - 0.5;
      const frontFaceZ = shelfCenterZ + shelfDepth / 2;
      const backFaceZ = shelfCenterZ - shelfDepth / 2;

      // Calculate shelf X boundaries
      const shelfLeftX = targetX - unitWidth / 2;
      const shelfRightX = targetX + unitWidth / 2;
      const shelfCenterX = targetX;

      targetZ = shelfCenterZ;
      targetXFinal = shelfCenterX;

      // Prefer the longer open side: width (front/back) vs. depth (left/right)
      const isWideShelf = unitWidth > shelfDepth;

      if (isWideShelf) {
        // Prefer front/back faces first
        if (frontOpen) {
          targetZ = frontFaceZ + safeDistance;
        } else if (backOpen) {
          targetZ = backFaceZ - safeDistance;
        } else if (rightOpen) {
          targetXFinal = shelfRightX + safeDistance;
        } else if (leftOpen) {
          targetXFinal = shelfLeftX - safeDistance;
        } else {
          // All closed: fallback
          targetZ = frontFaceZ + safeDistance;
        }
      } else {
        // Prefer left/right faces first
        if (rightOpen) {
          targetXFinal = shelfRightX + safeDistance;
        } else if (leftOpen) {
          targetXFinal = shelfLeftX - safeDistance;
        } else if (frontOpen) {
          targetZ = frontFaceZ + safeDistance;
        } else if (backOpen) {
          targetZ = backFaceZ - safeDistance;
        } else {
          // All closed: fallback
          targetZ = frontFaceZ + safeDistance;
        }
      }
    }

    // Boundary checks to keep path somewhat valid within grid
    targetZ = Math.max(0, Math.min(targetZ, storeConfig.gridSize.depth - 1));
    targetXFinal = Math.max(
      0,
      Math.min(targetXFinal, storeConfig.gridSize.width - 1)
    );

    const target: PathNode = {
      x: targetXFinal,
      z: targetZ,
      floor: targetBay.floor,
    };

    const path = findShortestPath(storeConfig, storeConfig.entrance, target);

    // Debug logging
    // if (
    //   activeProduct.name === "Frozen Pepperoni Pizza" ||
    //   activeProduct.name === "Vanilla Extract"
    // ) {
    //   console.log(`Path calculation for ${activeProduct.name}:`);
    //   console.log("Target endpoint:", target);
    //   console.log("Target bay:", targetBay.id, "Floor:", targetBay.floor);
    //   console.log(
    //     "Shelf index:",
    //     validShelfIndex,
    //     "Shelf ID:",
    //     activeProduct.shelfId
    //   );
    //   console.log("Closed sides:", closedSides);
    //   console.log("Path length:", path.length);
    //   if (path.length > 0) {
    //     console.log("Path points:", path.slice(0, 5), "...", path.slice(-5));
    //   } else {
    //     console.warn("PATH IS EMPTY! Check pathfinder logic.");
    //   }
    // }

    return path;
  }, [storeConfig, activeProduct, targetBay]);

  if (isStoreLoading || isProductsLoading) {
    return (
      <div className="loading_container">
        <div className="spinner" style={{ width: "32px", height: "32px" }} />
      </div>
    );
  }

  if (!activeProduct || !storeConfig) {
    return (
      <motion.div
        className="store-page-error"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2>Product not found</h2>
        <Link to="/apps/navigator/home">Back to Home</Link>
      </motion.div>
    );
  }

  return (
    <div className="map-page-wrapper">
      <div className="map-section">
        {/* Floating Controls */}
        <motion.div
          className="map-controls"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <button
            className="back-btn"
            onClick={() => navigate("/apps/navigator/home")}
            aria-label="Go back"
          >
            <i className="fa-solid fa-chevron-left"></i>
          </button>

          <div className="search-bar">
            <Dialog open={searchWindowOpen} setOpen={setSearchWindowOpen}>
              <Dialog.Trigger
                className={`search-bar-input ${
                  searchWindowOpen ? "hidden" : ""
                }`}
              >
                <img src={sparkle} alt="sparkle" />
                Search products...
              </Dialog.Trigger>
              <Dialog.Content className="search-modal-content">
                <SearchModalInMap />
              </Dialog.Content>
              <Dialog.Overlay className="search-modal-overlay" />
            </Dialog>
          </div>
        </motion.div>

        {/* Map Placeholder */}
        <div className="map-canvas">
          <Store3D
            config={storeConfig}
            targetProduct={activeProduct}
            path={navigationPath}
            currentFloor={currentFloor}
            allProducts={products}
            showAllProducts={false}
            disableFocus={true}
          />

          <div className="floors">
            {getAllFloors(storeConfig)
              .slice()
              .reverse()
              .map((f) => (
                <button
                  key={f}
                  onClick={() => setCurrentFloor(f)}
                  className={`floor-button ${
                    currentFloor === f ? "is-active" : ""
                  }`}
                >
                  {f + 1}F
                </button>
              ))}
            <Dialog
              open={locationInfoModalOpen}
              setOpen={setLocationInfoModalOpen}
            >
              <Dialog.Trigger className="floor-button location-info-button">
                <img src={locationInfo} className="location-info" />
              </Dialog.Trigger>
              <Dialog.Content className="location-info-dialog">
                <div className="location-info-dialog--header">
                  <h3>Location Details</h3>
                  <button onClick={() => setLocationInfoModalOpen(false)}>
                    <i className="fa-solid fa-x"></i>
                  </button>
                </div>
                <RouteDetails productLocation={productLocation} />
              </Dialog.Content>
              <Dialog.Overlay className="location-info-dialog--overlay" />
            </Dialog>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="map-sidebar">
        <h3>Location Details</h3>
        <div className="sidebar-content">
          <RouteDetails productLocation={productLocation} />
        </div>
      </aside>
    </div>
  );
};

export default StoreMap;
