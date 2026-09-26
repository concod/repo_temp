import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import { useEffect, useState, useRef, forwardRef } from "react";
import { useTranslation } from "impact-ui-v3";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { connect } from "react-redux";
import { getMappedDates } from "../services/storeMappingService";
import moment from "moment";
import {
  DEFAULT_DATE_FORMAT,
  END_DATE,
  SKU_STORE_STATUS_START_DATE,
} from "config/constants";
import { cloneDeep, difference } from "lodash";
import clsx from "clsx";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { getViewMappedProductsData } from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/services-product-mapping/productMappingService";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  refreshCells,
  getRowsToRemove,
  prepareEditDeletePayload,
  checkIsNewlyCreatedMapping,
  conflictResolutionCheck,
  addDataToConflictObject,
  deleteDataFromConflictObject,
  renderConflictStyle,
  generateUniqueId,
  isMappingAlreadyEdited,
  getSelectedStoresOrProducts,
} from "./common-mapping-functions";
import {
  changeDateStringToOtherFormat,
  stringSplitWithTrim,
} from "core/Utils/functions/utils";
import EditDeleteCustomRenderer from "./editDeleteCustomRenderer";
import SetAllComponent from "./set-all-component";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import colours from "core/Styles/colours";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";

const TimeBoundDialog = forwardRef((props, ref) => {
  const { t } = useTranslation();
  /**
   * useStyles
   */
  const globalClasses = globalStyles();

  /**
   * State variables
   */
  const [viewStoresTableColumns, setviewStoresTableColumns] = useState([]);
  const [viewStoresData, setviewStoresData] = useState([]); //Table Data
  const [editedChanges, seteditedChanges] = useState(props.editedAPIPayload);
  const [viewProductsData, setviewProductsData] = useState([]); //Table Data for product mapping
  const [defaultTimeBoundTableData, setdefaultTimeBoundTableData] = useState(
    []
  );
  const [isLoading, setisLoading] = useState(false);
  const [editDeleteChanges, seteditDeleteChanges] = useState(
    props.editOrDeleteEditedAPIPayload
  );
  const [
    timePeriodTableConflictObject,
    updateTimePeriodTableConflictObject,
  ] = useState(props.conflictObject);
  const [isTimePeriodPresent, setIsTimePeriodPresent] = useState(false);

  /**
   * SetAll variables
   */
  //To display set all multi row pop up
  const [showSetAllPopUp, setshowSetAllPopUp] = useState(false);
  const [commonSetAllObjects, setcommonSetAllObjects] = useState([]);
  const [setAllConfirmBox, showsetAllConfirmBox] = useState(false);
  const [setAllPopUpFields, updateSetAllPopUpFields] = useState([]);
  /**
   * Refs
   */
  const timeBoundDialogTableRef = useRef(null);

  /**
   * UseEffects
   */

  const TimePeriodValueGetter = (params) => {
    if (params.node.level === 0) {
      return params.node.allChildrenCount;
    }
    return params.node.data["time_period"];
  };

  /**
   *
   * @param {string} screenName - either store_mapping or product_mapping
   * @returns table config name for time bound mapping dialog box
   */
  const getTableConfigName = (screenName) => {
    return `table_name=view_${
      screenName === "store_mapping" ? "stores_in" : "products"
    }_${screenName}_modify_table`;
  };

  const getSetAllConfigDetails = (screenName) => {
    return `table_name=${
      screenName === "store_mapping" ? "product_mapping" : "store_mapping"
    }_set_all_fields`;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const fetchInitialInfo = async () => {
      setisLoading(true);
      //Fetch the columns needed for time bound dialog
      //screenName would be either store_mapping or product_mapping
      let agGridcols = await getColumnsAg(
        getTableConfigName(props.screenName)
      )();
      let columnsResp = await getColumnsAg(
        getSetAllConfigDetails(props.screenName)
      )();
      updateSetAllPopUpFields(columnsResp);
      setIsTimePeriodPresent(isColumnPresent(agGridcols, "time_period"));
      agGridcols = agGridcols.map((col) => {
        if (col.column_name === "time_period") {
          col.minWidth = 400;
          col.cellRenderer = "agGroupCellRenderer";
          col.cellRendererParams = {
            suppressCount: true,
            innerRenderer: EditDeleteCustomRenderer,
          };
          col.valueGetter = TimePeriodValueGetter;
        }
        if (col.column_name === "add_icon" || col.column_name === "is_mapped") {
          col.cellRenderer = (params, extraProps) => {
            if (params.node.level === 0) {
              return (
                <CellRenderers
                  cellData={params}
                  column={col}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              );
            }
            if (params.node.level !== 0 && col.column_name === "add_icon") {
              return (
                <CellRenderers
                  cellData={params}
                  column={{ ...col, type: "edit_icon" }}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              );
            }
            return " ";
          };
        }
        if (col.column_name === "delete_icon") {
          col.cellRenderer = (params, extraProps) => {
            if (params.node.level === 0) {
              return "";
            }
            return (
              <CellRenderers
                cellData={{
                  ...params,
                }}
                column={col}
                extraProps={extraProps}
                actions={null}
              ></CellRenderers>
            );
          };
        }
        return col;
      });
      setviewStoresTableColumns([...agGridcols]);

      //Get the mapped stores data
      props.screenName === "store_mapping"
        ? fetchMappedStoresData()
        : fetchMappedProductsData();
    };
    fetchInitialInfo();
  }, []);

  useEffect(() => {
    if (timeBoundDialogTableRef.current) {
      timeBoundDialogTableRef.current.api.editedChanges = editedChanges;
      timeBoundDialogTableRef.current.api.editDeleteChanges = editDeleteChanges;
      timeBoundDialogTableRef.current.api.defaultTimeBoundTableData = defaultTimeBoundTableData;
      timeBoundDialogTableRef.current.api.conflictObject = timePeriodTableConflictObject;
    }
  }, [
    editedChanges,
    editDeleteChanges,
    defaultTimeBoundTableData,
    timePeriodTableConflictObject,
  ]);

  /**
   *
   * @param {boolean} isExclusive
   * @returns
   * This function returns the edited changes for selected product/store
   * when we open the time bound dialog for individual product/store
   * This function is used during bulk edit, where it checks if for respective product/store there are any
   * inline changes. If yes, it will block the bulk edit
   */
  const getCurrentSelectedStoreProductChanges = (isExclusive = false) => {
    const getFilteredProdsOrStores = (iterableArray) => {
      const uniqueId =
        props.screenName === "store_mapping" ? "product_code" : "store_code";
      return iterableArray.filter((storeProduct) => {
        const condition =
          storeProduct[uniqueId] ===
          getSelectedStoresOrProducts(
            props.screenName,
            props.selectedProductObjects,
            props.selectedStoreObjects
          )[uniqueId];
        return !isExclusive ? condition : !condition;
      });
    };
    const currentEditedChanges = getFilteredProdsOrStores(editedChanges);
    const currentEditDeleteChanges = getFilteredProdsOrStores(
      editDeleteChanges
    );
    return [currentEditedChanges, currentEditDeleteChanges];
  };
  const handleClick = (_event) => {
    if (timeBoundDialogTableRef.current.api.getSelectedRows().length < 1) {
      props.addSnack({
        message: t("inventorysmart.pleaseSelectMoreThanOneRow"),
        options: {
          variant: "error",
        },
      });
      return;
    }
    const currentProductStoreChanges = getCurrentSelectedStoreProductChanges();
    if (
      currentProductStoreChanges[0].length > 0 ||
      currentProductStoreChanges[1].length > 0
    ) {
      showsetAllConfirmBox(true);
      return;
    }
    setshowSetAllPopUp(true);
    setcommonSetAllObjects(
      props.screenName === "store_mapping"
        ? [
            props.selectedProductObjects.sku ||
              props.selectedProductObjects.product_code ||
              props.selectedProductObjects.article,
          ]
        : [props.selectedStoreObjects.store_code]
    );
  };

  const fetchMappedStoresData = async (refreshModifyTable = false) => {
    //Call the API to get the dates to get the already stored dates in DB
    let storeResp = [];

    let storesDictionary = {};

    props.selectedStores.forEach((store) => {
      storesDictionary[store.store_code] = [
        {
          ...store,
          id: [store.store_code],
          is_mapped: false,
          is_calendar_disabled: true,
        },
      ];
    });

    let body = {
      selected_stores: props.selectedStores.map((item) => item.store_code),
      product_code:
        props.selectedProductObjects[
          props.isAggregated ? "article" : "product_code"
        ],
      filters: [],
      meta: {
        range: [],
        sort: [],
        search: [],
      },
    };
    const queryParams = props.isAggregated
      ? "?level=aggregation"
      : "?level=product";
    const mappedStoresResp = await props.getMappedDates(body, queryParams);

    mappedStoresResp.data.data.forEach((store) => {
      //Added this to accomodate extra information like updated_at, updated_by
      if (
        storesDictionary[store.store_code] &&
        Array.isArray(storesDictionary[store.store_code]) &&
        storesDictionary[store.store_code].length > 0
      ) {
        storesDictionary[store.store_code][0] = {
          ...storesDictionary[store.store_code][0],
          ...store,
        };
      }
      if (Array.isArray(store.validity) && store.validity.length !== 0) {
        storesDictionary[store.store_code][0].is_mapped = true;
        storesDictionary[store.store_code][0].is_calendar_disabled = false;
        store.validity.forEach((valid) => {
          storesDictionary[store.store_code].push({
            id: [
              store.store_code,
              `${store.store_code}_${
                storesDictionary[store.store_code].length
              }`,
            ],
            time_period: `${changeDateStringToOtherFormat(
              valid[0],
              "YYYY-MM-DD",
              DEFAULT_DATE_FORMAT
            )} - ${changeDateStringToOtherFormat(
              valid[1],
              "YYYY-MM-DD",
              DEFAULT_DATE_FORMAT
            )}`,
          });
        });
      }
    });
    let defaultDBMappedData = [];
    for (const storeKey in storesDictionary) {
      defaultDBMappedData.push(...storesDictionary[storeKey]);
    }
    setdefaultTimeBoundTableData(cloneDeep(defaultDBMappedData));
    //Newly edited changes for the selected product code
    const currentProdEditedChanges = editedChanges.filter(
      (change) =>
        change.product_code ===
        props.selectedProductObjects[
          props.isAggregated ? "article" : "product_code"
        ]
    );
    currentProdEditedChanges.forEach((change) => {
      if (change.select.length > 0 && change.unselect.length === 0) {
        storesDictionary[change.select[0]][0].is_mapped = true;
        storesDictionary[change.select[0]][0].is_calendar_disabled = false;
        storesDictionary[change.select[0]].push({
          id: [
            change.select[0],
            `${change.select[0]}_${storesDictionary[change.select[0]].length}`,
          ],
          time_period: `${changeDateStringToOtherFormat(
            change.valid_from,
            "YYYY-MM-DD",
            DEFAULT_DATE_FORMAT
          )} - ${changeDateStringToOtherFormat(
            change.valid_to,
            "YYYY-MM-DD",
            DEFAULT_DATE_FORMAT
          )}`,
        });
      }
      if (change.include_unmapped === true) {
        props.selectedStores.forEach((item) => {
          if (
            !storesDictionary[item.store_code][0].is_mapped &&
            !(
              (change.edited_ids &&
                change.edited_ids.includes(item.store_code)) ||
              (change.deleted_ids &&
                change.deleted_ids.includes(item.store_code))
            )
          ) {
            storesDictionary[item.store_code][0].is_mapped = true;
            storesDictionary[item.store_code][0].is_calendar_disabled = false;
            storesDictionary[item.store_code].push({
              id: [
                item.store_code,
                `${item.store_code}_${
                  storesDictionary[item.store_code].length
                }`,
              ],
              time_period: `${changeDateStringToOtherFormat(
                change.valid_from,
                "YYYY-MM-DD",
                DEFAULT_DATE_FORMAT
              )} - ${changeDateStringToOtherFormat(
                change.valid_to,
                "YYYY-MM-DD",
                DEFAULT_DATE_FORMAT
              )}`,
            });
          }
        });
      }
      if (change.unselect.length > 0 && change.select.length === 0) {
        storesDictionary[change.unselect[0]][0].is_mapped = false;
        storesDictionary[change.unselect[0]][0].is_calendar_disabled = true;
        storesDictionary[change.unselect[0]] = [
          storesDictionary[change.unselect[0]][0],
        ];
      }
    });

    //Newly edited changes for the selected product code
    const currentProdEditDeleteChanges = editDeleteChanges.filter(
      (change) =>
        change.product_code ===
        props.selectedProductObjects[
          props.isAggregated ? "article" : "product_code"
        ]
    );
    currentProdEditDeleteChanges.forEach((editDelChange) => {
      storesDictionary[editDelChange.store_code] = [
        storesDictionary[editDelChange.store_code][0],
      ];
      storesDictionary[editDelChange.store_code][0].is_mapped =
        editDelChange.mappingsList.length !== 0;
      storesDictionary[editDelChange.store_code][0].is_calendar_disabled =
        editDelChange.mappingsList.length === 0;
      editDelChange.mappingsList.forEach((mapping) => {
        storesDictionary[editDelChange.store_code].push({
          id: [
            editDelChange.store_code,
            `${editDelChange.store_code}_${
              storesDictionary[editDelChange.store_code].length
            }`,
          ],
          time_period: mapping.time_period,
        });
      });
    });
    for (const storeKey in storesDictionary) {
      storeResp.push(...storesDictionary[storeKey]);
    }
    setviewStoresData(storeResp);
    if (refreshModifyTable === true) {
      timeBoundDialogTableRef.current.api.refreshCells({ force: true });
      ref.current.api.refreshServerSideStore({ purge: true });
    }
    renderConflictStyle(
      timeBoundDialogTableRef,
      props.screenName,
      props.selectedProductObjects,
      timePeriodTableConflictObject,
      props.isAggregated
    );
    setisLoading(false);
  };

  const fetchMappedProductsData = async (refreshModifyTable = false) => {
    //Call the API to get the dates to get the already stored dates in DB
    let productResp = [];

    let productsDictionary = {};

    props.selectedProducts.forEach((product) => {
      productsDictionary[product.product_code] = [
        {
          ...product,
          id: [product.product_code],
          is_mapped: false,
          is_calendar_disabled: true,
        },
      ];
    });

    let body = {
      selected_products: props.selectedProducts.map(
        (item) => item.product_code || item.article
      ),
      store_code: props.selectedStoreObjects.store_code,
      filters: [],
      meta: {
        range: [],
        sort: [],
        search: [],
      },
    };
    const queryParams = props.isAggregated ? "?level=aggregation" : "";
    const mappedProductsResp = await props.getViewMappedProductsData(
      body,
      queryParams
    );

    mappedProductsResp.data.data.forEach((product) => {
      //Added this to accomodate extra information like updated_at, updated_by
      if (
        productsDictionary[product.product_code] &&
        Array.isArray(productsDictionary[product.product_code]) &&
        productsDictionary[product.product_code].length > 0
      ) {
        productsDictionary[product.product_code][0] = {
          ...productsDictionary[product.product_code][0],
          ...product,
        };
      }
      if (Array.isArray(product.validity) && product.validity.length !== 0) {
        productsDictionary[product.product_code][0].is_mapped = true;
        productsDictionary[
          product.product_code
        ][0].is_calendar_disabled = false;
        product.validity.forEach((valid) => {
          productsDictionary[product.product_code].push({
            id: [
              product.product_code,
              `${product.product_code}_${
                productsDictionary[product.product_code].length
              }`,
            ],
            time_period: `${changeDateStringToOtherFormat(
              valid[0],
              "YYYY-MM-DD",
              DEFAULT_DATE_FORMAT
            )} - ${changeDateStringToOtherFormat(
              valid[1],
              "YYYY-MM-DD",
              DEFAULT_DATE_FORMAT
            )}`,
          });
        });
      }
    });

    let defaultDBMappedData = [];
    for (const productKey in productsDictionary) {
      defaultDBMappedData.push(...productsDictionary[productKey]);
    }
    setdefaultTimeBoundTableData(cloneDeep(defaultDBMappedData));
    //Newly edited changes for the selected product code
    const currentStoreEditedChanges = editedChanges.filter(
      (change) => change.store_code === props.selectedStoreObjects.store_code
    );
    currentStoreEditedChanges.forEach((change) => {
      if (change.select.length > 0 && change.unselect.length === 0) {
        productsDictionary[change.select[0]][0].is_mapped = true;
        productsDictionary[change.select[0]][0].is_calendar_disabled = false;
        productsDictionary[change.select[0]].push({
          id: [
            change.select[0],
            `${change.select[0]}_${
              productsDictionary[change.select[0]].length
            }`,
          ],
          time_period: `${changeDateStringToOtherFormat(
            change.valid_from,
            "YYYY-MM-DD",
            DEFAULT_DATE_FORMAT
          )} - ${changeDateStringToOtherFormat(
            change.valid_to,
            "YYYY-MM-DD",
            DEFAULT_DATE_FORMAT
          )}`,
        });
      }
      if (change.include_unmapped === true) {
        props.selectedProducts.forEach((item) => {
          if (
            !productsDictionary[item.product_code][0].is_mapped &&
            !(
              change.edited_ids && change.edited_ids.includes(item.product_code)
            ) &&
            !(
              change.deleted_ids &&
              change.deleted_ids.includes(item.product_code)
            )
          ) {
            productsDictionary[item.product_code][0].is_mapped = true;
            productsDictionary[
              item.product_code
            ][0].is_calendar_disabled = false;
            productsDictionary[item.product_code].push({
              id: [
                item.product_code,
                `${item.product_code}_${
                  productsDictionary[item.product_code].length
                }`,
              ],
              time_period: `${changeDateStringToOtherFormat(
                change.valid_from,
                "YYYY-MM-DD",
                DEFAULT_DATE_FORMAT
              )} - ${changeDateStringToOtherFormat(
                change.valid_to,
                "YYYY-MM-DD",
                DEFAULT_DATE_FORMAT
              )}`,
            });
          }
        });
      }
      if (change.unselect.length > 0 && change.select.length === 0) {
        productsDictionary[change.unselect[0]][0].is_mapped = false;
        productsDictionary[change.unselect[0]][0].is_calendar_disabled = true;
        productsDictionary[change.unselect[0]] = [
          productsDictionary[change.unselect[0]][0],
        ];
      }
    });

    //Newly edited changes for the selected product code
    const currentStoreEditDeleteChanges = editDeleteChanges.filter(
      (change) => change.store_code === props.selectedStoreObjects.store_code
    );
    currentStoreEditDeleteChanges.forEach((editDelChange) => {
      productsDictionary[editDelChange.product_code] = [
        productsDictionary[editDelChange.product_code][0],
      ];
      productsDictionary[editDelChange.product_code][0].is_mapped =
        editDelChange.mappingsList.length !== 0;
      productsDictionary[editDelChange.product_code][0].is_calendar_disabled =
        editDelChange.mappingsList.length === 0;
      editDelChange.mappingsList.forEach((mapping) => {
        productsDictionary[editDelChange.product_code].push({
          id: [
            editDelChange.product_code,
            `${editDelChange.product_code}_${
              productsDictionary[editDelChange.product_code].length
            }`,
          ],
          time_period: mapping.time_period,
        });
      });
    });

    for (const productKey in productsDictionary) {
      productResp.push(...productsDictionary[productKey]);
    }
    setviewProductsData(productResp);
    if (refreshModifyTable === true) {
      timeBoundDialogTableRef.current.api.refreshCells({ force: true });
      ref.current.api.refreshServerSideStore({ purge: true });
    }
    renderConflictStyle(
      timeBoundDialogTableRef,
      props.screenName,
      props.selectedStoreObjects,
      timePeriodTableConflictObject
    );
    setisLoading(false);
  };

  const onApplyCalendarDates = (gridInstance, datesArray) => {
    const conflictKey =
      props.screenName === "store_mapping"
        ? props.selectedProductObjects.product_code
        : props.selectedStoreObjects.store_code;
    const newGroupData = [
      {
        id: [
          `${gridInstance.data.id[0]}`,
          `${gridInstance.data.id[0]}_${generateUniqueId(gridInstance.node)}`,
        ],
        time_period: `${datesArray[0].format(DEFAULT_DATE_FORMAT)} - ${
          datesArray[1].isValid()
            ? datesArray[1].format(DEFAULT_DATE_FORMAT)
            : changeDateStringToOtherFormat(
                END_DATE,
                "YYYY-MM-DD",
                DEFAULT_DATE_FORMAT
              )
        }`,
      },
    ];
    //We push the updated changes payload to edited changes
    let updatedChanges = cloneDeep(gridInstance.api.editedChanges);
    let body = {
      ...(props.screenName === "store_mapping" && {
        product_code:
          props.selectedProductObjects.product_code ||
          props.selectedProductObjects.article,
      }),
      ...(props.screenName === "product_mapping" && {
        store_code: props.selectedStoreObjects.store_code,
      }),
      include_unmapped: false,
      map: true,
      ...(props.screenName === "store_mapping" && {
        select: [gridInstance.data.store_code],
      }),
      ...(props.screenName === "product_mapping" && {
        select: [gridInstance.data.product_code],
      }),
      unselect: [],
      valid_from: datesArray[0].format("YYYY-MM-DD"),
      valid_to: datesArray[1].isValid()
        ? datesArray[1].format("YYYY-MM-DD")
        : END_DATE,
      ...(props.screenName === "product_mapping" && {
        mapped_products: props.selectedStoreObjects?.mapped_products,
      }),
      ...(props.screenName === "store_mapping" && {
        mapped_stores: props.selectedProductObjects?.mapped_stores,
      }),
    };
    updatedChanges.push(body);
    seteditedChanges(updatedChanges);
    timeBoundDialogTableRef.current.api.applyTransaction({ add: newGroupData });
    const isAlreadyEditedMappedObject = isMappingAlreadyEdited(
      gridInstance.api.editDeleteChanges,
      props.screenName === "store_mapping"
        ? conflictKey
        : gridInstance.data.id[0],
      props.screenName === "store_mapping"
        ? gridInstance.data.id[0]
        : conflictKey
    );
    if (isAlreadyEditedMappedObject.length > 0) {
      const newlyAddedRowNode = gridInstance.api.getRowNode(newGroupData[0].id);
      const selectedStoreOrProdObjects = getSelectedStoresOrProducts(
        props.screenName,
        props.selectedProductObjects,
        props.selectedStoreObjects
      );
      const updatedEditOrDeletePayload = prepareEditDeletePayload(
        { node: newlyAddedRowNode, data: newlyAddedRowNode.data },
        selectedStoreOrProdObjects,
        props.screenName,
        gridInstance.api.editDeleteChanges,
        "edit"
      );
      seteditDeleteChanges(updatedEditOrDeletePayload);
    }
    if (conflictResolutionCheck(gridInstance.node, displaySnackMessages)) {
      //If conflict is present, we add the product-store relation to conflict object
      addDataToConflictObject(
        conflictKey,
        gridInstance.node.data.id[0],
        timePeriodTableConflictObject,
        updateTimePeriodTableConflictObject
      );
    } else {
      //If conflict is resolved, we remove the product-store relation to conflict object
      deleteDataFromConflictObject(
        conflictKey,
        gridInstance.node.data.id[0],
        timePeriodTableConflictObject,
        updateTimePeriodTableConflictObject
      );
    }
  };

  const onEditPayloadChange = (event, oldValue, newValue) => {
    const mappedObjectIndex = checkIsNewlyCreatedMapping(
      event,
      event.api.editedChanges,
      props.screenName === "store_mapping"
        ? props.selectedProductObjects
        : props.selectedStoreObjects,
      props.screenName,
      oldValue
    );
    const selectedStoreOrProdObjects = getSelectedStoresOrProducts(
      props.screenName,
      props.selectedProductObjects,
      props.selectedStoreObjects
    );
    const isAlreadyEditedMappedObject = isMappingAlreadyEdited(
      event.api.editDeleteChanges,
      selectedStoreOrProdObjects[
        props.screenName === "store_mapping" ? "product_code" : "store_code"
      ],
      event.data.id[0]
    );
    /**
     * If it is a newly created mapping, when we edit the date, we replace valid from and valid to
     * in the newly created mapping payload
     */

    if (mappedObjectIndex !== -1) {
      const [startDate, endDate] = stringSplitWithTrim(newValue, "-");
      let body = {
        ...(props.screenName === "store_mapping" && {
          product_code:
            props.selectedProductObjects.product_code ||
            props.selectedProductObjects.article,
        }),
        ...(props.screenName === "product_mapping" && {
          store_code: props.selectedStoreObjects.store_code,
        }),
        include_unmapped: false,
        map: true,
        ...((props.screenName === "store_mapping" ||
          props.screenName === "product_mapping") && {
          select: [event.data.id[0]],
        }),
        unselect: [],
        valid_from: changeDateStringToOtherFormat(
          startDate,
          DEFAULT_DATE_FORMAT,
          "YYYY-MM-DD"
        ),
        valid_to: changeDateStringToOtherFormat(
          endDate,
          DEFAULT_DATE_FORMAT,
          "YYYY-MM-DD"
        ),
        ...(props.screenName === "product_mapping" && {
          mapped_products: props.selectedStoreObjects?.mapped_products,
        }),
        ...(props.screenName === "store_mapping" && {
          mapped_stores: props.selectedProductObjects?.mapped_stores,
        }),
      };
      let updatedEditedAPIPayload = cloneDeep(event.api.editedChanges);
      if (event.api.editedChanges[mappedObjectIndex].include_unmapped) {
        if (updatedEditedAPIPayload[0]?.edited_ids) {
          updatedEditedAPIPayload[0].edited_ids.push(event.data.id[0]);
        } else {
          updatedEditedAPIPayload[0].edited_ids = [event.data.id[0]];
        }
      } else {
        updatedEditedAPIPayload.splice(mappedObjectIndex, 1);
      }
      updatedEditedAPIPayload.push(body);
      seteditedChanges(updatedEditedAPIPayload);
      event.node.data.isRowEditingEnabled = false;
    }
    if (mappedObjectIndex === -1 || isAlreadyEditedMappedObject.length > 0) {
      const updatedEditOrDeletePayload = prepareEditDeletePayload(
        event,
        selectedStoreOrProdObjects,
        props.screenName,
        event.api.editDeleteChanges,
        "edit"
      );
      seteditDeleteChanges(updatedEditOrDeletePayload);
      event.node.data.isRowEditingEnabled = false;
    }
  };

  const onCellValueChanged = (params) => {
    const { colDef, value, data, node, oldValue } = params;
    const oldState = defaultTimeBoundTableData.filter((defaultData) =>
      props.screenName === "store_mapping"
        ? defaultData["id"].length === 1 &&
          defaultData["id"][0] === data.store_code
        : defaultData["id"].length === 1 &&
          defaultData["id"][0] === data.product_code
    );
    const conflictKey =
      props.screenName === "store_mapping"
        ? props.selectedProductObjects.product_code
        : props.selectedStoreObjects.store_code;
    if (colDef.column_name === "time_period") {
      onEditPayloadChange(params, oldValue, value);
      if (conflictResolutionCheck(node.parent, displaySnackMessages)) {
        addDataToConflictObject(
          conflictKey,
          node.parent.data.id[0],
          timePeriodTableConflictObject,
          updateTimePeriodTableConflictObject
        );
      } else {
        deleteDataFromConflictObject(
          conflictKey,
          node.parent.data.id[0],
          timePeriodTableConflictObject,
          updateTimePeriodTableConflictObject
        );
      }
    }
    //If the new state is true(mapped state) and old state is unmapped
    //Then it means, we are newly mapping the store-product link - so a new time bound is added
    if (
      colDef.column_name === "is_mapped" &&
      value &&
      oldState[0].is_mapped === false
    ) {
      const newGroupData = [
        {
          id: [`${data.id}`, `${data.id}_${generateUniqueId(node)}`],
          time_period: `${
            isTimePeriodPresent
              ? moment().format(DEFAULT_DATE_FORMAT)
              : changeDateStringToOtherFormat(
                  SKU_STORE_STATUS_START_DATE,
                  "YYYY-MM-DD",
                  DEFAULT_DATE_FORMAT
                )
          } - ${changeDateStringToOtherFormat(
            END_DATE,
            "YYYY-MM-DD",
            DEFAULT_DATE_FORMAT
          )}`,
        },
      ];

      //We push the updated changes payload to edited changes
      let updatedChanges = cloneDeep(editedChanges);
      let body = {
        ...(props.screenName === "store_mapping" && {
          product_code:
            props.selectedProductObjects.product_code ||
            props.selectedProductObjects.article,
          select: [data.store_code],
        }),
        ...(props.screenName === "product_mapping" && {
          store_code: props.selectedStoreObjects.store_code,
          select: [data.product_code],
        }),
        include_unmapped: false,
        map: true,
        unselect: [],
        valid_from: isTimePeriodPresent
          ? moment().format("YYYY-MM-DD")
          : SKU_STORE_STATUS_START_DATE,
        valid_to: END_DATE,
        ...(props.screenName === "product_mapping" && {
          mapped_products: props.selectedStoreObjects?.mapped_products,
        }),
        ...(props.screenName === "store_mapping" && {
          mapped_stores: props.selectedProductObjects?.mapped_stores,
        }),
      };
      updatedChanges.push(body);
      seteditedChanges(updatedChanges);
      //assign it to edited changes
      timeBoundDialogTableRef.current.api.applyTransaction({
        add: newGroupData,
      });
      node.data.is_calendar_disabled = false;
      timeBoundDialogTableRef.current.api.redrawRows({ rowNodes: node });
    }

    //If the new state is true(mapped state) and old state is mapped,
    //then we set the state of mapping to the state in the db - number of time bounds will be sameas
    //that are in db
    if (
      colDef.column_name === "is_mapped" &&
      value &&
      oldState[0].is_mapped === true
    ) {
      let updatedValues =
        props.screenName === "store_mapping"
          ? editedChanges.filter(
              (change) =>
                !(
                  change.unselect.includes(data.store_code) &&
                  change.product_code ===
                    props.selectedProductObjects.product_code
                )
            )
          : editedChanges.filter(
              (change) =>
                !(
                  change.unselect.includes(data.product_code) &&
                  change.store_code === props.selectedStoreObjects.store_code
                )
            );
      seteditedChanges(updatedValues);
      const defaultTimeBoundListForCurrentRow = defaultTimeBoundTableData.filter(
        (timeBound) =>
          timeBound["id"].length > 1 &&
          (props.screenName === "store_mapping"
            ? timeBound["id"][0] === data.store_code
            : timeBound["id"][0] === data.product_code)
      );
      timeBoundDialogTableRef.current.api.applyTransaction({
        add: defaultTimeBoundListForCurrentRow,
      });
      node.data.is_calendar_disabled = false;
      timeBoundDialogTableRef.current.api.redrawRows({ rowNodes: node });
    }
    if (
      colDef.column_name === "is_mapped" &&
      !value &&
      oldState[0].is_mapped === false
    ) {
      let updatedValues =
        props.screenName === "store_mapping"
          ? editedChanges.filter(
              (change) =>
                !(
                  (change.select.includes(data.store_code) ||
                    change.include_unmapped) &&
                  change.product_code ===
                    props.selectedProductObjects.product_code
                )
            )
          : editedChanges.filter(
              (change) =>
                !(
                  (change.select.includes(data.product_code) ||
                    change.include_unmapped) &&
                  change.store_code === props.selectedStoreObjects.store_code
                )
            );
      const IncludeUnmappedObject =
        props.screenName === "store_mapping"
          ? editedChanges.filter(
              (change) =>
                change.include_unmapped &&
                change.product_code ===
                  props.selectedProductObjects.product_code
            )
          : editedChanges.filter(
              (change) =>
                change.include_unmapped &&
                change.store_code === props.selectedStoreObjects.store_code
            );
      if (IncludeUnmappedObject.length > 0) {
        let exisitingUnmapped =
          props.screenName === "store_mapping"
            ? difference(
                props.selectedStores.map((item) => item.store_code),
                props.selectedProductObjects.mapped_stores
              )
            : difference(
                props.selectedProducts.map((item) => item.product_code),
                props.selectedStoreObjects.mapped_products
              );
        exisitingUnmapped = exisitingUnmapped.filter(
          (unmappedCode) =>
            unmappedCode !==
            (props.screenName === "store_mapping"
              ? data.store_code
              : data.product_code)
        );
        exisitingUnmapped.forEach((prodOrStore) =>
          updatedValues.push({
            ...(props.screenName === "store_mapping" && {
              product_code:
                props.selectedProductObjects.product_code ||
                props.selectedProductObjects.article,
              select: [prodOrStore],
            }),
            ...(props.screenName === "product_mapping" && {
              store_code: props.selectedStoreObjects.store_code,
              select: [prodOrStore],
            }),
            include_unmapped: false,
            map: true,
            unselect: [],
            valid_from: IncludeUnmappedObject[0].valid_from,
            valid_to: IncludeUnmappedObject[0].valid_to,
          })
        );
      }
      const nodesToBeRemoved = getRowsToRemove(node);
      seteditedChanges(updatedValues);
      node.data.is_calendar_disabled = true;
      node.data.hasConflict = false;
      deleteDataFromConflictObject(
        conflictKey,
        node.data.id[0],
        timePeriodTableConflictObject,
        updateTimePeriodTableConflictObject
      );
      timeBoundDialogTableRef.current.api.redrawRows({ rowNodes: node });
      timeBoundDialogTableRef.current.api.applyTransaction({
        remove: nodesToBeRemoved,
      });
    }

    if (
      colDef.column_name === "is_mapped" &&
      !value &&
      oldState[0].is_mapped === true
    ) {
      let updatedValues =
        props.screenName === "store_mapping"
          ? editedChanges.filter(
              (change) =>
                !(
                  change.select.includes(data.store_code) &&
                  change.product_code ===
                    props.selectedProductObjects.product_code
                )
            )
          : editedChanges.filter(
              (change) =>
                !(
                  change.select.includes(data.product_code) &&
                  change.store_code === props.selectedStoreObjects.store_code
                )
            );
      updatedValues.push({
        ...(props.screenName === "store_mapping" && {
          product_code:
            props.selectedProductObjects.product_code ||
            props.selectedProductObjects.article,
          unselect: [data.store_code],
        }),
        ...(props.screenName === "product_mapping" && {
          store_code: props.selectedStoreObjects.store_code,
          unselect: [data.product_code],
        }),
        include_unmapped: false,
        map: true,
        select: [],
        valid_from: isTimePeriodPresent
          ? moment().format("YYYY-MM-DD")
          : SKU_STORE_STATUS_START_DATE,
        valid_to: END_DATE,
        ...(props.screenName === "product_mapping" && {
          mapped_products: props.selectedStoreObjects?.mapped_products,
        }),
        ...(props.screenName === "store_mapping" && {
          mapped_stores: props.selectedProductObjects?.mapped_stores,
        }),
      });
      const nodesToBeRemoved = getRowsToRemove(node);
      seteditedChanges(updatedValues);
      node.data.is_calendar_disabled = true;
      node.data.hasConflict = false;
      deleteDataFromConflictObject(
        conflictKey,
        node.data.id[0],
        timePeriodTableConflictObject,
        updateTimePeriodTableConflictObject
      );
      timeBoundDialogTableRef.current.api.redrawRows({ rowNodes: node });
      timeBoundDialogTableRef.current.api.applyTransaction({
        remove: nodesToBeRemoved,
      });
    }

    if (colDef.column_name !== "time_period") {
      if (conflictResolutionCheck(node, displaySnackMessages)) {
        addDataToConflictObject(
          conflictKey,
          node.data.id[0],
          props.conflictObject,
          updateTimePeriodTableConflictObject
        );
      } else {
        deleteDataFromConflictObject(
          conflictKey,
          node.data.id[0],
          props.conflictObject,
          updateTimePeriodTableConflictObject
        );
      }
    }
  };

  const onApplyBtnClick = () => {
    props.setEditedAPIPayload(editedChanges);
    props.seteditOrDeleteEditedAPIPayload(editDeleteChanges);
    props.updateConflictObject(timePeriodTableConflictObject);
    props.setdisplayTimeBoundMappingDialog(false);
  };

  const dialogTitleClass = clsx(
    globalClasses.flexRow,
    globalClasses.layoutAlignBetweenCenter
  );

  /**
   *
   * @param {instance props and row data} event
   */
  const onDeleteTimePeriod = (event) => {
    const selectedStoreOrProdObjects = getSelectedStoresOrProducts(
      props.screenName,
      props.selectedProductObjects,
      props.selectedStoreObjects
    );
    const tempEditedChanges = event.api.editedChanges
      ? event.api.editedChanges
      : [];
    const tempEditDeleteChanges = event.api.editDeleteChanges
      ? event.api.editDeleteChanges
      : [];
    const mappedObjectIndex = checkIsNewlyCreatedMapping(
      event,
      tempEditedChanges,
      selectedStoreOrProdObjects,
      props.screenName,
      event.node.data.time_period
    );
    const isAlreadyEditedMappedObject = isMappingAlreadyEdited(
      event.api.editDeleteChanges,
      selectedStoreOrProdObjects[
        props.screenName === "store_mapping" ? "product_code" : "store_code"
      ],
      event.data.id[0]
    );
    /**
     * If it is newly created mapping, we remove the existing created mapping
     */
    if (mappedObjectIndex !== -1) {
      let updatedEditedAPIPayload = cloneDeep(tempEditedChanges);
      if (updatedEditedAPIPayload[mappedObjectIndex]?.include_unmapped) {
        if (updatedEditedAPIPayload[0]?.deleted_ids) {
          updatedEditedAPIPayload[0].deleted_ids.push(event.data.id[0]);
        } else {
          updatedEditedAPIPayload[0].deleted_ids = [event.data.id[0]];
        }
      } else {
        updatedEditedAPIPayload.splice(mappedObjectIndex, 1);
      }
      seteditedChanges(updatedEditedAPIPayload);
    }
    /**
     * If we are not deleting created object or is already present in the edit payload,
     * we remove it from the mappedLists array of edit delete payload
     */
    if (mappedObjectIndex === -1 || isAlreadyEditedMappedObject.length > 0) {
      const updatedEditOrDeletePayload = prepareEditDeletePayload(
        event,
        selectedStoreOrProdObjects,
        props.screenName,
        tempEditDeleteChanges,
        "delete"
      );
      seteditDeleteChanges(updatedEditOrDeletePayload);
    }
    /**
     * pass the parent info and date value to the payload function
     */
    const removedNodes = event.api.getRowNode(event.data.id);
    const parentNode = event.api.getRowNode([event.data.id[0]]);
    if (getRowsToRemove(parentNode).length - 1 === 0) {
      parentNode.data.is_mapped = false; //we unmap the store and product as there are no time periods
      parentNode.data.is_calendar_disabled = true;
      event.api.applyTransaction({ update: [parentNode.data] });
      event.api.refreshCells({
        rowNodes: [parentNode],
        columns: ["add_icon", "edit_icon"],
        force: true,
      });
    }
    event.api.applyTransaction({ remove: [removedNodes] });
    const conflictKey =
      props.screenName === "store_mapping"
        ? props.selectedProductObjects.product_code
        : props.selectedStoreObjects.store_code;
    if (conflictResolutionCheck(parentNode, displaySnackMessages)) {
      addDataToConflictObject(
        conflictKey,
        parentNode.data.id[0],
        event.api.conflictObject || {},
        updateTimePeriodTableConflictObject
      );
    } else {
      deleteDataFromConflictObject(
        conflictKey,
        parentNode.data.id[0],
        event.api.conflictObject || {},
        updateTimePeriodTableConflictObject
      );
    }
  };

  /**
   *
   * @param {instance props and edit row data} event
   */
  const onEditTimePeriod = (event) => {
    event.node.data.isRowEditingEnabled = true;
    event.api.applyTransaction({
      update: [event.node.data],
    });
    refreshCells(event, ["time_period"]);
  };

  const getSelectedObjects = () => {
    if (timeBoundDialogTableRef.current) {
      return timeBoundDialogTableRef.current.api.getSelectedRows();
    }
    return [];
  };

  // row highlighting based on conflict present in status
  const getRowStyle = (params) => {
    if (params.node.level === 0 && params.node.data) {
      if (params.node.data.hasConflict) return { background: colours.wispPink };
    }
    return null;
  };

  return (
    <>
      {setAllConfirmBox && (
        <ConfirmBox
          onClose={() => showsetAllConfirmBox(false)}
          onConfirm={() => {
            timeBoundDialogTableRef.current.api.setRowData(
              defaultTimeBoundTableData
            );
            const updatedChanges = getCurrentSelectedStoreProductChanges(true);
            props.setEditedAPIPayload(updatedChanges[0]);
            props.seteditOrDeleteEditedAPIPayload(updatedChanges[1]);
            seteditedChanges(updatedChanges[0]);
            seteditDeleteChanges(updatedChanges[1]);
            showsetAllConfirmBox(false);
          }}
        />
      )}
      <SetAllComponent
        ref={timeBoundDialogTableRef}
        isBulkEdit={true}
        showSetAllPopUp={showSetAllPopUp}
        commonSetAllStores={commonSetAllObjects}
        selectedProducts={
          props.screenName === "store_mapping"
            ? [props.selectedProductObjects]
            : [props.selectedStoreObjects]
        }
        setAllPopUpFields={setAllPopUpFields}
        setshowSetAllPopUp={setshowSetAllPopUp}
        selectedProductObjects={getSelectedObjects()}
        selectedStoreObjects={getSelectedObjects()}
        onClickFilter={() => props.setdisplayTimeBoundMappingDialog(false)}
        screenName={
          props.screenName === "store_mapping"
            ? "product_mapping"
            : "store_mapping"
        }
        filterDependency={[]}
        isAggregated={props.isAggregated}
        isTimePeriodPresent={isTimePeriodPresent}
      />
      <Dialog open={props.displayDialog} maxWidth={"lg"} fullWidth={true}>
        <DialogTitle className={dialogTitleClass}>
          <Typography variant="h5">
            {" "}
            {`View ${
              props.screenName === "store_mapping"
                ? "Stores"
                : `${dynamicLabelsBasedOnTenant("product", "core")}s`
            }`}{" "}
          </Typography>
          <Typography variant="h5">
            {" "}
            {props.screenName === "store_mapping" &&
              `Selected ID: ${
                props.selectedProductObjects.sku ||
                props.selectedProductObjects.product_code ||
                props.selectedProductObjects.article
              }`}
            {props.screenName === "product_mapping" &&
              `Selected ID: ${
                props.selectedStoreObjects[
                  dynamicLabelKeysBasedOnTenant("store_code", "core")
                ]
              }`}
          </Typography>
          <Button variant="contained" color="primary" onClick={handleClick}>
            +Bulk Edit
          </Button>
        </DialogTitle>
        <DialogContent>
          <LoadingOverlay loader={isLoading} spinner>
            {viewStoresTableColumns.length > 0 && (
              <AgGridTable
                ref={timeBoundDialogTableRef}
                rowdata={
                  props.screenName === "store_mapping"
                    ? viewStoresData
                    : viewProductsData
                }
                columns={viewStoresTableColumns}
                selectAllHeaderComponent={true}
                sizeColumnsToFitFlag
                onGridChanged
                hideChildSelection={true}
                onRowSelected
                uniqueRowId={"id"}
                loadTableInstance={(gridInstance) => {
                  timeBoundDialogTableRef.current = gridInstance;
                }}
                treeData={true}
                groupDisplayType={"custom"}
                getDataPath={(data) => {
                  return data.id;
                }}
                onCellValueChanged={onCellValueChanged}
                onApplyCalendarDates={(instance, dates) =>
                  onApplyCalendarDates(instance, dates)
                }
                callDeleteApi={onDeleteTimePeriod}
                onEditClick={onEditTimePeriod}
                getRowStyle={getRowStyle}
                groupDefaultExpanded={isTimePeriodPresent}
              />
            )}
          </LoadingOverlay>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            color="primary"
            onClick={props.onCloseDialog}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={onApplyBtnClick}
            disabled={isLoading || props.modifyTableLoader}
          >
            Apply
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
});

export const mapActionsToProps = {
  getMappedDates,
  addSnack,
  getViewMappedProductsData,
};
export default connect(null, mapActionsToProps, null, { forwardRef: true })(
  TimeBoundDialog
);
