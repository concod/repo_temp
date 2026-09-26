import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { makeStyles } from "@mui/styles";
import { Tabs } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter, pxToRem } from "core/Utils/functions/utils";
// Global variable to track the currently open popup
let activePopupId = null;

const useStyles = makeStyles((theme) => ({
  portalModal: {
    position: "absolute",
    backgroundColor: "white",
    boxShadow: `0 ${pxToRem(2)} ${pxToRem(10)} rgba(0,0,0,0.1)`,
    borderRadius: pxToRem(8),
    padding: pxToRem(6),
    zIndex: 9999,
    transform: "translateY(-50%)",
    gap: pxToRem(12),
  },
  portalModalWithDetails: {
    width: pxToRem(520),
  },
  portalModalImageOnly: {
    width: "fit-content",
  },
  closeButton: {
    position: "absolute",
    right: pxToRem(5),
    top: pxToRem(5),
    border: "none",
    background: "transparent",
    fontSize: pxToRem(20),
    cursor: "pointer",
    zIndex: 1,
  },
  imageContainer: {
    width: "100%",
    height: "100%",
  },
  thumbnailImage: {
    width: "50%",
    height: "100%",
    cursor: "pointer",
    display: "block",
    margin: "0 auto",
  },
  popupContainer: {
    display: "flex",
    flexDirection: "row",
    gap: pxToRem(12),
    alignItems: "stretch",
  },
  popupImageWrapper: {
    flexShrink: 0,
    width: pxToRem(200),
    minWidth: pxToRem(200),
    minHeight: pxToRem(200),
    borderRadius: pxToRem(8),
    overflow: "hidden",
  },
  popupImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  tableStyles: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: pxToRem(14),
  },
  tableCell: {
    padding: `${pxToRem(4)} ${pxToRem(8)}`,
  },
  tabTableContainer: {
    width: "100%",
    marginTop: pxToRem(10),
  },
  tabCell: {
    marginBottom: pxToRem(10),
    "&:last-child": {
      marginBottom: "0",
    },
  },
  tabTableCell: {
    padding: `${pxToRem(6)} ${pxToRem(8)}`,
    verticalAlign: "top",
  },
  tabTableLabel: {
    fontWeight: "500",
    color: "#333",
    minWidth: pxToRem(120),
  },
  tabTableValue: {
    color: "#666",
  },
}));

// Portal Modal component
const PortalModal = ({
  isOpen,
  children,
  position,
  hasDetails,
}) => {
  const classes = useStyles();
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className={`${classes.portalModal} ${hasDetails ? classes.portalModalWithDetails : classes.portalModalImageOnly}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >

      {children}
    </div>,
    document.body
  );
};

const ImageCellRenderer = (
  params,
  showImageDetails = true,
  showCloseButton = false,
  tableConfig = null,
  tabMappingDetails = []
) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [renderTabs, setRenderTabs] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const imageUrl = params?.value;
  const cellId = `${params?.rowIndex}-${params?.column?.colId}`;


  const finalTableConfig = tableConfig;

  // All useEffect hooks must be called unconditionally at the top level
  useEffect(() => {
    if (activePopupId && activePopupId !== cellId) {
      setIsModalOpen(false);
    }
  }, [activePopupId, cellId]);

  useEffect(() => {
    if (params.data && tabMappingDetails?.length) {
      setRenderTabs(true);
    }
  }, [tabMappingDetails]);

  useEffect(() => {
    const handleCloseAllPopups = (event) => {
      if (event.detail.currentId !== cellId) {
        setIsModalOpen(false);
      }
    };

    const handleClickOutside = (event) => {
      if (
        isModalOpen &&
        !event.target.closest(".image-popup") &&
        !event.target.closest("img")
      ) {
        setIsModalOpen(false);
        activePopupId = null;
      }
    };

    window.addEventListener("closeAllPopups", handleCloseAllPopups);
    document.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("closeAllPopups", handleCloseAllPopups);
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isModalOpen, cellId]);

  // Early return after all hooks have been called
  if (!imageUrl) return null;

  // Determine if there are any details to show alongside the image
  const hasDetails =
    (renderTabs && params.data && tabMappingDetails?.length > 0) ||
    (showImageDetails && params.data && finalTableConfig);

  const renderTabsContent = () => {
    if (!tabMappingDetails?.length) {
      return null;
    }

    const tabNames = tabMappingDetails?.map((tab, index) => ({
      label: tab.label,
      value: index,
    }));

    const tabPanels = tabMappingDetails?.map((tab) => (
      <div className={classes.tabTableContainer} key={tab.id}>
        {Object.entries(tab.fields).map(([label, fieldKey]) => (
          <div
            key={fieldKey}
            className={`${globalClasses.flexAlignBetweenCenter} ${classes.tabCell}`}
          >
            <span
              className={`${classes.tabTableCell} ${classes.tabTableLabel}`}
            >
              {label}:
            </span>
            <span
              className={`${classes.tabTableCell} ${classes.tabTableValue}`}
            >
              {replaceSpecialCharacter(params.data?.[fieldKey]) || "-"}
            </span>
          </div>
        ))}
      </div>
    ));

    const handleTabChange = (_, newValue) => {
      setActiveTab(newValue);
    };

    return (
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        tabNames={tabNames}
        tabPanels={tabPanels}
        remountOnTabChange={false}
      />
    );
  };

  const handleClick = (event) => {
    event.stopPropagation();

    if (activePopupId && activePopupId !== cellId) {
      const event = new CustomEvent("closeAllPopups", {
        detail: { currentId: cellId },
      });
      window.dispatchEvent(event);
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const x = rect.right + window.scrollX + 10;

    const cellCenterY = rect.top + rect.height / 2 + window.scrollY;

    setPosition({ x, y: cellCenterY });
    setIsModalOpen(true);
    activePopupId = cellId;
  };

  return (
    <>
      <div className={classes.imageContainer}>
        <img
          src={imageUrl}
          className={classes.thumbnailImage}
          onClick={handleClick}
          alt="product-img"
        />
      </div>

      <PortalModal
        isOpen={isModalOpen}
        position={position}
        hasDetails={hasDetails}
      >
        <div className={`${classes.popupContainer} image-popup`}>
          <div className={classes.popupImageWrapper}>
            <img
              src={imageUrl}
              className={classes.popupImage}
              alt="product-img"
            />
          </div>
          {renderTabs && params.data
            ? renderTabsContent()
            : showImageDetails &&
              params.data && (
                <div>
                  <table className={classes.tableStyles}>
                    <tbody>
                      {finalTableConfig?.map(({ label, field }) => (
                        <tr key={field}>
                          <td className={classes.tableCell}>{label}:</td>
                          <td className={classes.tableCell}>
                            {params?.data?.[field] || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>
      </PortalModal>
    </>
  );
};

export default ImageCellRenderer;
