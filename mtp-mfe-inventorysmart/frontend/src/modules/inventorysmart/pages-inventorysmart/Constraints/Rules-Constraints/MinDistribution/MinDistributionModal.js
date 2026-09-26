import React, { useState, useEffect } from "react";
import {
  Panel,
  Input,
  RadioButtonGroup,
  Button,
  useTranslation,
} from "impact-ui-v3";
import { connect } from "react-redux";
import { useExceptionStyles } from "../../../Exceptions-stores/exceptionStyles";
import {
  getDistributionStrategy,
  calculateSizeDistribution,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { handleErrorMessage } from "../add-rcl-component";
import { addSnack } from "core/actions/snackbarActions";
import {
  DISTRIBUTION_STRATEGY_TABLE_CONFIG,
  MIN_DISTRIBUTION_MAP,
  ERROR_MESSAGE,
} from "../../../../constants-inventorysmart/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep, isEmpty } from "lodash";
import XUnitsPerSizeSection from "./XUnitsPerSizeSection";
import { displaySnackMessages } from "../../../inventorysmart-utility";
import SizeDistributionTable from "./SizeDistributionTable";
import { getMinDistributionKey } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import ProductProfileTable from "./ProductProfileTable";

const MinDistributionModal = (props) => {
  const { t } = useTranslation();
  const [minValue, setMinValue] = useState(null);
  const [
    selectedMinDistributionType,
    setSelectedMinDistributionType,
  ] = useState(null);
  const [showSizeDistribution, setShowSizeDistribution] = useState(false);
  const [tempTable, setTempTable] = useState(null);
  const [distributionStrategyData, setDistributionStrategyData] = useState(
    null
  );
  const [distributionStrategyLoader, setDistributionStrategyLoader] = useState(
    false
  );
  const [sizeDistributionLoader, setSizeDistributionLoader] = useState(false);
  const [tableCols, setTableCols] = useState([]);
  const [sizeList, setSizeList] = useState([]);
  const [sizeDistributionData, setSizeDistributionData] = useState([]);
  const [sizeSelectionData, setSizeSelectionData] = useState({});
  const [
    enableCalculateSizeDistribution,
    setEnableCalculateSizeDistribution,
  ] = useState(false);
  const [disableSaveButton, setDisableSaveButton] = useState(true);
  const [onBlurMinValue, setOnBlurMinValue] = useState(null);
  const useStyles = useExceptionStyles();

  const radioOptions = [
    {
      label: t("inventorysmart.rclMinDistSameMin"),
      value: "same_min",
    },
    {
      label: t("inventorysmart.rclMinDistEqualDistribute"),
      value: "equal_distribute",
    },
    {
      label: t("inventorysmart.rclMinDistProductProfile"),
      value: "product_profile",
    },
    {
      label: t("inventorysmart.rclMinDistXUnits"),
      value: "x_units_per_size",
    },
  ];

  useEffect(() => {
    if (props.isModalOpen) {
      setSelectedMinDistributionType(radioOptions[0]?.value);
    }
  }, [props.isModalOpen]);

  useEffect(() => {
    if (
      sizeList?.length > 0 &&
      isEmpty(props.rowData?.data?.x_units_per_size)
    ) {
      resetSizeSelectionData();
    }
  }, [sizeList]);

  useEffect(() => {
    if (!props.isModalOpen) return;
    if (
      props.rowData?.data?.min_stock !== null &&
      props.rowData?.data?.min_stock !== undefined
    ) {
      setMinValue(props.rowData.data.min_stock);
      setOnBlurMinValue(props.rowData.data.min_stock);
    }
    const minDistribution = props.rowData?.data?.min_distribution;
    if (
      minDistribution &&
      typeof minDistribution === "string" &&
      minDistribution.toLowerCase() !== "configure"
    ) {
      setSelectedMinDistributionType(getMinDistributionKey(minDistribution));
    }
    if (
      getMinDistributionKey(minDistribution) === "x_units_per_size" &&
      props.rowData?.data?.x_units_per_size
    ) {
      setSizeSelectionData(props.rowData.data.x_units_per_size);
    }
  }, [props.rowData, props.isModalOpen]);

  useEffect(() => {
    setShowSizeDistribution(false);
    setDisableSaveButton(true);
    setTempTable(null);
    setSizeDistributionData([]);
    setSizeList([]);
    setDistributionStrategyData([]);
    setTableCols([]);
    if (selectedMinDistributionType) {
      fetchDistributionStrategy();
    }
    if (selectedMinDistributionType !== "x_units_per_size") {
      resetSizeSelectionData();
    }
  }, [selectedMinDistributionType]);

  const resetSizeSelectionData = () => {
    let data = {};
    sizeList?.forEach((size) => {
      data[size] = 0;
    });
    setSizeSelectionData(data);
  };

  const fetchDistributionStrategy = async () => {
    setTempTable(null);
    try {
      setDistributionStrategyLoader(true);
      const payload = {
        distribution_type: getMinDistributionKey(selectedMinDistributionType),
        article:
          props.rowData?.node?.parent?.data?.[
            props.constraintsConfigs?.style_mapping_key
          ],
        filters: (() => {
          const styleMappingKey = props.constraintsConfigs?.style_mapping_key;
          const articleValue =
            props.rowData?.node?.parent?.data?.[styleMappingKey];
          const existingFilter = props.filters?.find(
            (filter) => filter.filter_id === styleMappingKey
          );

          if (existingFilter) {
            return props.filters?.map((filter) => {
              if (filter.filter_id === styleMappingKey) {
                return {
                  ...filter,
                  values: [articleValue],
                  check_configuration: filter.check_configuration?.map(
                    (config) => ({
                      ...config,
                      checkedRows: [articleValue],
                    })
                  ),
                };
              }
              return filter;
            });
          } else {
            const newFilter = {
              filter_id: styleMappingKey,
              attribute_name: styleMappingKey,
              values: [articleValue],
              dimension: "product",
              filter_name: null,
              filter_type: null,
              display_type: null,
              check_configuration: null,
              is_mandatory: null,
              extra: null,
              operator: "in",
            };
            return [...(props.filters || []), newFilter];
          }
        })(),
      };
      if (props.flow === "rules_constraint_list") {
        payload.psa_code = props.rowData?.node?.parent?.data?.psa_code;
        payload.rule_code = props.rowData?.node?.parent?.data?.rule_code;
      }
      let response = await getDistributionStrategy(payload);
      if (response.data.show_message && response.data.message) {
        displaySnackMessages(response.data.message, "success", props, true);
      }
      if (response?.data?.data?.table_name) {
        setTempTable(response.data.data.table_name);
        if (selectedMinDistributionType === "product_profile") {
          let tableData = [];
          let configs = [
            {
              ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
              column_name: "store_number",
              is_frozen: true,
              order_of_display: 0,
              label: t("inventorysmart.rclStoreNumberColumn"),
              extra: { sortLabelType: "int" },
            },
            {
              ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
              column_name: "Size Distribution %",
              label: t("inventorysmart.rclSizeDistributionPercentLabel"),
              order_of_display: 1,
              tc_mapping_code: 5051002,
            },
          ];

          response?.data?.data?.stores?.map((store, index) => {
            let rowData = {};
            let sizeDistributionCol = cloneDeep(configs[1]);
            let mappingCode = 5051002;
            store.data.map((item, sizeIdx) => {
              if (index === 0) {
                sizeDistributionCol.sub_headers.push({
                  ...DISTRIBUTION_STRATEGY_TABLE_CONFIG,
                  label: item.size,
                  column_name: item.size,
                  tc_mapping_code: ++mappingCode,
                  order_of_display: sizeIdx + 2,
                  child_tc_mapping_code: 5051002,
                  type: "float",
                  extra: {
                    sortLabelType: "int",
                    ignoreSuppressSizeToFit: true,
                  },
                });
              }
              rowData[item.size] = item.normalized_size_level_proportion;
            });
            configs[1] = sizeDistributionCol;
            rowData["store_number"] = store.store_code;
            tableData.push(rowData);
          });
          configs = agGridColumnFormatter(
            configs,
            {},
            {},
            false,
            null,
            false,
            false
          );
          setTableCols(configs);
          setDistributionStrategyData(tableData);
        } else if (selectedMinDistributionType === "x_units_per_size") {
          setSizeList(response?.data?.data?.stores);
        }
      }
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      setDistributionStrategyLoader(false);
    }
  };

  const fetchSizeDistribution = async () => {
    if (!minValue) {
      displaySnackMessages(
        t("inventorysmart.rclEnterValidMinValue"),
        "error",
        props,
        true
      );
    } else {
      setShowSizeDistribution(false);
      try {
        setSizeDistributionLoader(true);
        let payload = {
          distribution_type: getMinDistributionKey(selectedMinDistributionType),
          temp_table: tempTable,
          min: minValue,
          x_units_per_size: sizeSelectionData,
        };
        let response = await calculateSizeDistribution(payload);
        if (response.data.show_message && response.data.message) {
          displaySnackMessages(response.data.message, "success", props, true);
        }
        if (response.data.data?.stores) {
          setSizeDistributionData(response.data.data?.stores);
          setDisableSaveButton(false);
        }
      } catch (error) {
        const errObj = error?.response?.data;
        props.addSnack({
          message: errObj?.message || ERROR_MESSAGE,
          options: {
            variant: "warning",
          },
        });
      } finally {
        setSizeDistributionLoader(false);
        setShowSizeDistribution(true);
      }
    }
  };

  const closeModal = () => {
    setSelectedMinDistributionType(null);
    setTableCols([]);
    setDistributionStrategyData([]);
    setSizeDistributionData([]);
    setSizeList([]);
    props.setIsModalOpen(false);
    setMinValue(null);
    resetSizeSelectionData();
  };

  const handleMinChange = (e) => {
    setMinValue(e.target.value);
  };

  const handleMinBlur = (e) => {
    let value = e.target.value;
    let maxStock = props.rowData?.data?.max_stock;

    if (value < 1) {
      setMinValue(1);
      setOnBlurMinValue(1);
    } else if (maxStock && value > maxStock) {
      displaySnackMessages(
        t("inventorysmart.rclMinGreaterThanMax"),
        "warning",
        props,
        true
      );
      setMinValue(maxStock);
      setOnBlurMinValue(maxStock);
    } else {
      setOnBlurMinValue(value);
    }
  };

  const handleMinDistributionChange = (e) => {
    setSelectedMinDistributionType(e.target.value);
  };

  const handleSave = () => {
    if (!minValue) {
      displaySnackMessages(
        t("inventorysmart.rclEnterValidMinValue"),
        "error",
        props,
        true
      );
      return;
    } else if (selectedMinDistributionType === "x_units_per_size") {
      let isDataInvalid;
      if (!isEmpty(sizeSelectionData)) {
        isDataInvalid = !Object.values(sizeSelectionData).some(
          (value) => value && value > 0
        );
      }
      if (isEmpty(sizeSelectionData) || isDataInvalid) {
        displaySnackMessages(
          t("inventorysmart.rclSelectUnitsAndSizes"),
          "error",
          props,
          true
        );
        return;
      }
    }
    const node = props.rowData?.node;
    const clonedXunits = cloneDeep(sizeSelectionData);
    if (node) {
      node.setDataValue(
        "min_distribution",
        MIN_DISTRIBUTION_MAP[selectedMinDistributionType]
      );
      node.setDataValue("min_stock", minValue);
      node.setDataValue("x_units_per_size", clonedXunits);
    }
    const newData = {
      ...props.rowData?.data,
      min_stock: minValue,
      min_distribution: selectedMinDistributionType,
      x_units_per_size: clonedXunits,
    };
    if (props.handleMinDistributionSave) {
      props.handleMinDistributionSave(props.rowData, newData);
    } else {
      props.addDataToEditableState(props.rowData, newData);
    }
    closeModal();
  };

  return (
    <Panel
      title={t("inventorysmart.rclMinDistributionTitle")}
      size="large"
      anchor="bottom"
      open={props.isModalOpen}
      onClose={closeModal}
      className={useStyles.minDistributionPanel}
      onPrimaryButtonClick={handleSave}
      onSecondaryButtonClick={closeModal}
      primaryButtonLabel={t("inventorysmart.rclSaveButton")}
      secondaryButtonLabel={t("inventorysmart.rclCancelButton")}
      primaryButtonProps={{
        disabled: disableSaveButton,
      }}
    >
      <div className="container">
        <div className="style-details">
          <span className="style-name">
            <p>{t("inventorysmart.rclSelectedStyle")}</p>
            <p>
              {
                props.rowData?.node?.parent?.data?.[
                  props.constraintsConfigs?.style_mapping_key
                ]
              }
            </p>
          </span>
          <span className="min-input-section">
            <p>
              {t("inventorysmart.rclMinLabel")}
              <span style={{ color: "red", marginLeft: 2 }}>*</span>
            </p>
            <Input
              type="number"
              value={minValue}
              onChange={handleMinChange}
              onBlur={handleMinBlur}
              inputProps={{
                min: 1,
              }}
            />
          </span>
        </div>
        <div className={useStyles.minDistributionSelection}>
          <RadioButtonGroup
            name="min-distribution-radio-btns"
            onChange={handleMinDistributionChange}
            options={radioOptions}
            orientation="row"
            selectedOption={selectedMinDistributionType}
          />
          <Button
            className=""
            size="large"
            type="default"
            variant="secondary"
            onClick={() => {
              fetchSizeDistribution();
            }}
            disabled={
              (!enableCalculateSizeDistribution &&
                selectedMinDistributionType === "x_units_per_size") ||
              !tempTable
            }
          >
            {t("inventorysmart.rclSizeDistributionPreview")}
          </Button>
        </div>
        {selectedMinDistributionType === "product_profile" && (
          <ProductProfileTable
            tableCols={tableCols}
            distributionStrategyLoader={distributionStrategyLoader}
            distributionStrategyData={distributionStrategyData}
          />
        )}
        {selectedMinDistributionType === "x_units_per_size" && (
          <XUnitsPerSizeSection
            sizeList={sizeList}
            distributionStrategyLoader={distributionStrategyLoader}
            sizeSelectionData={sizeSelectionData}
            setSizeSelectionData={setSizeSelectionData}
            rowData={props.rowData}
            minValue={onBlurMinValue}
            resetSizeSelectionData={resetSizeSelectionData}
            setEnableCalculateSizeDistribution={
              setEnableCalculateSizeDistribution
            }
          />
        )}
        {showSizeDistribution && (
          <SizeDistributionTable
            data={sizeDistributionData}
            sizeDistributionLoader={sizeDistributionLoader}
          />
        )}
      </div>
    </Panel>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    selectedRclProductLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    constraintsConfigs:
      inventorysmartReducer.inventorySmartConstraints.constraintsConfigs,
  };
};

const mapActionToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
  };
};

export default connect(mapStateToProps, mapActionToProps)(MinDistributionModal);
