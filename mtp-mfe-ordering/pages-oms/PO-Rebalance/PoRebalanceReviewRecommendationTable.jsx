import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { connect } from "react-redux";
import { FormControl } from "@mui/material";
import { Button, Select, Switch, Chips, Tooltip } from "impact-ui-v3";
import { cloneDeep, isEmpty, isNumber } from "lodash";
import moment from "moment";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import classNames from "classnames";
import { useDispatch } from "react-redux";
import {
  ERROR_MESSAGE,
  defaultTableData,
} from "modules/oms/constants-oms/stringConstants";
import {
  fetchPORebalanceReviewRecommendationTableFields,
  fetchPORebalanceReviewRecommendationTableData,
  saveDraftPayload,
  setPoRebalanceData,
  setChoiceChannelTranferData,
  fetchPOBaseUnitKPIData,
  fetchDropdownDataForPO,
  setDropdownDataForPO,
  fetchPorjectedBopRebalance,
  setPoRebalanceSubClassTableDataLoader,
} from "modules/oms/services-oms/PO-Rebalance/po-rebalance-service";
import {
  FIELDS_FOR_SAVING_DRAFT,
  FIELDS_TO_COPY_FOR_RECOMMENDATION,
  RESET_FIELDS_FOR_RECOMMENDATION,
} from "./constants";
import InfoIcon from "assets/info_icon.svg";

const PoRebalanceReviewRecommendationTable = forwardRef((props, ref) => {
  // expose functions to parent
  const {
    selectedChoice,
    hideSaveDraft,
    hideSaveApprove,
    isUserHasSaveDraftAccess,
    isUserHasApprovePoRebalanceAccess,
    setHideSaveDraft,
    setHideSaveApprove,
    setIsUserHasSaveDraftAccess,
    setIsUserHasApprovePoRebalanceAccess,
  } = props;
  console.log("render", selectedChoice);
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dispatch = useDispatch();
  const [
    styleOrderSummarySubClassTableColumns,
    setStyleOrderSummarySubClassTableColumns,
  ] = useState([]);
  const [tableData, setTableData] = useState([]);

  const [render, setRender] = useState(false);
  // const [selectedChoiceOptions, setSelectedChoiceOptions] = useState({
  //   label: props.selectedRecords[0]?.aggr_column,
  //   value: props.selectedRecords[0]?.aggr_column,
  // });
  const [isOpenViewBy, setIsOpenViewBy] = useState(false);
  // const [d, setSelectedChoice] = useState(
  //   props.selectedRecords[0]?.aggr_column
  // );
  const [isSaveDraftPayload, setIsSaveDraftPayload] = useState([]);

  const styleOrderSubClassTableGridInstance = useRef(null);
  const saveDraftPayload = useRef([]);
  const approvePoPayload = useRef([]);
  const [addNewSize, setAddNewSize] = useState(1);
  const [addNewSizeData, setAddNewSizeData] = useState([]);
  const [deleteSize, setDeleteSize] = useState(1);
  const [deleteSizeData, setDeleteSizeData] = useState([]);
  const [renderTable, setRenderTable] = useState(0);

  const [isPoSourceNull, setIsPoSourceNull] = useState(false);
  const [isPoDestinationNull, setIsPoDestinationNull] = useState(false);
  const [saveTypeValue, setSaveTypeValue] = useState("draft");

  // const [hideSaveDraft, setHideSaveDraft] = useState(false);
  // const [hideSaveApprove, setHideSaveApprove] = useState(false);

  // // Access control states for PO Rebalance
  // const [isUserHasSaveDraftAccess, setIsUserHasSaveDraftAccess] = useState(
  //   true
  // );
  // const [
  //   isUserHasApprovePoRebalanceAccess,
  //   setIsUserHasApprovePoRebalanceAccess,
  // ] = useState(true);
  const [sizeDropdownCache, setSizeDropdownCache] = useState({});
  const [isAllSizesLoaded, setIsAllSizesLoaded] = useState(false);
  const [allSizes, setAllSizes] = useState(new Set());
  const [minKey, setMinKey] = useState("");
  const [maxKey, setMaxKey] = useState("");
  const [startWeekSelection, setStartWeekSelection] = useState("");
  const [endWeekSelection, setEndWeekSelection] = useState("");
  const [choiceOptions, setChoiceOptions] = useState({});

  const transferColumnValidation = useRef([]);
  const disableTransfer = useRef(false);

  const loadTableInstance = (params) => {
    styleOrderSubClassTableGridInstance.current = params;
  };

  const displaySnackMessages = (message, variance, disableOnClose = false) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: disableOnClose,
      },
    });
  };

  const cleanFilters = (filters) => {
    if (!Array.isArray(filters)) return [];
    return filters.filter(
      (filter) =>
        filter.values &&
        Array.isArray(filter.values) &&
        filter.values.length > 0
    );
  };

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);
      const selectedRecord = props.selectedRecords.find(
        (record) => record.aggr_column === selectedChoice
      );
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (item.extra?.is_grouping_key) {
          item.cellRenderer = "agGroupCellRenderer";
          if (item.type === "str") {
            item.rowGroup = true;
            item.isEditable = false;
          }
        }

        if (item?.sub_headers?.length > 0) {
          item.sub_headers = item.sub_headers.map((subHeader) => {
            if (
              subHeader.column_name === "po_source" ||
              subHeader.column_name === "po_destination"
            ) {
              // Only disable if saveType is approve
              // if (false) { // DISABLED: savetype check removed
              //   subHeader.disabled = true;
              // }
              subHeader.cellRenderer = (params) => {
                // Check if row has transfer_id - if yes, disable the cell
                const isDisabledDueToTransferId =
                  params.data?.transfer_id !== null &&
                  params.data?.transfer_id !== undefined;

                // Get options specific to this row's size from cache
                if (params.data?.size) {
                  const sizeOptions =
                    sizeDropdownCache[params.data?.size] || {};
                  const options =
                    subHeader.column_name === "po_source"
                      ? sizeOptions.poSourceOptions?.some(
                          (opt) => opt.value && opt.label
                        )
                        ? sizeOptions.poSourceOptions
                        : []
                      : sizeOptions.poDestinationOptions?.some(
                          (opt) => opt.value && opt.label
                        )
                      ? sizeOptions.poDestinationOptions
                      : [];

                  // Create modified column with size-specific options and transfer_id based disabling
                  const modifiedColumn = {
                    ...subHeader,
                    extra: { width: 500, options: options },
                    disabled: isDisabledDueToTransferId,
                  };

                  return (
                    <CellRenderers
                      cellData={params}
                      column={modifiedColumn}
                      extraProps={null}
                      options={options}
                    ></CellRenderers>
                  );
                }
              };
            }
            return subHeader;
          });
        }

        // Add special handling for transfer column to disable when transfer_id exists
        if (item.accessor === "transfer") {
          item.cellRenderer = (params, extraProps) => {
            // Transfer column should be disabled only when transfer_id is not null
            const isDisabledDueToTransferId =
              params.data?.transfer_id !== null &&
              params.data?.transfer_id !== undefined;

            const modifiedColumn = {
              ...item,
              disabled: isDisabledDueToTransferId,
            };

            return (
              <CellRenderers
                cellData={params}
                column={modifiedColumn}
                extraProps={extraProps}
                actions={null}
              ></CellRenderers>
            );
          };
        }

        if (item?.sub_headers?.length > 0) {
          item.sub_headers = item.sub_headers?.map((subHeader) => {
            if (
              subHeader.column_name === minKey ||
              subHeader.column_name === maxKey
            ) {
              subHeader.cellStyle = (params) => {
                if (params.value < 0) {
                  return { backgroundColor: "#ffebee" }; // Light red background
                }
                return null;
              };
            }
            return subHeader;
          });
        }

        return item;
      });
      return updatedColumnsDef;
    } catch (err) {
      console.log("error", err);
      //displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  const addingNewSize = (params) => {
    if (deleteSizeData.length > 1) {
      const addingSize = new Set(addNewSizeData.map((item) => item.size));
      var RemainingDeleteSizeData = deleteSizeData.filter((item) => {
        // Remove item if its size matches params.data.size_copy
        return item.size !== params.data.size_copy;
      });
      setDeleteSizeData(RemainingDeleteSizeData);
    }
    if (deleteSizeData.length === 1) {
      setDeleteSizeData([]);
    }

    const gridApi = styleOrderSubClassTableGridInstance.current.api;
    const parentNode = params.node.parent;

    if (parentNode && parentNode.data) {
      const originalRow = JSON.parse(JSON.stringify(params.data));
      // Create new size data based on the clicked row

      const newSizeData = {
        ...originalRow,
        id: Math.random(), // Generate unique ID
        isDeleted: false,
      };
      RESET_FIELDS_FOR_RECOMMENDATION.forEach((field) => {
        if (field === "transfer" || field === "rem_transfer") {
          newSizeData[field] = "";
        } else {
          newSizeData[field] = null;
        }
      });
      FIELDS_TO_COPY_FOR_RECOMMENDATION.forEach((field) => {
        newSizeData[field] = params.data[field];
      });

      // Get all existing rows and make a deep copy
      const allRows = JSON.parse(JSON.stringify(parentNode.data.status_obj));

      // Find the index of the original row
      const currentIndex = allRows.findIndex(
        (row) => row.id === originalRow.id
      );

      // Create new status_obj array with the new size data
      const newStatusObj = [
        ...allRows.slice(0, currentIndex + 1),
        newSizeData,
        ...allRows.slice(currentIndex + 1),
      ];

      // Create new parent data with updated status_obj
      const newParentData = {
        ...parentNode.data,
        status_obj: newStatusObj.map((row) => {
          // Preserve the original row's data exactly as it was
          if (row.id === originalRow.id) {
            return originalRow;
          }
          return row;
        }),
      };

      // Update the parent node with new data
      parentNode.setData(newParentData);

      parentNode.setExpanded(false);
      gridApi.refreshCells({
        force: true,
        suppressFlash: false,
      });

      parentNode.setExpanded(true);
    }
  };

  const updateResponse = async () => {
    try {
      const fetchColumnConfig = async () => {
        try {
          props.setPoRebalanceSubClassTableDataLoader(true);

          let columns = await props.fetchPORebalanceReviewRecommendationTableFields();
          if (columns?.data?.status) {
            let columnsData = columns?.data?.data;

            const modifiedColumns = columnsData.map((column) => {
              if (column.column_name === "l6_id") {
                return {
                  ...column,
                  type: "str",
                  extra: { is_grouping_key: true },
                };
              }

              return column;
            });

            let formattedColumns = agGridColumnFormatter(
              modifiedColumns,
              null,
              null,
              null,
              null,
              null,
              null,
              true
            );
            formattedColumns.push({
              headerName: "Action",
              //sticky: "right",
              accessor: "action",
              isFixed: true,
              disableSortBy: true,
              cellRenderer: (params, extraProps) => {
                if (!params?.data?.l6_id) {
                  const isDisabledDueToTransferId =
                    params.data?.transfer_id !== null &&
                    params.data?.transfer_id !== undefined;

                  return (
                    <>
                      <Button
                        onClick={() => addingNewSize(params)}
                        size="large"
                        disabled={isDisabledDueToTransferId}
                        icon={<AddIcon />}
                        variant="tertiary"
                        sx={{
                          minWidth: "20px",
                          marginRight: "10px",
                        }}
                      />
                      <Button
                        onClick={() => deleteproduct(params)}
                        size="large"
                        disabled={
                          params?.data?.isDeleted || isDisabledDueToTransferId
                        }
                        icon={<DeleteIcon />}
                        variant="tertiary"
                        sx={{
                          minWidth: "20px",
                          marginRight: "10px",
                        }}
                      />
                    </>
                  );
                } else {
                  return null;
                }
              },
              suppressMenu: true,
              //lockPosition: "right",
            });
            let updatedResponse = checkForEditability(formattedColumns);
            let ColumnData = cloneDeep(updatedResponse);

            setStyleOrderSummarySubClassTableColumns(ColumnData);
            setRender(true);
          }
        } catch (err) {
          console.error("Error", err);
          //   props?.setOpenReviewRecommendationTable(false)
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setPoRebalanceSubClassTableDataLoader(false);
        }
      };
      if (isAllSizesLoaded) {
        fetchColumnConfig();
      }
      //fetchData();
    } catch (err) {
      console.error("Error", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const fetchData = async () => {
    try {
      dispatch(setPoRebalanceData([]));
      setIsPoSourceNull(false);
      setIsPoDestinationNull(false);
      props.setPoRebalanceSubClassTableDataLoader(true);
      // Clear the cache
      setSizeDropdownCache({});
      setIsAllSizesLoaded(false);
      setAllSizes(new Set());
      var saveTypeValue = "";
      var fiscal_year_week_draft = "";
      props?.selectedRecords.map((item) => {
        console.log("item", item, selectedChoice);
        if (item.aggr_column === selectedChoice) {
          saveTypeValue = item.savetype;
          fiscal_year_week_draft = item.fiscal_year_week_draft;
        }
      });

      // Always use the week selected from the popup since we always come through the popup
      if (props.popUpWeekData?.week_month_list) {
        var startFiscalWeek = props.popUpWeekData.week_month_list;
        const year = parseInt(startFiscalWeek.slice(0, 4));
        const week = parseInt(startFiscalWeek.slice(4));

        let startDate = moment().year(year).isoWeek(week);
        let endDate = startDate.clone().add(3, "weeks");
        var endFiscalWeek = `${endDate.isoWeekYear()}${String(
          endDate.isoWeek()
        ).padStart(2, "0")}`;
      }

      props.choiceTableColumns.forEach((item) => {
        if (item.column_name === startFiscalWeek) {
          setStartWeekSelection(item?.headerName);
        }
        if (item.column_name === endFiscalWeek) {
          setEndWeekSelection(item?.headerName);
        }
      });

      const body = {
        choice: selectedChoice,
        start_week: startFiscalWeek,
        end_week: endFiscalWeek,
        filters: [
          {
            filter_type: "cascaded",
            attribute_name: "l6_id",
            operator: "in",
            dimension: "product",
            values: [selectedChoice],
          },
        ],
        meta: {
          search: [],
          range: [],
          sort: [],
          limit: {
            limit: 100,
            page: 1,
          },
        },
      };

      let response = await props.fetchPORebalanceReviewRecommendationTableData(
        body
      );
      if (response?.data?.status) {
        const channel = [];
        let min_value_key = "";

        const uniqueSizes = new Set();
        response.data.data.forEach((item) => {
          item.status_obj.forEach((size) => {
            uniqueSizes.add(size.size);
          });
        });
        setAllSizes(uniqueSizes);

        props.selectedRecords.forEach((item) => {
          if (item.aggr_column === selectedChoice) {
            item.status_obj.map((size) => {
              channel.push(size.channel);
            });
          }
        });

        // Process each item and size sequentially
        // ... existing code ...

        for (const item of response.data.data) {
          for (const size of item.status_obj) {
            if (channel.some((key) => key in size)) {
              // Find min and max keys based on absolute values
              const channelValues = channel
                .filter((key) => key in size)
                .map((key) => ({ key, value: size[key] }));

              console.log("PO sourse desti channelValues", channelValues);

              const minKey = channelValues.reduce((min, curr) =>
                curr.value < min.value ? curr : min
              ).key;

              const maxKey = channelValues.reduce((max, curr) =>
                curr.value > max.value ? curr : max
              ).key;

              setMaxKey(maxKey);
              setMinKey(minKey);
              console.log("PO sourse desti", maxKey, minKey, size.size);

              const fetchDropdown = (loc_code) =>
                props.fetchDropdownDataForPO({
                  l6_id: selectedChoice,
                  size: size.size,
                  loc_code,
                  start_week: startFiscalWeek,
                  end_week: endFiscalWeek,
                  gac_toggle: selectedApproveSwitch,
                });

              // Fetch dropdown data for this size with different keys for source and destination
              const [sourceResponse, destResponse] = await Promise.all([
                fetchDropdown(maxKey),
                fetchDropdown(minKey),
              ]);

              // Update cache for this size
              setSizeDropdownCache((prevCache) => ({
                ...prevCache,
                [size.size]: {
                  poSourceOptions: sourceResponse?.data?.status
                    ? sourceResponse.data.data?.flatMap((source) => {
                        // Handle array of PO sources
                        const poSources = Array.isArray(source.po_source)
                          ? source.po_source
                          : [source.po_source];

                        return poSources.map((poSource) => ({
                          label: poSource,
                          value: poSource,
                        }));
                      }) || []
                    : [],
                  poDestinationOptions: destResponse?.data?.status
                    ? destResponse.data.data?.flatMap((dest) => {
                        // Handle array of PO destinations
                        const poDestinations = Array.isArray(dest.po_source)
                          ? dest.po_source
                          : [dest.po_source];

                        return poDestinations.map((poDest) => ({
                          label: poDest,
                          value: poDest,
                        }));
                      }) || []
                    : [],
                },
              }));
            }
          }
        }
        setRenderTable((prev) => prev + 1);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setTableData(defaultTableData);
      }
    } catch (err) {
      console.error("Error", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setTableData(defaultTableData);
    }
  };

  // Access control for PO Rebalance buttons
  useEffect(() => {
    if (!isEmpty(props.userAccess)) {
      // If userAccess exists, use the new access control
      const poRebalanceAccess = props.userAccess?.find(
        (item) => item.screen === "inventorysmart_po_rebalance"
      );

      const canSaveDraft = poRebalanceAccess?.isSaveDraftButton || false;
      const canApprovePoRebalance =
        poRebalanceAccess?.isApprovePoRebalanceButton || false;

      setIsUserHasSaveDraftAccess(canSaveDraft);
      setIsUserHasApprovePoRebalanceAccess(canApprovePoRebalance);
    } else {
      // Fallback to default behavior
      setIsUserHasSaveDraftAccess(true);
      setIsUserHasApprovePoRebalanceAccess(true);
    }
  }, [props.userAccess]);

  // Add this useEffect to monitor cache updates
  useEffect(() => {
    console.log("sizeDropdownCache", sizeDropdownCache);
    if (Object.keys(sizeDropdownCache).length > 0) {
      const allSizesArray = Array.from(allSizes);
      const isComplete = allSizesArray.every((sizeItem) => {
        const cacheEntry = sizeDropdownCache[sizeItem];
        return (
          cacheEntry &&
          Array.isArray(cacheEntry.poSourceOptions) &&
          Array.isArray(cacheEntry.poDestinationOptions)
        );
      });

      setIsAllSizesLoaded(isComplete);
    }
  }, [sizeDropdownCache]);

  const deleteproduct = (params) => {
    if (addNewSizeData.length === 1) {
      setAddNewSizeData([]);
    }

    // Remove the deleted size from saveDraftPayload
    saveDraftPayload.current = saveDraftPayload.current.filter((item) => {
      // Keep items that don't match the deleted row's ID
      return item.id !== params.data.id;
    });

    // Also remove from approvePoPayload if it exists there
    approvePoPayload.current = approvePoPayload.current.filter((item) => {
      return item.id !== params.data.id;
    });

    const gridApi = styleOrderSubClassTableGridInstance.current.api;
    const parentNode = params.node.parent;

    if (parentNode && parentNode.data) {
      // Mark the current row as deleted
      params.data.isDeleted = true;

      // Create new status_obj array without the deleted row
      const newStatusObj = parentNode.data.status_obj.filter(
        (row) => row.id !== params.data.id
      );

      // Create new parent data with updated status_obj
      const newParentData = {
        ...parentNode.data,
        status_obj: newStatusObj,
      };

      // Update the parent node with new data
      parentNode.setData(newParentData);

      // Refresh the grid
      parentNode.setExpanded(false);
      gridApi.refreshCells({
        force: true,
        suppressFlash: false,
      });
      parentNode.setExpanded(true);
    }
  };

  useEffect(() => {
    setRender(false);
    updateResponse();
  }, [isAllSizesLoaded]);

  useEffect(() => {
    setSizeDropdownCache({});
    setIsAllSizesLoaded(false);
    setAllSizes(new Set());
  }, [selectedChoice]);

  // const handleSkuIdChange = (opt) => {
  //   let newValue = opt.value;
  //   // Clear cache and reset states when choice changes
  //   setSizeDropdownCache({});
  //   setIsAllSizesLoaded(false);
  //   setAllSizes(new Set());
  //   setSelectedChoice(newValue);
  // };

  const onSaveDraft = async () => {
    try {
      if (saveDraftPayload.current.length > 0) {
        const hasInvalidData = saveDraftPayload.current.some(
          (item) => !item.transfer || !item.po_source || !item.po_destination
        );
        if (hasInvalidData) {
          displaySnackMessages(
            "Please select PO Source, PO Destination and Transfer values",
            "error"
          );
          return;
        }
      }
      if (saveDraftPayload.current.length === 0) {
        // Check if all values in choiceChannelTranferData are null
        const hasValidData = props.choiceChannelTranferData.some((item) =>
          item.status_obj.every(
            (size) =>
              size.po_source == null &&
              size.po_destination == null &&
              size.transfer == null
          )
        );

        if (hasValidData) {
          displaySnackMessages("There is nothing to save", "error");
          return;
        }
      }
      // Get all table data
      let allTableData = [];
      const gridApi = styleOrderSubClassTableGridInstance.current.api;

      // Create a map of existing IDs to avoid duplicates
      const existingIds = new Set();

      // First, add data from saveDraftPayload.current
      saveDraftPayload.current.forEach((item) => {
        if (item.id && !existingIds.has(item.id)) {
          existingIds.add(item.id);
          allTableData.push(item);
        }
      });

      gridApi.forEachNode((node) => {
        console.log(
          "allTableData",
          !existingIds.has(node.data.id),
          node.level === 1 && node.data && !existingIds.has(node.data.id),
          existingIds
        );
        if (node.level === 1 && node.data && !existingIds.has(node.data.id)) {
          console.log("allTableData", node.data, allTableData);
          const hasValues =
            node.data.transfer ||
            node.data.po_source ||
            node.data.po_destination;

          if (hasValues) {
            console.log("node.data", node.data);
            existingIds.add(node.data.id);
            const rowData = FIELDS_FOR_SAVING_DRAFT.reduce((acc, key) => {
              acc[key] = node.data[key] ?? null;
              return acc;
            }, {});
            allTableData.push(rowData);
          }
        }
      });

      // Add data from choiceChannelTranferData that might not be in either source
      props.choiceChannelTranferData.forEach((item) => {
        item.status_obj.forEach((size) => {
          if (
            !existingIds.has(size.id) &&
            size.po_source !== null &&
            size.po_destination !== null &&
            size.transfer !== null
          ) {
            console.log("allTableData", allTableData);
            existingIds.add(size.id);
            allTableData.push(size);
          }
        });
      });

      var saveTypeValue = "";
      var fiscal_year_week_draft = "";
      props?.selectedRecords.map((item) => {
        console.log("item", item, selectedChoice);
        if (item.aggr_column === selectedChoice) {
          saveTypeValue = item.savetype;
          fiscal_year_week_draft = item.fiscal_year_week_draft;
        }
      });

      if (saveTypeValue === "draft") {
        var endFiscalWeek = fiscal_year_week_draft;
      }

      if (props.popUpWeekData?.week_month_list) {
        var startFiscalWeek = props.popUpWeekData.week_month_list;
        const year = parseInt(startFiscalWeek.slice(0, 4));
        const week = parseInt(startFiscalWeek.slice(4));

        let startDate = moment().year(year).isoWeek(week);
        let endDate = startDate.clone().add(3, "weeks");
        var endFiscalWeek = `${endDate.isoWeekYear()}${String(
          endDate.isoWeek()
        ).padStart(2, "0")}`;
      }

      // Clean and prepare final data
      let cleanedData = allTableData.map(({ isDeleted, ...rest }) => ({
        ...rest,
        l6_id: props.selectedRecords[0]?.aggr_column,
        l6_name: props.selectedRecords[0]?.l6_name,
        savetype: "draft",
        fiscal_year_week: endFiscalWeek,
      }));

      let body = {
        records: cleanedData,
        savetype: "draft",
        l6_id: selectedChoice,
      };

      let response = await props.saveDraftPayload(body);
      if (response?.data?.status) {
        saveDraftPayload.current = [];
        setStyleOrderSummarySubClassTableColumns([]);
        props.setIsApprove((prev) => prev + 1);
        displaySnackMessages("Draft saved successfully", "success");
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (err) {
      console.error("Error in onSaveDraft:", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onApprovePO = async () => {
    try {
      if (approvePoPayload.current.length > 0) {
        const hasInvalidData = approvePoPayload.current.some(
          (item) => !item.transfer || !item.po_source || !item.po_destination
        );

        if (hasInvalidData) {
          displaySnackMessages(
            "Please select PO Source, PO Destination and Transfer values",
            "error"
          );
          return;
        }
      }
      if (approvePoPayload.current.length === 0) {
        // Check if all values in choiceChannelTranferData are null
        const hasValidData = props.choiceChannelTranferData.some((item) =>
          item.status_obj.every(
            (size) =>
              size.po_source == null &&
              size.po_destination == null &&
              size.transfer == null
          )
        );

        if (hasValidData) {
          displaySnackMessages("There is nothing to approve", "error");
          return;
        }
      }
      // Get all table data with calculations
      let allTableData = [];
      const gridApi = styleOrderSubClassTableGridInstance.current.api;
      const existingIds = new Set();

      // First, add data from approvePoPayload.current
      approvePoPayload.current.forEach((item) => {
        if (item.id && !existingIds.has(item.id)) {
          existingIds.add(item.id);
          allTableData.push(item);
        }
      });
      // Add data from grid
      gridApi.forEachNode((node) => {
        if (node.level === 1 && node.data && !existingIds.has(node.data.id)) {
          const hasValues =
            node.data.transfer ||
            node.data.po_source ||
            node.data.po_destination;

          if (hasValues) {
            // Use updatePayloadData to get calculated values
            const calculatedData = updatePayloadData(
              { data: node.data, colDef: { accessor: "transfer" } },
              []
            )[0];

            existingIds.add(node.data.id);
            allTableData.push(calculatedData);
          }
        }
      });

      // Add data from choiceChannelTranferData that might not be in either source
      props.choiceChannelTranferData.forEach((item) => {
        item.status_obj.forEach((size) => {
          if (
            !existingIds.has(size.id) &&
            size.po_source !== null &&
            size.po_destination !== null &&
            size.transfer !== null
          ) {
            // Use updatePayloadData to get calculated values
            const calculatedData = updatePayloadData(
              { data: size, colDef: { accessor: "transfer" } },
              []
            )[0];

            existingIds.add(size.id);
            allTableData.push(calculatedData);
          }
        });
      });

      var saveTypeValue = "";
      var fiscal_year_week_draft = "";
      props?.selectedRecords.map((item) => {
        if (item.aggr_column === selectedChoice) {
          saveTypeValue = item.savetype;
          fiscal_year_week_draft = item.fiscal_year_week_draft;
        }
      });

      if (saveTypeValue === "draft") {
        var endFiscalWeek = fiscal_year_week_draft;
      }

      if (props.popUpWeekData?.week_month_list) {
        var startFiscalWeek = props.popUpWeekData.week_month_list;
        const year = parseInt(startFiscalWeek.slice(0, 4));
        const week = parseInt(startFiscalWeek.slice(4));

        let startDate = moment().year(year).isoWeek(week);
        let endDate = startDate.clone().add(3, "weeks");
        var endFiscalWeek = `${endDate.isoWeekYear()}${String(
          endDate.isoWeek()
        ).padStart(2, "0")}`;
      }

      // Clean and prepare final data
      let cleanedData = allTableData.map(({ isDeleted, ...rest }) => ({
        ...rest,
        l6_id: props.selectedRecords[0]?.aggr_column,
        l6_name: props.selectedRecords[0]?.l6_name,
        savetype: "approve",
        fiscal_year_week: endFiscalWeek,
      }));

      let body = {
        records: cleanedData,
        savetype: "approve",
        l6_id: selectedChoice,
        gac_toggle: selectedApproveSwitch,
      };

      let response = await props.saveDraftPayload(body);
      if (response?.data?.status) {
        approvePoPayload.current = [];
        props.setIsApprove((prev) => prev + 1);
        displaySnackMessages("PO Rebalancing approved successfully", "success");
      }
    } catch (error) {
      console.error("Error in onSaveDraft:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const [selectedApproveSwitch, setSelectedApproveSwitch] = useState(false);

  const getTopRightOptions = () => {
    let options = [];

    options.push(
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          {/* <div>
            <Switch
              classes={{ switchBase: classes.switch }}
              leftLabel="GAC Off"
              onChange={() => {
                setSelectedApproveSwitch(!selectedApproveSwitch);
              }}
              rightLabel="GAC On"
              value={selectedApproveSwitch}
            />
          </div> */}
          <div>
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              onClick={() => onApprovePO()}
              disabled={
                !isEmpty(props.userAccess)
                  ? !isUserHasApprovePoRebalanceAccess || hideSaveApprove
                  : hideSaveApprove
              }
            >
              Approve PO Rebalancing
            </Button>
          </div>
        </div>
        <div>
          <Button
            variant="tertiary"
            color="primary"
            className={classes.button}
            onClick={() => onSaveDraft()}
            disabled={
              !isEmpty(props.userAccess)
                ? !isUserHasSaveDraftAccess || hideSaveDraft
                : hideSaveDraft
            }
          >
            Save as draft
          </Button>
        </div>
      </>
    );
    return options;
  };

  const getTopLeftOptions = () => {
    let options = [];
    options.push(
      <>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              height: "12px",
              border: "1px solid #D4D4D4",
              marginRight: "12px",
            }}
          ></div>
          <div>
            <Tooltip
              orientation="right"
              variant="tertiary"
              title="Save type statuses are temporary and reset automatically during the daily system refresh"
            >
              <div style={{ marginRight: "12px" }}>
                <InfoIcon style={{ transform: "translatey(2px)" }} />
              </div>
            </Tooltip>
          </div>
          <Switch
            classes={{ switchBase: classes.switch }}
            leftLabel="GAC"
            onChange={() => {
              setSelectedApproveSwitch(!selectedApproveSwitch);
            }}
            value={selectedApproveSwitch}
          />
        </div>
        {/* {props.selectedRecords?.length > 0 && (
          <div style={{ display: "contents" }}>
            <FormControl
              size="small"
              sx={{ minWidth: 240 }}
              className={classNames(
                classes.flexRow,
                globalClasses.verticalAlignCenter
              )}
            >
              <label className={globalClasses.extraButtonStyle}>
                Select Choice
              </label>
              <Select
                id="viewBySelection"
                currentOptions={choiceOptions}
                setCurrentOptions={setChoiceOptions}
                initialOptions={choiceOptions}
                selectedOptions={selectedChoiceOptions}
                handleChange={handleSkuIdChange}
                setSelectedOptions={setSelectedChoiceOptions}
                isOpen={isOpenViewBy}
                setIsOpen={setIsOpenViewBy}
              />
            </FormControl>
          </div>
        )} */}
      </>
    );
    return options;
  };

  const calculateRemTransferForStatusObj = (statusObjArray) => {
    // Keep track of running totals for each size
    const sizeTotals = {};

    // Process each item sequentially
    return statusObjArray.map((item) => {
      if (!item.transfer || isNaN(item.transfer) || item.transfer === "") {
        return item;
      }
      const currentSize = item.size;
      const currentTransfer = parseFloat(item.transfer) || 0;

      // Initialize or update running total for this size
      if (!sizeTotals[currentSize]) {
        // First occurrence of this size
        sizeTotals[currentSize] = currentTransfer;
        console.log(
          "saveType1234",
          item.total_transfer_recomm - currentTransfer
        );
        return {
          ...item,
          rem_transfer: Math.max(
            0,
            item.total_transfer_recomm - currentTransfer
          ),
        };
      } else {
        // Same size as previous occurrence

        sizeTotals[currentSize] += currentTransfer;
        return {
          ...item,
          rem_transfer: Math.max(
            0,
            item.total_transfer_recomm - sizeTotals[currentSize]
          ),
        };
      }
    });
  };

  const manualCallBack = async (manualBody, pageIndex) => {
    try {
      var saveTypeValue = "";
      var fiscal_year_week_draft = "";
      props?.selectedRecords.map((item) => {
        console.log("item", item, selectedChoice);
        if (item.aggr_column === selectedChoice) {
          saveTypeValue = item.savetype;
          fiscal_year_week_draft = item.fiscal_year_week_draft;
        }
      });
      console.log("saveTypeValue", saveTypeValue, fiscal_year_week_draft);
      saveDraftPayload.current = [];
      if (props.popUpWeekData?.week_month_list) {
        var startFiscalWeek = props.popUpWeekData.week_month_list;
        const year = parseInt(startFiscalWeek.slice(0, 4));
        const week = parseInt(startFiscalWeek.slice(4));

        let startDate = moment().year(year).isoWeek(week);
        let endDate = startDate.clone().add(3, "weeks");
        var endFiscalWeek = `${endDate.isoWeekYear()}${String(
          endDate.isoWeek()
        ).padStart(2, "0")}`;
      }

      const body = {
        choice: selectedChoice,
        start_week: startFiscalWeek,
        end_week: endFiscalWeek,
        gac_toggle: selectedApproveSwitch,
        meta: {
          ...manualBody,
          limit: { limit: 1000, page: 1 },
        },
        filters: [
          {
            filter_type: "cascaded",
            attribute_name: "l6_id",
            operator: "in",
            dimension: "product",
            values: [selectedChoice],
          },
        ],
      };

      let response = await props.fetchPORebalanceReviewRecommendationTableData(
        body
      );
      if (response?.data?.status) {
        const updatedArray = [];
        const channel = [];
        var saveType = "";
        var min_value_key = "";
        props.selectedRecords.forEach((item) => {
          if (item.aggr_column === selectedChoice) {
            item.status_obj.map((size) => {
              channel.push(size.channel);
            });
            saveType = item.savetype;
            setSaveTypeValue(saveType);
          }
        });
        response.data.data.map((item) => {
          item.size = "-";
          item.po_source = "-";
          item.po_destination = "-";
          item.transfer = "-";
          item.action = "-";
          item.status_obj.forEach((size) => {
            size.id = Math.random();
            size.isDeleted = true;
            if (channel.some((key) => key in size)) {
              // Get all channel values for this size
              const channelValues = channel
                .filter((key) => key in size)
                .map((key) => size[key])
                .filter((val) => val !== null && val !== undefined);

              let total_transfer_recomm = 0;

              // Check if we have at least 2 values
              if (channelValues.length >= 2) {
                // Check if we have both positive and negative values
                const excessValues = channelValues.filter((val) => val > 0);
                const deficitValues = channelValues.filter((val) => val < 0);

                // Check for null values in either array
                const hasNullExcess = excessValues.some((val) => val === null);
                const hasNullDeficit = deficitValues.some(
                  (val) => val === null
                );

                // Only calculate transfer when we have both excess and deficit
                if (
                  excessValues.length > 0 &&
                  deficitValues.length > 0 &&
                  !hasNullExcess &&
                  !hasNullDeficit
                ) {
                  try {
                    const minExcess = Math.min(...excessValues);
                    const maxDeficit = Math.max(...deficitValues);
                    total_transfer_recomm = Math.min(
                      Math.abs(minExcess),
                      Math.abs(maxDeficit)
                    );
                  } catch (error) {
                    console.error("Error calculating transfer_recomm:", error);
                    total_transfer_recomm = 0;
                  }
                } else {
                  total_transfer_recomm = 0;
                }
                // If all values are positive or all values are negative, total_transfer_recomm remains 0
              } else if (channelValues.length === 1) {
                // If only one value exists, total_transfer_recomm should be 0
                total_transfer_recomm = 0;
              }

              // Add the result to the current entry
              size.total_transfer_recomm = total_transfer_recomm;
            }
          });

          if (saveType === "approve" || saveType === "draft") {
            item.status_obj.sort((a, b) => a.size.localeCompare(b.size));
            item.status_obj = calculateRemTransferForStatusObj(item.status_obj);
          }
        });

        let formatedData = agGridRowFormatter(response.data.data);

        dispatch(setChoiceChannelTranferData(formatedData));

        return {
          data: cloneDeep(formatedData),
          totalCount: formatedData.length,
        };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setTableData(defaultTableData);
      }
    } catch (err) {
      console.error("Error fetching table data:", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setTableData(defaultTableData);
    }
  };

  useEffect(() => {
    let choiceOptionsData = [];
    props.selectedRecords?.forEach((item) => {
      choiceOptionsData.push({
        label: item.aggr_column,
        value: item.aggr_column,
      });
    });
    setChoiceOptions(choiceOptionsData);
    // Reset all relevant state
    setSizeDropdownCache({});
    setIsAllSizesLoaded(false);
    setAllSizes(new Set());
    fetchData();
  }, [
    props.popUpWeekData?.week_month_list,
    selectedChoice,
    //addNewSize,
    //deleteSize,
    selectedApproveSwitch,
  ]);

  const onBlur = (_e, data, column, isChanged) => {
    try {
      if (disableTransfer.current) {
        const gridApi = styleOrderSubClassTableGridInstance.current.api;

        // Get all nodes first
        const rowNodes = [];
        gridApi.forEachNode((node) => rowNodes.push(node));

        rowNodes.forEach((node) => {
          if (node.level === 1 && node.data) {
            if (data.id === node.data.id) {
              // Update the node's data
              node.setData({
                ...node.data,
                transfer: "",
              });

              // Refresh the specific column
              gridApi.refreshCells({
                rowNodes: [node],
                columns: ["transfer"], // adjust field name as needed
                force: true,
              });
            }
          }
        });
        return;
      } else {
        if (column.colId === "transfer") {
          // Skip if transfer value is empty or not a number
          if (!data.transfer || isNaN(data.transfer)) {
            return;
          }

          const transferValue = parseFloat(data.transfer);
          // Get min and max values from transferColumnValidation
          const validationData = transferColumnValidation?.current?.find(
            (item) => item.po_id === data.po_source
          );

          if (validationData?.po_units_before_rebalance) {
            const maxValue =
              parseFloat(validationData.po_units_before_rebalance) || 0;

            // Check if PO source matches PO ID for additional validation

            // Validate transfer value is between 0 and maxValue
            if (transferValue < 0 || transferValue > maxValue) {
              setHideSaveDraft(true);
              setHideSaveApprove(true);

              displaySnackMessages(
                `Transfer value must be between 0 and ${maxValue} for PO Source ${data.po_source}`,
                "error"
              );
              return;
            } else {
              setHideSaveDraft(false);
              setHideSaveApprove(false);
            }
          }
          const gridApi = styleOrderSubClassTableGridInstance.current.api;

          // Get all nodes first
          const rowNodes = [];
          gridApi.forEachNode((node) => rowNodes.push(node));

          rowNodes.forEach((node) => {
            if (node.data && node.data.size === data.size) {
              if (data.po_source) {
                if (node.data.id === data.id) {
                  // Get all rows with same size
                  const sameSizeRows = rowNodes.filter(
                    (n) => n.level === 1 && n.data && n.data.size === data.size
                  );

                  // Calculate total transfer for same size
                  const totalSizeTransfer = sameSizeRows.reduce((sum, n) => {
                    const transfer = parseFloat(n.data.transfer) || 0;
                    return sum + transfer;
                  }, 0);

                  // Update all rows with the same size
                  sameSizeRows.forEach((node) => {
                    node.setData({
                      ...node.data,
                      dc_inv_bop_post_allocation_after:
                        node.data.dc_inv_bop_post_allocation -
                          totalSizeTransfer || 0,
                    });
                  });

                  // Only update po_units_after_rebalance for the current row
                  if (data.id === node.data.id) {
                    node.setData({
                      ...node.data,
                      po_units_after_rebalance:
                        data?.po_units_before_rebalance - data?.transfer || 0,
                    });
                  }
                  // Refresh the specific column
                  gridApi.refreshCells({
                    rowNodes: [node],
                    columns: [
                      "po_units_after_rebalance_after",
                      "dc_inv_bop_post_allocation_after",
                    ], // adjust field name as needed
                    force: true,
                  });
                }
              }
              if (data.po_destination) {
                if (data.id === node.data.id) {
                  // Get all rows with same size
                  const sameSizeRows = rowNodes.filter(
                    (n) => n.level === 1 && n.data && n.data.size === data.size
                  );

                  // Calculate total transfer for same size
                  const totalSizeTransfer = sameSizeRows.reduce((sum, n) => {
                    const transfer = parseFloat(n.data.transfer) || 0;
                    return sum + transfer;
                  }, 0);

                  // Update all rows with the same size
                  sameSizeRows.forEach((node) => {
                    node.setData({
                      ...node.data,
                      dc_inv_bop_post_allocation_des_after:
                        node.data.dc_inv_bop_post_allocation_des +
                          totalSizeTransfer || 0,
                      po_units_after_rebalance_des:
                        data?.po_units_before_rebalance_des +
                          totalSizeTransfer || 0,
                    });
                  });

                  // Refresh the specific column
                  gridApi.refreshCells({
                    rowNodes: [node],
                    columns: [
                      "po_units_after_rebalance_des_after",
                      "dc_inv_bop_post_allocation_des_after",
                    ], // adjust field name as needed
                    force: true,
                  });
                }
              }
            }
          });

          let totalTransfer = 0;
          const matchingRows = [];
          const currentSizeTransfers = new Map(); // Track transfers for each size

          // First pass: Collect all rows with same size and their transfer values
          styleOrderSubClassTableGridInstance.current.api.forEachNode(
            (node) => {
              if (node.data && node.data.size === data.size) {
                matchingRows.push(node.data);

                // Skip current row since we'll handle it separately
                if (
                  node.data.id !== data.id &&
                  node.data.transfer &&
                  !isNaN(node.data.transfer)
                ) {
                  const transfer = parseFloat(node.data.transfer);
                  totalTransfer += transfer;

                  // Store individual transfer values
                  currentSizeTransfers.set(node.data.id, {
                    transfer: transfer,
                    remainingTransfer: node.data.rem_transfer, // Store existing remaining transfer
                  });
                }
              }
            }
          );

          // Add current row's transfer to total
          if (data.transfer && !isNaN(data.transfer)) {
            const currentTransfer = parseFloat(data.transfer);
            totalTransfer += currentTransfer;
            currentSizeTransfers.set(data.id, {
              transfer: currentTransfer,
              remainingTransfer: null, // Will be calculated
            });
          }

          // Second pass: Update remaining transfers
          styleOrderSubClassTableGridInstance.current.api.forEachNode(
            (node) => {
              if (node.data && node.data.size === data.size) {
                if (node.data.id === data.id) {
                  // For current row: calculate new remaining transfer
                  node.data.rem_transfer = Math.max(
                    0,
                    data.total_transfer_recomm - totalTransfer
                  );
                } else {
                  // For other rows with same size: preserve their existing remaining transfer
                  const existingData = currentSizeTransfers.get(node.data.id);
                  if (existingData && existingData.remainingTransfer !== null) {
                    node.data.rem_transfer = Math.max(
                      0,
                      existingData.remainingTransfer
                    );
                  }
                }

                // Refresh the cell to show updated value
                styleOrderSubClassTableGridInstance.current.api.refreshCells({
                  rowNodes: [node],
                  columns: ["rem_transfer"],
                });
              }
            }
          );
          if (saveDraftPayload.current.length != 0) {
            var flag = false;
            saveDraftPayload.current.filter((size) => {
              if (size.id === data.id) {
                // if(size.size === data.size_copy){
                //   return flag=false
                // }
                size.transfer = data.transfer;
                flag = true;
              }
            });
            if (!flag) {
              const rowData = FIELDS_FOR_SAVING_DRAFT.reduce((acc, key) => {
                acc[key] = data[key] ?? null;
                return acc;
              }, {});
              saveDraftPayload.current.push(rowData);
            }
          } else {
            saveDraftPayload.current.push({
              size: data.size,
              transfer: data.transfer,
              id: data.id,
              po_source: data?.po_source,
              po_destination: data?.po_destination,
              transfer_id: data?.transfer_id,
            });
          }
          approvePoPayload.current = [...saveDraftPayload.current];
          const params = { data, colDef: { accessor: "transfer" } };
          saveDraftPayload.current = updatePayloadData(params, [
            ...saveDraftPayload.current,
          ]);
          approvePoPayload.current = [...saveDraftPayload.current];
        }
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  const fetchKPIData = async (data) => {
    try {
      if (props.popUpWeekData?.week_month_list) {
        var startFiscalWeek = props.popUpWeekData.week_month_list;
        const year = parseInt(startFiscalWeek.slice(0, 4));
        const week = parseInt(startFiscalWeek.slice(4));

        let startDate = moment().year(year).isoWeek(week);
        let endDate = startDate.clone().add(3, "weeks");
        var endFiscalWeek = `${endDate.isoWeekYear()}${String(
          endDate.isoWeek()
        ).padStart(2, "0")}`;
      }

      var saveTypeValue = "";
      var fiscal_year_week_draft = "";
      props?.selectedRecords.map((item) => {
        console.log("item", item, selectedChoice);
        if (item.aggr_column === selectedChoice) {
          saveTypeValue = item.savetype;
          fiscal_year_week_draft = item.fiscal_year_week_draft;
        }
      });

      let payload = {
        po_id:
          data.colDef.accessor === "po_source"
            ? data.data.po_source
            : data.data.po_destination,
        l6_id: selectedChoice,
        gac_toggle: selectedApproveSwitch,
        size: data.data.size,
      };
      let payload2 = {
        l6_id: selectedChoice,
        gac_toggle: selectedApproveSwitch,
        end_week: endFiscalWeek,
        size: data.data.size,
        loc_code: data.colDef.accessor === "po_source" ? maxKey : minKey,
      };
      let response = await props.fetchPOBaseUnitKPIData(payload);
      let response2 = await props.fetchPorjectedBopRebalance(payload2);
      var po_id = "";
      if (response.data.status) {
        response.data.data.forEach((item) => {
          po_id = item.po_id;
        });
        const transferColumnData = response.data.data;

        const gridApi = styleOrderSubClassTableGridInstance.current.api;

        // Get all nodes first
        const rowNodes = [];
        gridApi.forEachNode((node) => rowNodes.push(node));

        if (data.colDef.accessor === "po_source") {
          transferColumnValidation.current = response.data.data;
          // Find only the node that matches the changed data's ID
          const targetNode = rowNodes.find(
            (node) =>
              node.level === 1 && node.data && node.data.id === data.data.id
          );

          if (targetNode) {
            const matching = transferColumnData.find(
              (item) => item.po_id === targetNode.data.po_source
            );

            if (matching) {
              // Update only the target node's data
              targetNode.setData({
                ...targetNode.data,
                po_units_before_rebalance:
                  matching.po_units_before_rebalance || 0,
              });

              // Refresh only the specific cell for the target node
              gridApi.refreshCells({
                rowNodes: [targetNode],
                columns: ["po_units_before_rebalance"],
                force: true,
              });
            }
          }
        }

        // Similar update for po_destination
        if (data.colDef.accessor === "po_destination") {
          // Find only the node that matches the changed data's ID
          const targetNode = rowNodes.find(
            (node) =>
              node.level === 1 && node.data && node.data.id === data.data.id
          );

          if (targetNode) {
            const matching = transferColumnData.find(
              (item) => item.po_id === targetNode.data.po_destination
            );

            if (matching) {
              // Update only the target node's data
              targetNode.setData({
                ...targetNode.data,
                po_units_before_rebalance_des:
                  matching.po_units_before_rebalance || 0,
              });

              // Refresh only the specific cell for the target node
              gridApi.refreshCells({
                rowNodes: [targetNode],
                columns: ["po_units_before_rebalance_des"],
                force: true,
              });
            }
          }
        }
      }
      if (response2.data.status) {
        const transferColumnData = response2.data.data.map((item) => ({
          ...item,
          po_id: po_id, // Add po_id to each item in transferColumnData
        }));

        const gridApi = styleOrderSubClassTableGridInstance.current.api;

        // Get all nodes first
        const rowNodes = [];
        gridApi.forEachNode((node) => rowNodes.push(node));

        if (data.colDef.accessor === "po_source") {
          // Find only the node that matches the changed data's ID
          const targetNode = rowNodes.find(
            (node) =>
              node.level === 1 && node.data && node.data.id === data.data.id
          );

          if (targetNode) {
            const matching = transferColumnData.find(
              (item) => item.po_id === targetNode.data.po_source
            );

            if (matching) {
              // Update only the target node's data
              targetNode.setData({
                ...targetNode.data,
                dc_inv_bop_post_allocation:
                  matching.projected_bop_before_rebalance || 0,
              });

              // Refresh only the specific cell for the target node
              gridApi.refreshCells({
                rowNodes: [targetNode],
                columns: ["dc_inv_bop_post_allocation"],
                force: true,
              });
            }
          }
        }
        // Similar update for po_destination
        if (data.colDef.accessor === "po_destination") {
          // Find only the node that matches the changed data's ID
          const targetNode = rowNodes.find(
            (node) =>
              node.level === 1 && node.data && node.data.id === data.data.id
          );

          if (targetNode) {
            const matching = transferColumnData.find(
              (item) => item.po_id === targetNode.data.po_destination
            );

            if (matching) {
              // Update only the target node's data
              targetNode.setData({
                ...targetNode.data,
                dc_inv_bop_post_allocation_des:
                  matching.projected_bop_before_rebalance || 0,
              });

              // Refresh only the specific cell for the target node
              gridApi.refreshCells({
                rowNodes: [targetNode],
                columns: ["dc_inv_bop_post_allocation_des"],
                force: true,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching KPI data:", error);
    }
  };

  const handleCellValueChange = (params) => {
    // First check if PO source and destination are same

    if (
      params.colDef.accessor === "po_source" ||
      params.colDef.accessor === "po_destination"
    ) {
      const currentRow = params.data;
      const poSource =
        params.colDef.accessor === "po_source"
          ? params.data.po_source
          : currentRow.po_source;
      const poDestination =
        params.colDef.accessor === "po_destination"
          ? params.data.po_destination
          : currentRow.po_destination;

      if (poSource && poDestination && poSource === poDestination) {
        setHideSaveDraft(true);
        setHideSaveApprove(true);
        disableTransfer.current = true;
        // Reset the value to previous value
        if (params.colDef.accessor === "po_source") {
          params.data.po_source = params.data.po_source;
        } else {
          params.data.po_destination = params.data.po_destination;
        }

        // Refresh the cell
        styleOrderSubClassTableGridInstance.current.api.refreshCells({
          rowNodes: [params.node],
          columns: [params.colDef.accessor],
        });

        // Show error message
        return displaySnackMessages(
          "PO Source and PO Destination cannot be same",
          "info"
        );
      } else {
        setHideSaveDraft(false);
        setHideSaveApprove(false);
        disableTransfer.current = false;
      }

      if (params.colDef.accessor === "po_source") {
        const currentSize = params.data.size;
        const selectedPoSource = params.data.po_source;
        let isPoSourceUsed = false;

        // Check all rows for the same size and PO source
        styleOrderSubClassTableGridInstance.current.api.forEachNode((node) => {
          if (
            node.data.id !== params.data.id && // Different row
            node.data.size === currentSize && // Same size
            node.data.po_source === selectedPoSource
          ) {
            // Same PO source
            isPoSourceUsed = true;
          }
        });

        if (isPoSourceUsed) {
          // Reset to previous value
          setHideSaveDraft(true);
          setHideSaveApprove(true);
          params.data.po_source = params.data.po_source;

          // Refresh the cell
          styleOrderSubClassTableGridInstance.current.api.refreshCells({
            rowNodes: [params.node],
            columns: ["po_source"],
          });

          displaySnackMessages(
            `PO Source ${selectedPoSource} is already used for size ${currentSize}`,
            "error"
          );
          return;
        }
      }
    }
    // this gives you the current row (can be child)
    if (params.colDef.accessor === "po_source") {
      if (saveDraftPayload.current.length != 0) {
        var flag = false;
        saveDraftPayload.current.filter((size) => {
          if (size.id === params.data.id) {
            // if(size.size === params.data.size_copy){
            //    return flag=false
            //   }
            size.po_source = params.data.po_source;
            return (flag = true);
          }
        });
        if (!flag) {
          saveDraftPayload.current.push({
            size: params.data.size,
            po_source: params.data.po_source,
            id: params.data.id,
            transfer_id: params.data?.transfer_id,
            po_destination: params.data?.po_destination,
            transfer: params.data?.transfer,
          });
        }
      } else {
        saveDraftPayload.current.push({
          size: params.data.size,
          po_source: params.data.po_source,
          id: params.data.id,
          transfer_id: params.data?.transfer_id,
          po_destination: params.data?.po_destination,
          transfer: params.data?.transfer,
        });
      }
      approvePoPayload.current = [...saveDraftPayload.current];
    }
    if (params.colDef.accessor === "po_destination") {
      if (saveDraftPayload.current.length != 0) {
        var flag = false;
        saveDraftPayload.current.filter((size) => {
          if (size.id === params.data.id) {
            // if(size.size === params.data.size_copy){
            //     flag=false
            //   }
            size.po_destination = params.data.po_destination;
            return (flag = true);
          }
        });
        if (!flag) {
          saveDraftPayload.current.push({
            size: params.data.size,
            po_destination: params.data.po_destination,
            id: params.data.id,
            transfer_id: params.data?.transfer_id,
            po_source: params.data?.po_source,
            transfer: params.data?.transfer,
          });
        }
      } else {
        saveDraftPayload.current.push({
          size: params.data.size,
          po_destination: params.data.po_destination,
          id: params.data.id,
          transfer_id: params.data?.transfer_id,
          po_source: params.data?.po_source,
          transfer: params.data?.transfer,
        });
      }
      approvePoPayload.current = [...saveDraftPayload.current];
    }

    if (
      params.colDef.accessor === "po_source" ||
      params.colDef.accessor === "po_destination"
    ) {
      // Update both payloads with calculated values
      saveDraftPayload.current = updatePayloadData(params, [
        ...saveDraftPayload.current,
      ]);
      approvePoPayload.current = [...saveDraftPayload.current];
    }

    let KPI_DATA = fetchKPIData(params);
    // setIsSaveDraftPayload(saveDraftPayload.current)
  };

  const updatePayloadData = (params, existingData) => {
    // Get all rows with same size for calculations
    const sameSizeRows = [];
    styleOrderSubClassTableGridInstance.current.api.forEachNode((node) => {
      if (
        node.level === 1 &&
        node.data &&
        node.data.size === params.data.size
      ) {
        sameSizeRows.push(node.data);
      }
    });

    // Calculate total transfer for same size
    const totalSizeTransfer = sameSizeRows.reduce((sum, row) => {
      const transfer = parseFloat(row.transfer) || 0;
      return sum + transfer;
    }, 0);

    console.log("totalSizeTransfer", totalSizeTransfer);

    const remainingTransfer =
      params.data?.total_transfer_recomm !== null &&
      params.data?.total_transfer_recomm !== undefined
        ? Math.max(0, params.data.total_transfer_recomm - totalSizeTransfer)
        : null;

    const copiedData = FIELDS_FOR_SAVING_DRAFT.reduce((acc, key) => {
      acc[key] = params.data[key] ?? null;
      return acc;
    }, {});

    // Calculate all values
    const calculatedData = {
      ...copiedData,
      rem_transfer: remainingTransfer,
      po_units_after_rebalance: isNumber(params.data?.po_units_before_rebalance)
        ? params.data.po_units_before_rebalance - (params.data?.transfer ?? 0)
        : null,

      po_units_after_rebalance_des: isNumber(
        params.data?.po_units_before_rebalance_des
      )
        ? params.data.po_units_before_rebalance_des + totalSizeTransfer
        : null,

      dc_inv_bop_post_allocation_after: isNumber(
        params.data?.dc_inv_bop_post_allocation
      )
        ? params.data.dc_inv_bop_post_allocation - totalSizeTransfer
        : null,

      dc_inv_bop_post_allocation_des_after: isNumber(
        params.data?.dc_inv_bop_post_allocation_des
      )
        ? params.data.dc_inv_bop_post_allocation_des + totalSizeTransfer
        : null,
    };

    console.log(
      "calculatedData",
      calculatedData,
      existingData,
      totalSizeTransfer,
      params.data?.total_transfer_recomm
    );

    // Update existing data if found, otherwise add new entry
    const index = existingData.findIndex((item) => item.id === params.data.id);
    if (index !== -1) {
      existingData[index] = calculatedData;
    } else {
      existingData.push(calculatedData);
    }

    return existingData;
  };

  const getTopCenterOptions = () => {
    return (
      <div>
        <Chips
          isActive
          label={`Selected Week : ${startWeekSelection} - ${endWeekSelection}`}
          type="multi"
        />
      </div>
    );
  };

  const handleCloseButtonClick = () => {
    props.setOpenReviewRecommendationTable(false);
    props.setOpenRecommendationTableForDraftAndApprove(false);
    setStyleOrderSummarySubClassTableColumns([]);
  };

  useImperativeHandle(ref, () => ({
    onSaveDraft,
    onApprovePO,
  }));

  return (
    <>
      <Loader
        loader={
          props.poRebalanceTableFieldsLoader ||
          props.poRebalanceSubClassTableDataLoader
        }
        minHeight={"260px"}
      >
        {render && (
          <AgGridComponent
            columns={styleOrderSummarySubClassTableColumns}
            manualCallBack={manualCallBack}
            loadTableInstance={loadTableInstance}
            onBlur={onBlur}
            onCellValueChanged={handleCellValueChange}
            uniqueRowId={"l6_id"}
            rowModelType="serverSide"
            serverSideStoreType="partial"
            onRowSelected
            totalCount={10}
            cacheBlockSize={10}
            pagination={true}
            suppressClickEdit={true}
            hideChildSelection={true}
            // closeButton={true}
            handleCloseButtonClick={handleCloseButtonClick}
            showSetAll={false}
            purgeClosedRowNodes={true}
            suppressAggFuncInHeader={true}
            groupDisplayType={"custom"}
            treeData={true}
            childKey={"status_obj"}
            // topRightOptions={getTopRightOptions()}
            topLeftOptions={getTopLeftOptions()}
            // topCenterOptions={getTopCenterOptions()}
            tableHeader="Review Recommendation"
            customCellRenderer={(cellProps) => {
              if (cellProps?.value === "-") {
                return <p>-</p>;
              }
            }}
          />
        )}
      </Loader>
    </>
  );
});

const mapStateToProps = (store) => ({
  userAccess:
    store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
  screenConfig:
    store.omsReducer.orderingCommonService?.orderingScreensConfig?.po_rebalance,
  // poRebalanceSubClassTableDataLoader:
  //   store.omsReducer?.poRebalanceService.poRebalanceSubClassTableDataLoader,
  // poRebalanceTableFieldsLoader:
  //   store.omsReducer?.poRebalanceService.poRebalanceTableFieldsLoader,
  poRebalanceData: store.omsReducer?.poRebalanceService.poRebalanceData,
  choiceChannelTranferData:
    store.omsReducer?.poRebalanceService.choiceChannelTranferData,
  dropdownDataForPO: store.omsReducer?.poRebalanceService.dropdownDataForPO,
});

const mapDispatchToProps = (dispatch) => ({
  fetchPORebalanceReviewRecommendationTableFields: (payload) =>
    dispatch(fetchPORebalanceReviewRecommendationTableFields(payload)),
  fetchPORebalanceReviewRecommendationTableData: (payload) =>
    dispatch(fetchPORebalanceReviewRecommendationTableData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setPoRebalanceSubClassTableDataLoader: (payload) =>
    dispatch(setPoRebalanceSubClassTableDataLoader(payload)),
  saveDraftPayload: (payload) => dispatch(saveDraftPayload(payload)),
  setPoRebalanceData: (payload) => dispatch(setPoRebalanceData(payload)),
  setChoiceChannelTranferData: (payload) =>
    dispatch(setChoiceChannelTranferData(payload)),
  fetchPOBaseUnitKPIData: (payload) =>
    dispatch(fetchPOBaseUnitKPIData(payload)),
  fetchDropdownDataForPO: (payload) =>
    dispatch(fetchDropdownDataForPO(payload)),
  setDropdownDataForPO: (payload) => dispatch(setDropdownDataForPO(payload)),
  fetchPorjectedBopRebalance: (payload) =>
    dispatch(fetchPorjectedBopRebalance(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps, null, {
  forwardRef: true,
})(PoRebalanceReviewRecommendationTable);
