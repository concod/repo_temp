import React, { useEffect, useState, useCallback, useMemo } from "react";
import { connect } from "react-redux";
import {
  AccordionModern,
  Input,
  Panel,
  Select,
  useTranslation,
} from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import SearchIcon from "@mui/icons-material/Search";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import {
  getViewPackConfiguration,
  setPackConfigurations,
} from "modules/inventorysmart/services-inventorysmart/Finalize/new-flow-store-view-services";
import { ERROR_MESSAGE } from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ALL_SIZES_VALUE = "all";

const useStyles = makeStyles(() => ({
  panel: {
    fontFamily: "Manrope",
  },
  body: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
    fontFamily: "Manrope",
  },
  filtersRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  searchField: {
    flexShrink: 0,
  },
  searchInput: {
    width: "382px !important",
    minWidth: "382px !important",
    maxWidth: "382px !important",
    "& .impact-input-wrapper": {
      width: "100% !important",
      minWidth: "0 !important",
      boxSizing: "border-box",
    },
    "& .MuiInputBase-root": {
      flex: 1,
      minWidth: 0,
      width: "100% !important",
    },
  },
  filtersDivider: {
    width: 0,
    height: 12,
    borderLeft: "1px solid #c3c8d4",
    flexShrink: 0,
  },
  sizeSelect: {
    flexShrink: 0,
  },
  packList: {
    display: "flex",
    flexDirection: "column",
    padding: 2,
    "& .impact-accordion-modern-main-container": {
      gap: 12,
    },
    "& .impact-modern-accordion-item .impact-modern-accordion-content.expand-content": {
      padding: "4px 16px 8px",
    },
    "& .expand-content-icon + .impact-modern-accordion-title": {
      fontWeight: "600 !important",
    },
    "& .impact-modern-accordion-title": {
      display: "flex",
      alignItems: "center",
      minWidth: 0,
    },
  },
  packHeaderRow: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    minWidth: 0,
    gap: 12,
    cursor: "pointer",
  },
  packName: {
    flex: 1,
    minWidth: 0,
    fontFamily: "Manrope",
    fontWeight: 600,
    fontSize: 14,
    lineHeight: "21px",
    color: "#0d152c",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  totalBadge: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 20,
    maxWidth: 164,
    padding: "2px 8px",
    borderRadius: 1000,
    backgroundColor: "#f2f3f4",
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "16px",
    color: "#5f6673",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chipContent: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  chip: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    maxWidth: 164,
    padding: "2px 8px",
    border: "1px solid #d9dde7",
    borderRadius: 12,
    backgroundColor: "#fff",
    fontFamily: "Manrope",
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "16px",
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  chipLabel: {
    color: "#60697d",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  chipCount: {
    color: "#1f2b4d",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  emptyState: {
    fontFamily: "Manrope",
    fontSize: 14,
    fontWeight: 500,
    lineHeight: "21px",
    color: "#60697d",
    padding: "16px 0",
  },
}));

const formatQuantity = (qty) => (qty < 10 ? `0${qty}` : `${qty}`);

const PackSizePanel = ({
  isOpen,
  onClose,
  selectedArticle,
  ...props
}) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [packData, setPackData] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isSizeDropdownOpen, setIsSizeDropdownOpen] = useState(false);

  const allSizesOption = useMemo(
    () => ({
      label: t("inventorysmart.finalize.recommendation.allSizes"),
      value: ALL_SIZES_VALUE,
    }),
    [t]
  );
  const sizeOptions = useMemo(() => [allSizesOption], [allSizesOption]);

  const displaySnackMessages = (message, variant) => {
    props.addSnack({ message, options: { variant, disableOnClose: true } });
  };

  const applyPackData = (configs) => {
    const nextConfigs = configs || [];
    setPackData(nextConfigs);
    const firstPackId = nextConfigs[0]?.pack_type_id;
    setExpanded(firstPackId != null ? [String(firstPackId)] : []);
  };

  useEffect(() => {
    if (!isOpen) {
      if (props.packConfigurations === null) {
        setLoading(true);
      }
      return;
    }
    // Use cached pack configurations from Redux if already fetched
    if (props.packConfigurations !== null) {
      applyPackData(props.packConfigurations || []);
      setLoading(false);
      return;
    }
    setLoading(true);
    const fetchPacks = async () => {
      try {
        const payload = {
          allocation_code: props.allocationCode,
          article: selectedArticle,
          ignore_allocation_code: "",
          plan_status: props.planStatus,
          plan_type: props.planType,
        };
        const res = await props.getViewPackConfiguration(payload);
        if (res?.data?.status && res.data.data) {
          const configs = res.data.data.pack_configurations || [];
          props.storePackConfigurations(configs);
          applyPackData(configs);
        }
      } catch (err) {
        const errObj = err?.response?.data;
        displaySnackMessages(
          errObj?.show_message ? errObj.message : ERROR_MESSAGE,
          "error"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchPacks();
  }, [isOpen, selectedArticle]);

  const handleClose = () => {
    setExpanded([]);
    setSearchText("");
    setIsSizeDropdownOpen(false);
    if (onClose) onClose();
  };

  const togglePack = useCallback((packId) => {
    setExpanded((prev) =>
      prev.includes(packId)
        ? prev.filter((id) => id !== packId)
        : [...prev, packId]
    );
  }, []);

  const accordionData = useMemo(
    () =>
      (packData || []).map((pack) => {
        const packId = String(pack.pack_type_id);
        return {
          id: packId,
          value: packId,
          header: (
            <div
              className={classes.packHeaderRow}
              onClick={(event) => {
                event.stopPropagation();
                togglePack(packId);
              }}
            >
              <span className={classes.packName}>{pack.pack_type_id}</span>
              <span className={classes.totalBadge}>
                {t("inventorysmart.finalize.recommendation.packTotal", {
                  count: pack.total_units,
                })}
              </span>
            </div>
          ),
          content: (
            <div className={classes.chipContent}>
              {(pack.sizes || []).map((sizeItem, idx) => (
                <span
                  key={`${sizeItem.size}-${idx}`}
                  className={classes.chip}
                >
                  <span className={classes.chipLabel}>{sizeItem.size}:</span>
                  <span className={classes.chipCount}>
                    {formatQuantity(sizeItem.units)}
                  </span>
                </span>
              ))}
            </div>
          ),
        };
      }),
    [packData, classes, t, togglePack]
  );

  return (
    <Panel
      className={classes.panel}
      title={t("inventorysmart.finalize.recommendation.packAndSizeDetails")}
      size="large"
      anchor="right"
      width={644}
      onClose={handleClose}
      open={isOpen}
    >
      <Loader loader={isLoading}>
        <div className={classes.body}>
          <div className={classes.filtersRow}>
            <div className={classes.searchField}>
              <Input
                className={classes.searchInput}
                placeholder={t(
                  "inventorysmart.finalize.recommendation.searchPacksOrSizes"
                )}
                value={searchText}
                onChange={(event) => setSearchText(event?.target?.value ?? "")}
                rightIcon={<SearchIcon />}
                size="large"
              />
            </div>
            <div className={classes.filtersDivider} />
            <div className={classes.sizeSelect}>
              <Select
                label={t("inventorysmart.finalize.recommendation.sizes")}
                labelOrientation="left"
                isMulti={false}
                isClearable={false}
                isWithSearch={false}
                isCloseWhenClickOutside
                isOpen={isSizeDropdownOpen}
                setIsOpen={setIsSizeDropdownOpen}
                initialOptions={sizeOptions}
                currentOptions={sizeOptions}
                selectedOptions={allSizesOption}
                setSelectedOptions={() => {}}
                handleChange={() => {}}
                setCurrentOptions={() => {}}
                placeholder={t(
                  "inventorysmart.finalize.recommendation.allSizes"
                )}
                width="168px"
                minWidth="168px"
              />
            </div>
          </div>
          <div className={classes.packList}>
            {packData.length === 0 && !isLoading ? (
              <div className={classes.emptyState}>
                {t("inventorysmart.finalize.recommendation.noPacksFound")}
              </div>
            ) : (
              <AccordionModern
                data={accordionData}
                isMultiExpanded
                expanded={expanded}
                onChange={(activeAccordion) => {
                  setExpanded((prev) =>
                    prev.includes(activeAccordion)
                      ? prev.filter((val) => val !== activeAccordion)
                      : [...prev, activeAccordion]
                  );
                }}
                setExpanded={(activeAccordion) => {
                  if (Array.isArray(activeAccordion)) {
                    setExpanded(activeAccordion);
                  }
                }}
              />
            )}
          </div>
        </div>
      </Loader>
    </Panel>
  );
};

const mapStateToProps = (store) => ({
  allocationCode:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .allocationCode,
  planStatus:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .planStatus,
  planType:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService.planType,
  packConfigurations:
    store.inventorysmartReducer.inventorySmartNewFlowStoreViewService
      .packConfigurations,
});

const mapDispatchToProps = (dispatch) => ({
  getViewPackConfiguration: (payload) =>
    dispatch(getViewPackConfiguration(payload)),
  storePackConfigurations: (configs) =>
    dispatch(setPackConfigurations(configs)),
  addSnack: (snack) => dispatch(addSnack(snack)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PackSizePanel);
