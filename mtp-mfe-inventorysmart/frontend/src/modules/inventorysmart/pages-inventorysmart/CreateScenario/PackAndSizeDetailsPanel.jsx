import { connect } from "react-redux";
import { useState, memo, useCallback, useEffect, useMemo } from "react";
import { Panel, Input, Select } from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SearchIcon from "@mui/icons-material/Search";
import Loader from "core/Utils/Loader/loader";
import { getViewPackConfiguration } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import colours from "core/Styles/colours";
import "../Finalize-Allocation/components/ViewPackConfiguration/ViewPackConfiguration.scss";

const ALL_SIZES_OPTION = { label: "All", value: "all" };

const useStyles = makeStyles(() => ({
  packConfigPanel: {
    fontFamily: "Manrope",
    "& .impact_drawer_container_large": {
      width: "480px",
    },
  },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    marginBottom: "16px",
  },
  searchField: {
    flexShrink: 0,
    "& .impact_inputbox_container_with_icons .impact-input-wrapper": {
      width: "382px",
      height: "32px",
    },
  },
  filtersDivider: {
    width: "12px",
    height: 0,
    borderTop: `1px solid ${colours.separaterColor}`,
    transform: "rotate(90deg)",
    flexShrink: 0,
  },
  sizeSelect: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    minWidth: "unset",
    "& [class*='impact']": {
      minWidth: "unset !important",
    },
    "& .MuiInputBase-root, & .impact-select__control": {
      minHeight: "32px",
      height: "32px",
      width: "168px",
      minWidth: "unset !important",
    },
  },
  packList: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  emptyState: {
    fontFamily: "Manrope",
    fontSize: "14px",
    color: colours.neutralGrey,
    padding: "16px 0",
  },
}));

const formatQuantity = (qty) => (qty < 10 ? `0${qty}` : `${qty}`);

const PackItem = memo(({ pack, isExpanded, onToggle }) => (
  <div className="pack-item">
    <div className="pack-header" onClick={() => onToggle(pack.pack_type_id)}>
      <div className="pack-header-name">
        <div className="pack-icon">
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </div>
        <span>{pack.pack_type_id}</span>
      </div>
      <span className="pack-total">Total: {pack.total_units}</span>
    </div>
    {isExpanded && (
      <div className="chip-container">
        <div className="chip-content">
          {(pack.sizes || []).map((sizeItem, idx) => (
            <span key={`${sizeItem.size}-${idx}`} className="chip">
              {sizeItem.size}:{" "}
              <span className="chip-count">
                {formatQuantity(sizeItem.units)}
              </span>
            </span>
          ))}
        </div>
      </div>
    )}
  </div>
));

const PackAndSizeDetailsPanel = (props) => {
  const { isOpen, onClose } = props;
  const classes = useStyles();
  const [expandedPacks, setExpandedPacks] = useState({});
  const [data, setPackData] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [selectedSize, setSelectedSize] = useState(ALL_SIZES_OPTION);
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);

  const allocationCode = props.allocationCodeProp ?? props.allocationCode;
  const planStatus = props.planStatusProp ?? props.planStatus;
  const planType = props.planTypeProp ?? props.planType;

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message,
      options: {
        variant: variance,
        disableOnClose: true,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const getPackData = async () => {
      try {
        setLoading(true);
        const payload = {
          allocation_code: allocationCode,
          article: props.selectedArticle,
          ignore_allocation_code: "",
          plan_status: planStatus,
          plan_type: planType,
        };
        const res = await props.getViewPackConfiguration(payload);
        if (res.data.status && res.data.data) {
          setPackData(res.data.data.pack_configurations || []);
        }
      } catch (err) {
        handleErrorMessage(err);
      } finally {
        setLoading(false);
      }
    };

    getPackData();
  }, [isOpen, props.selectedArticle, allocationCode]);

  const sizeOptions = useMemo(() => {
    const sizes = new Set();
    (data || []).forEach((pack) => {
      (pack.sizes || []).forEach((sizeItem) => {
        if (sizeItem?.size != null && sizeItem.size !== "") {
          sizes.add(String(sizeItem.size));
        }
      });
    });
    return [
      ALL_SIZES_OPTION,
      ...Array.from(sizes)
        .sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
        )
        .map((size) => ({ label: size, value: size })),
    ];
  }, [data]);

  const filteredPacks = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const sizeFilter =
      selectedSize?.value && selectedSize.value !== "all"
        ? String(selectedSize.value)
        : null;

    return (data || []).filter((pack) => {
      const packId = String(pack?.pack_type_id ?? "").toLowerCase();
      const packSizes = pack?.sizes || [];

      const matchesSize =
        !sizeFilter ||
        packSizes.some((sizeItem) => String(sizeItem.size) === sizeFilter);

      if (!matchesSize) {
        return false;
      }

      if (!query) {
        return true;
      }

      const matchesPackName = packId.includes(query);
      const matchesSizeSearch = packSizes.some((sizeItem) =>
        String(sizeItem.size ?? "")
          .toLowerCase()
          .includes(query)
      );

      return matchesPackName || matchesSizeSearch;
    });
  }, [data, searchText, selectedSize]);

  const togglePack = useCallback((packName) => {
    setExpandedPacks((prev) => ({
      ...prev,
      [packName]: !prev[packName],
    }));
  }, []);

  const handleClose = () => {
    setExpandedPacks({});
    setPackData([]);
    setSearchText("");
    setSelectedSize(ALL_SIZES_OPTION);
    setIsSizeDropdownOpen(false);
    onClose?.();
  };

  return (
    <Panel
      className={classes.packConfigPanel}
      title="Pack & Size Details"
      size="large"
      anchor="right"
      width={644}
      onClose={handleClose}
      open={isOpen}
    >
      <div className={classes.filtersRow}>
        <div className={classes.searchField}>
          <Input
            placeholder="Search packs or sizes"
            value={searchText}
            onChange={(event) => setSearchText(event?.target?.value ?? "")}
            rightIcon={<SearchIcon />}
            isClearable
          />
        </div>
        <div className={classes.filtersDivider} />
        <div className={classes.sizeSelect}>
          <Select
            label="Sizes"
            labelOrientation="left"
            isMulti={false}
            isClearable={false}
            isSearchable
            isCloseWhenClickOutside
            isOpen={isSizeDropdownOpen}
            setIsOpen={setIsSizeDropdownOpen}
            initialOptions={sizeOptions}
            currentOptions={sizeOptions}
            selectedOptions={selectedSize}
            setSelectedOptions={setSelectedSize}
            handleChange={(option) =>
              setSelectedSize(option || ALL_SIZES_OPTION)
            }
            setCurrentOptions={() => {}}
            placeholder="All"
            width="168px"
            minWidth="0"
          />
        </div>
      </div>
      <Loader loader={isLoading}>
        <div className={classes.packList}>
          {filteredPacks.length === 0 && !isLoading ? (
            <div className={classes.emptyState}>No packs found.</div>
          ) : (
            filteredPacks.map((pack) => (
              <PackItem
                key={pack.pack_type_id}
                pack={pack}
                isExpanded={!!expandedPacks[pack.pack_type_id]}
                onToggle={togglePack}
              />
            ))
          )}
        </div>
      </Loader>
    </Panel>
  );
};

const mapStateToProps = (store) => ({
  planStatus:
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
      .planStatus,
  planType:
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
      .planType,
  allocationCode:
    store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
      .allocationCode,
});

const mapDispatchToProps = (dispatch) => ({
  getViewPackConfiguration: (payload) =>
    dispatch(getViewPackConfiguration(payload)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PackAndSizeDetailsPanel);
