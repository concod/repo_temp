import React, { useState, useEffect, useMemo, useRef } from "react";
import { Panel, Select, RadioButtonGroup, useTranslation } from "impact-ui-v3";
import Heatmap from "./Heatmap/Heatmap.jsx";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { getInventoryDetails } from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/store-stock-drill-down-service.js";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import {
  tableConfigurationMetaData,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Typography } from "@mui/material";

const InventoryDetailsPanel = (props) => {
  const { t } = useTranslation();
  const closeSidePanel = () => {
    props.setInventoryDetailsPanelStatus(false);
  };
  const viewByOptions = [
    { label: t("inventorysmart.storeGrade"), value: "store_grade" },
    { label: t("inventorysmart.region"), value: "region" },
  ];
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  const [productOptions, setProductOptions] = useState([]);
  const [panelLoader, setPanelLoader] = useState(true);
  const [articleDetails, setArticleDetails] = useState([]);
  const [isStoreGradeSelectAll, setIsStoreGradeSelectAll] = useState(true);
  const [isRegionSelectAll, setRegionSelectAll] = useState(true);
  const [viewBy, setViewBy] = useState(viewByOptions[0].value);
  const [selectedStoreGrade, setSelectedStoreGrade] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState([]);
  const [isStoreGradeOpen, setIsStoreGradeOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const lastFetchedArticleIdRef = useRef(null);

  // derive options for Store Grade from current heatmap data
  const storeGradeOptions = useMemo(() => {
    const values = Array.from(
      new Set((articleDetails || []).map((d) => d?.store_grade).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b)));
    return values.map((v) => ({ label: v, value: v }));
  }, [articleDetails]);

  // derive options for Region from current heatmap data
  const regionOptions = useMemo(() => {
    const values = Array.from(
      new Set((articleDetails || []).map((d) => d?.region).filter(Boolean))
    ).sort((a, b) => String(a).localeCompare(String(b)));
    return values.map((v) => ({ label: v, value: v }));
  }, [articleDetails]);

  //Se options for Selected Product dropdown
  useEffect(() => {
    if (props.selectedRows?.length > 0) {
      let options = props.selectedRows.map((item) => {
        return {
          label: replaceSpecialCharacter(item.article),
          value: item.article,
        };
      });
      setProductOptions(options);
      setSelectedArticleId(options[0]);
    }
  }, [props.selectedRows]);

  //update data when new article is selected from Selected Product dropdown
  useEffect(() => {
    if (selectedArticleId?.value) {
      //check to avoid unnecessary API call if the selected article ID is same as the current article ID
      if (lastFetchedArticleIdRef.current !== selectedArticleId.value) {
        fetchInventoryDetails(selectedArticleId.value); // fetch details of newly selcted article ID
        lastFetchedArticleIdRef.current = selectedArticleId.value;
      }
    }
  }, [selectedArticleId]);

  const handleArticleChange = (option) => {
    setSelectedArticleId(option);
    setIsStoreGradeSelectAll(true);
    setRegionSelectAll(true);
    setSelectedStoreGrade([]);
    setSelectedRegion([]);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const fetchInventoryDetails = async (article) => {
    let payload = {
      filters: (props.filters || []).filter(
        (filterItem) => filterItem?.values?.length > 0
      ),
      meta: {...tableConfigurationMetaData.meta},
      article: article,
    };
    try {
      setPanelLoader(true);
      const response = await props.getInventoryDetails(payload);
      const articleData = response?.data?.data ?? [];
      setArticleDetails(articleData);

      // Immediately update filter selections for new dataset when Select All is enabled
      const nextStoreGrades = Array.from(
        new Set(articleData.map((d) => d?.store_grade).filter(Boolean))
      )
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((v) => ({ label: v, value: v }));

      const nextRegions = Array.from(
        new Set(articleData.map((d) => d?.region).filter(Boolean))
      )
        .sort((a, b) => String(a).localeCompare(String(b)))
        .map((v) => ({ label: v, value: v }));

      if (isStoreGradeSelectAll) setSelectedStoreGrade(nextStoreGrades);
      if (isRegionSelectAll) setSelectedRegion(nextRegions);
    } catch (e) {
      handleErrorMessage(e);
    } finally {
      setPanelLoader(false);
    }
  };

  // After each data refresh, keep selections in sync with options when Select All is enabled
  useEffect(() => {
    if (isStoreGradeSelectAll) setSelectedStoreGrade(storeGradeOptions);
    if (isRegionSelectAll) setSelectedRegion(regionOptions);
  }, [articleDetails, storeGradeOptions, regionOptions, isStoreGradeSelectAll, isRegionSelectAll]);

  useEffect(() => {
    const allSelected =
      Array.isArray(selectedStoreGrade) &&
      selectedStoreGrade.length > 0 &&
      selectedStoreGrade.length === (storeGradeOptions?.length || 0);
    if (allSelected !== isStoreGradeSelectAll) {
      setIsStoreGradeSelectAll(allSelected);
    }
  }, [selectedStoreGrade, storeGradeOptions]);

  useEffect(() => {
    const allSelected =
      Array.isArray(selectedRegion) &&
      selectedRegion.length > 0 &&
      selectedRegion.length === (regionOptions?.length || 0);
    if (allSelected !== isRegionSelectAll) {
      setRegionSelectAll(allSelected);
    }
  }, [selectedRegion, regionOptions]);

  return (
    <Panel
      title={t("inventorysmart.inventoryDetails")}
      size="large"
      anchor="right"
      open={props.inventoryDetailsPanelStatus}
      onClose={closeSidePanel}
      style={{
        width: "895px",
      }}
      className={classes.inventoryDetailsPanel}
    >
      <Loader
        loader={panelLoader}
        size="medium"
        text={t("inventorysmart.loadingDetails")}
        minHeight={"100vh"}
      >
        <div
          className={`${globalClasses.flexColumn} ${globalClasses.layoutAlignStart} ${globalClasses.gap}`}
        >
          <Select
            label={t("inventorysmart.selectedProduct")}
            setIsOpen={setIsDropdownOpen}
            isOpen={isDropdownOpen}
            isSearchable={true}
            isClearable={false}
            isCloseWhenClickOutside={true}
            isMulti={false}
            initialOptions={productOptions}
            currentOptions={productOptions}
            selectedOptions={selectedArticleId}
            setSelectedOptions={setSelectedArticleId}
            labelOrientation="left"
            handleChange={handleArticleChange}
          />
          {Array.isArray(articleDetails) && articleDetails.length === 0 ? (
            <div className={classes.noInventoryDetailsContainer}>
              <Typography className={classes.noInventoryDetails}>
                {t("inventorysmart.noInventoryDetailsAvailable")}
              </Typography>
            </div>
          ) : (
            <div className={classes.productDetailsContainer}>
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignStart} ${globalClasses.gap} ${classes.marginTopBtm}`}
              >
                <Select
                  label={t("inventorysmart.storeGrade")}
                  setIsOpen={setIsStoreGradeOpen}
                  isOpen={isStoreGradeOpen}
                  isSearchable={false}
                  isClearable={true}
                  isCloseWhenClickOutside={true}
                  isMulti={true}
                  isSelectAll={isStoreGradeSelectAll}
                  setIsSelectAll={setIsStoreGradeSelectAll}
                  isWithSelectAll={true}
                  toggleSelectAll={true}
                  initialOptions={storeGradeOptions}
                  currentOptions={storeGradeOptions}
                  selectedOptions={selectedStoreGrade}
                  setSelectedOptions={setSelectedStoreGrade}
                />
                <Select
                  label={t("inventorysmart.region")}
                  setIsOpen={setIsRegionOpen}
                  isOpen={isRegionOpen}
                  isSearchable={true}
                  isClearable={true}
                  isCloseWhenClickOutside={true}
                  isMulti={true}
                  isSelectAll={isRegionSelectAll}
                  setIsSelectAll={setRegionSelectAll}
                  isWithSelectAll={true}
                  toggleSelectAll={true}
                  initialOptions={regionOptions}
                  currentOptions={regionOptions}
                  selectedOptions={selectedRegion}
                  setSelectedOptions={setSelectedRegion}
                />
              </div>
              <div
                className={`${globalClasses.flexRow} ${globalClasses.layoutAlignStart} ${globalClasses.gap}`}
              >
                <Typography
                  className={`${classes.marginRight1rem} ${classes.label} ${classes.viewByLabel}`}
                >
                  {t("inventorysmart.viewBy")}:
                </Typography>
                <RadioButtonGroup
                  options={viewByOptions}
                  value={viewBy}
                  onChange={(e) => {
                    setViewBy(e.target.value);
                  }}
                  orientation="row"
                  selectedOption={viewBy}
                />
              </div>
              <Heatmap
                data={articleDetails}
                showLegend={true}
                numCols={20}
                tooltipDetails={{
                  Store: "store_code",
                  Units: "total_store_oh",
                  "Store Grade": "store_grade",
                }}
                viewBy={viewBy}
                selectedStoreGrade={selectedStoreGrade}
                selectedRegion={selectedRegion}
              />
            </div>
          )}
        </div>
      </Loader>
    </Panel>
  );
};

const mapStateToProps = () => ({});

const mapActionToProps = (dispatch) => ({
  getInventoryDetails: (body) => dispatch(getInventoryDetails(body)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapActionToProps
)(InventoryDetailsPanel);
