import { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { makeStyles } from "@mui/styles";
import { Tabs } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
// Global variable to track the currently open popup
let activePopupId = null;

const useStyles = makeStyles((theme) => ({
  portalModal: {
    position: "absolute",
    backgroundColor: "white",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    borderRadius: "4px",
    padding: "10px",
    zIndex: 9999,
    transform: "translateY(-50%)",
    width: "450px",
  },
  modalArrow: {
    position: "absolute",
    left: "-8px",
    top: "50%",
    transform: "translateY(-50%)",
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderWidth: "8px 8px 8px 0",
    borderColor: "transparent white transparent transparent",
    filter: "drop-shadow(-2px 0px 1px rgba(0,0,0,0.1))",
  },
  closeButton: {
    position: "absolute",
    right: "5px",
    top: "5px",
    border: "none",
    background: "transparent",
    fontSize: "20px",
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
    flexDirection: "column",
    gap: "15px",
  },
  popupImage: {
    width: "100%",
    height: "250px",
    objectFit: "contain",
    display: "block",
  },
  tableStyles: {
    borderCollapse: "collapse",
    width: "100%",
    fontSize: "14px",
  },
  tableCell: {
    padding: "4px 8px",
  },
  tabTableContainer: {
    width: "100%",
    marginTop: "10px",
  },
  tabCell: {
    marginBottom: "10px",
    "&:last-child": {
      marginBottom: "0",
    },
  },
  tabTableCell: {
    padding: "6px 8px",
    verticalAlign: "top",
  },
  tabTableLabel: {
    fontWeight: "500",
    color: "#333",
    minWidth: "120px",
  },
  tabTableValue: {
    color: "#666",
  },
}));

// Portal Modal component
const PortalModal = ({
  isOpen,
  onClose,
  children,
  position,
  showCloseButton,
}) => {
  const classes = useStyles();
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      className={classes.portalModal}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className={classes.modalArrow} />

      {showCloseButton && (
        <button className={classes.closeButton} onClick={onClose}>
          ×
        </button>
      )}
      {children}
    </div>,
    document.body
  );
};

const ImageCellRenderer = (
  params,
  showImageDetails = true,
  showCloseButton = true,
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
        onClose={() => {
          setIsModalOpen(false);
          activePopupId = null;
        }}
        position={position}
        showCloseButton={showCloseButton}
      >
        <div className={`${classes.popupContainer} image-popup`}>
          <img
            src={imageUrl}
            className={classes.popupImage}
            alt="product-img"
          />
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
