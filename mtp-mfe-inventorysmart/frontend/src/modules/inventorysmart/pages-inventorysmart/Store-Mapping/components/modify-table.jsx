import { useState, useEffect, forwardRef } from "react";
import AgGridTable from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  cloneDeep,
  difference,
  findIndex,
  uniq,
  isEmpty
} from "lodash";
import moment from "moment";
import { END_DATE } from "config/constants";
import {
  generateUniqueEditedPayload,
  getExisitingUnmappedStores,
  getModifyTablePayloadMeta,
  getNewlyMappedData,
  includeOnlyUnmappedData,
  getUnmappedData
} from "./common-mapping-functions";
import colours from "core/Styles/colours";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
const ModifyTable = forwardRef((props, ref) => {
  /**
   * State variables
   */
  const [modifyTableColumns, setmodifyTableColumns] = useState([]);
  const [defaultTableData, setdefaultTableData] = useState([]);
  const mappedFilterValues = { Mapped: "true", Unmapped: "false" };
  /**
   * Mounting Useeffect
   * On Mount - we are fetching values of modify table columns
   */
  useEffect(() => {
    const fetchInitialInfo = async () => {
      //on mount, get the columns of modify table
      let agGridcols = await getColumnsAg(
        `table_name=${props.screenName}_modify_table`
      )();
      /**
       * num_stores_mapped is of link type
       *
       * For Store Mapping
       * Once we get the columns for modify table, we add onclick method for num_stores_mapped column
       * Once we click on the link, we make the row object to selectedProductObjects and display dialog
       *
       * For Product Mapping
       * Once we get the columns for modify table, we add onclick method for num_products_mapped column
       * Once we click on the link, we make the row object to selectedStoreObjects and display dialog
       *
       */
      agGridcols = agGridcols.map((column) => {
        if (column.column_name === "num_stores_mapped") {
          column.onClick = (gridInstance) => {
            props.setselectedProductObjects(gridInstance.cellData.data);
            props.toggleTimeBoundDialogView(true);
          };
        }
        if (column.column_name === "num_products_mapped") {
          column.onClick = (gridInstance) => {
            props.setselectedStoreObjects(gridInstance.cellData.data);
            props.toggleTimeBoundDialogView(true);
          };
        }
        if (column.column_name === "is_mapped") {
          column.filter = "agSetColumnFilter";
          column.disabled = true;
          column.filterParams = {
            values: Object.keys(mappedFilterValues),
            suppressSelectAll: true,
          };
          column.cellRenderer = (params, extraProps) => {
            const updatedCellData = {
              ...params,
            };
            return (
              <CellRenderers
                cellData={updatedCellData}
                column={column}
                extraProps={extraProps}
                actions={null}
              ></CellRenderers>
            );
          };
        }
        return column;
      });
      setmodifyTableColumns(agGridcols);
    };
    fetchInitialInfo();
    return () => {
      //On unmount reset the table state ref to null
      ref.modifyTableRef.current = null;
    };
  }, []);

  //whenever there is change in editedAPI payload and filter dependency,
  //we add the state changes to table grid instance
  useEffect(() => {
    if (ref.modifyTableRef.current) {
      ref.modifyTableRef.current.api.editedAPIPayload = props.editedAPIPayload;
      ref.modifyTableRef.current.api.filterDependency = props.filterDependency;
      ref.modifyTableRef.current.api.selectedRefStore = props.selectedRefStore;
      ref.modifyTableRef.current.api.alignment = props.alignment;
      ref.modifyTableRef.current.api.editOrDeleteEditedAPIPayload =
        props.editOrDeleteEditedAPIPayload;
      ref.modifyTableRef.current.api.defaultTableData = defaultTableData;
    }
  }, [
    props.editedAPIPayload,
    props.filterDependency,
    props.selectedRefStore,
    props.alignment,
    props.editOrDeleteEditedAPIPayload,
    defaultTableData,
  ]);

  const formatStoreMappings = (
    selectedProductData,
    rowIndex,
    defaultProductsData
  ) => {
    const nodeId = props.isAggregated ? "article" : "product_code";
    let selectedProducts = cloneDeep(selectedProductData);
    const exisitingUnmappedStores = getExisitingUnmappedStores(
      props.selectedProducts,
      selectedProducts
    );
    //If the include unmapped is false and we map new stores in time bound dialog
    // We increment the num of stores mapped count in the table
    const currentProdEditedChanges = (
      ref.modifyTableRef.current.api.editedAPIPayload || props.editedAPIPayload
    ).filter((change) => change.product_code === selectedProducts[nodeId]);
    const currentProdEditDeleteChanges = (
      ref.modifyTableRef.current.api.editOrDeleteEditedAPIPayload ||
      props.editOrDeleteEditedAPIPayload
    ).filter((change) => change.product_code === selectedProducts[nodeId]);
    let newStores = [];
    let newlyUnmappedStores = [];

    let isIncludeUnmappedStatus = false;
    //We are adding new stores that are mapped newly. Once we add a new store, we push the object
    //to the productData(editedPayload)
    currentProdEditedChanges.forEach((change) => {
      if (change.include_unmapped || change.from_include_unmapped) {
        isIncludeUnmappedStatus = true;
        exisitingUnmappedStores.forEach((store) => {
          if (
            !(
              (change.edited_ids && change.edited_ids.includes(store)) ||
              (change.deleted_ids && change.deleted_ids.includes(store))
            )
          ) {
            newStores.push(store);
          }
        });
      }
      if (change.select.length > 0) newStores.push(change.select[0]);
      if (change.unselect.length > 0)
        newlyUnmappedStores.push(change.unselect[0]);
    });

    currentProdEditDeleteChanges.forEach((mapping) => {
      if (mapping.mappingsList.length === 0) {
        newlyUnmappedStores.push(mapping.store_code);
      }
    });
    // null check and update for mapped stores
    selectedProducts.mapped_stores = selectedProducts.mapped_stores
      ? selectedProducts.mapped_stores
      : [];
    //Get the unique list of already exisiting mapped stores in the api and newly mapped stores
    newStores = uniq([...selectedProducts.mapped_stores, ...newStores]);
    //remove null
    newStores = newStores.filter((store) => store);
    newlyUnmappedStores = uniq(newlyUnmappedStores);
    let totalCount = selectedProducts.num_stores_mapped.split("/")[1];
    //Get the new count
    let num_stores_mapped = newStores.length;
    let num_stores_unmapped = newlyUnmappedStores.length;
    selectedProducts.num_stores_mapped = `${
      num_stores_mapped - num_stores_unmapped
    }/${totalCount}`;
    if (num_stores_mapped - num_stores_unmapped === parseInt(totalCount)) {
      selectedProducts.include_unmapped = true;
      selectedProducts.is_calendar_disabled = !isIncludeUnmappedStatus;
    } else {
      selectedProducts.include_unmapped = false;
      selectedProducts.is_calendar_disabled = true;
    }
    if (selectedProducts[nodeId] in props.conflictObject) {
      selectedProducts.hasConflict = true;
    } else {
      selectedProducts.hasConflict = false;
    }
    return selectedProducts;
  };

  const formatProductMappings = (
    selectedStoresData,
    rowIndex,
    defaultStoresData
  ) => {
    let selectedStores = cloneDeep(selectedStoresData);
    //If the include unmapped is false and we map new products in time bound dialog
    // We increment the num of products mapped count in the table

    const currentStoreEditedChanges = (
      ref.modifyTableRef.current.api.editedAPIPayload || props.editedAPIPayload
    ).filter((change) => change.store_code === selectedStores.store_code);
    const currentStoreEditDeleteChanges = (
      ref.modifyTableRef.current.api.editOrDeleteEditedAPIPayload ||
      props.editOrDeleteEditedAPIPayload
    ).filter((change) => change.store_code === selectedStores.store_code);
    let newProducts = [];
    let newlyUnmappedProducts = [];
    //Get the existing unmapped products in DB by using mapped_products for the selected Row
    const exisitingUnmappedProducts = difference(
      props.selectedProducts.map((item) => item.product_code),
      selectedStores.mapped_products
    );
    let isIncludeUnmappedStatus = false;
    //We are adding new stores that are mapped newly. Once we add a new store, we push the object
    //to the productData(editedPayload)
    currentStoreEditedChanges.forEach((change) => {
      if (change.include_unmapped) {
        isIncludeUnmappedStatus = true;
        exisitingUnmappedProducts.forEach((prod) => {
          if (
            !(
              (change.edited_ids && change.edited_ids.includes(prod)) ||
              (change.deleted_ids && change.deleted_ids.includes(prod))
            )
          ) {
            newProducts.push(prod);
          }
        });
      }
      if (change.select.length > 0) newProducts.push(change.select[0]);
      if (change.unselect.length > 0)
        newlyUnmappedProducts.push(change.unselect[0]);
    });

    currentStoreEditDeleteChanges.forEach((mapping) => {
      if (mapping.mappingsList.length === 0) {
        newlyUnmappedProducts.push(mapping.product_code);
      }
    });

    //Get the unique list of already exisiting mapped stores in the api and newly mapped stores
    newProducts = uniq([...selectedStores.mapped_products, ...newProducts]);
    //remove null
    newProducts = newProducts.filter((product) => product);
    newlyUnmappedProducts = uniq(newlyUnmappedProducts);
    let totalCount = selectedStores.num_products_mapped.split("/")[1];
    //Get the new count
    let num_products_mapped = newProducts.length;
    let num_products_unmapped = newlyUnmappedProducts.length;
    selectedStores.num_products_mapped = `${
      num_products_mapped - num_products_unmapped
    }/${totalCount}`;
    if (num_products_mapped - num_products_unmapped === parseInt(totalCount)) {
      selectedStores.include_unmapped = true;
      selectedStores.is_calendar_disabled = !isIncludeUnmappedStatus;
    } else {
      selectedStores.include_unmapped = false;
      selectedStores.is_calendar_disabled = true;
    }
    if (selectedStores.store_code in props.conflictObject) {
      selectedStores.hasConflict = true;
    } else {
      selectedStores.hasConflict = false;
    }
    return selectedStores;
  };

  const onCloseTimeBoundDialog = () => {
    //Get the Selected Row Nodes
    const nodeId = props.isAggregated ? "article" : "product_code";
    let selectedRowNodes = ref.modifyTableRef.current.api.getRowNode(
      props.screenName === "store_mapping"
        ? props.selectedProductObjects[nodeId]
        : props.selectedStoreObjects.store_code
    );
    if (!selectedRowNodes) {
      return;
    }
    if (props.screenName === "store_mapping") {
      selectedRowNodes.data = formatStoreMappings(
        selectedRowNodes.data,
        selectedRowNodes.rowIndex,
        defaultTableData
      );
      const selectedRowObjects = ref.modifyTableRef.current.api.getSelectedRows();
      if (selectedRowObjects.length > 0) {
        props.setselectedProductObjects(selectedRowObjects);
      } else {
        props.setselectedProductObjects([]);
      }
    } else {
      selectedRowNodes.data = formatProductMappings(
        selectedRowNodes.data,
        selectedRowNodes.rowIndex,
        defaultTableData
      );
      const selectedRowObjects = ref.modifyTableRef.current.api.getSelectedRows();
      if (selectedRowObjects.length > 0) {
        props.setselectedStoreObjects(selectedRowObjects);
      } else {
        props.setselectedStoreObjects([]);
      }
    }
    //Redraw rows will be reinsert the new DOM element for the selected row by removing the exisiting one
    ref.modifyTableRef.current.api.redrawRows({ rowNodes: selectedRowNodes });
  };

  useEffect(() => {
    //Once we close the timeboundDialog,
    //whenever there is change in the edited changes, we reverify the rows
    if (
      !props.displayTimeBoundMappingDialog &&
      ref.modifyTableRef.current !== null
    ) {
      onCloseTimeBoundDialog();
    }
  }, [props.displayTimeBoundMappingDialog]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    props.setloader(true);
    let body = {};
    let refStoreCount = 0;
    if (manualbody.search.length > 0) {
      manualbody.search = manualbody.search.map((item) => {
        if (item.column === "is_mapped") {
          item.pattern = !isEmpty(item.pattern)
            ? mappedFilterValues[item.pattern[0]]
            : "";
          item.type = "bool";
        }
        return item;
      });
    }
    let meta = manualbody
      ? { ...manualbody }
      : {
          range: [],
          sort: [],
          search: [],
        };
    body = getModifyTablePayloadMeta(
      props.filterDependency || [],
      props.selectedDimension,
      props.selectedProducts,
      params,
      pageIndex,
      meta
    );

    const response = await props.updateProductsData(
      body,
      pageIndex,
      params.api.alignment,
      params.api.selectedRefStore,
      refStoreCount
    );
    //Declare default data - Default data is used while mapping and unmapping
    let defaultData = params?.api?.defaultTableData || [];
    //If default Data's length is empty, we initialize a new array of table total size with null as default value
    if (defaultData.length === 0) {
      defaultData = Array(response.total).fill(null);
    }
    //replace the table data at their respective indexes and replace with the data from the api
    defaultData.splice(pageIndex * 10, response.data.length, ...response.data);
    let formattedData = cloneDeep(response.data);

    //set it to the defaultTableData state variable
    setdefaultTableData(cloneDeep(defaultData));
    if (props.screenName === "store_mapping") {
      formattedData = response.data.map((eachProduct, index) => {
        return formatStoreMappings(eachProduct, index, response.data);
      });
    } else {
      formattedData = response.data.map((eachStore, index) => {
        return formatProductMappings(eachStore, index, response.data);
      });
    }
    return {
      data: formattedData,
      totalCount: response.total,
    };
  };

  /**
   *
   * @param {*} params
   * This function is called whenever there is change in cell values
   * For example, we toggle the mapped stores
   * 
   * For the API payload, we have three cases
      1. Mapping a new product/store
        => {
             store_code || product_code: <store Code> || <product_code>,
             include_unmapped: false,
             map: true,
             select: [ <Product-1>, <Product-2>.. || <Store-1>, <Store-2>..],
             unselect: [],
             valid_from: <Valid_From>,
             valid_to: <Valid_To>,
           }
      2. Including all unmapped products for the store/Product
        => {
             store_code || product_code: <Store Code> || <Product Code>,
             include_unmapped: true,
             map: true,
             select: [],
             unselect: [],
             valid_from: <Valid_From>,
             valid_to: <Valid_To>,
           }
      3. Unmapping/adding exception of products to the store/product
        => {
             store_code || product_code : <Store Code> || <Product Code>,
             include_unmapped: false,
             map: true,
             select: [],
             unselect: [<Product-1>, <Product-2>..., || <Store-1>, <Store-2>],
             valid_from: null,
             valid_to: null,
           }
   * 
   */
  const onCellValueChanged = (params) => {
    const { colDef, node, value, rowIndex } = params;
    // const selectedRowNodes = params.api.getRowNode(
    //   props.selectedProductObjects.product_code
    // );
    // //Get the existing unmapped stores in DB by using mapped_stores for the selected Row
    // const exisitingUnmappedStores = getExisitingUnmappedStores(
    //   props.selectedProducts,
    //   selectedRowNodes
    // );
    //If the value is no or undefined, we reset the data to old state
    const nodeId = props.isAggregated
      ? node.data.article
      : node.data.product_code;
    const num_mapped =
      props.screenName === "store_mapping"
        ? defaultTableData[rowIndex].num_stores_mapped?.split("/")[0]
        : defaultTableData[rowIndex].num_products_mapped?.split("/")[0];
    const num_total =
      props.screenName === "store_mapping"
        ? defaultTableData[rowIndex].num_stores_mapped?.split("/")[1]
        : defaultTableData[rowIndex].num_products_mapped?.split("/")[1];
    if (
      props.screenName === "store_mapping" &&
      colDef.column_name === "include_unmapped" &&
      (value === false || !value)
    ) {
      const oldCount = defaultTableData[rowIndex].num_stores_mapped.split(
        "/"
      )[0];
      const total = node.data.num_stores_mapped.split("/")[1];
      node.data.num_stores_mapped = `${oldCount}/${total}`;
      node.data.is_edit = false;
      node.data.is_calendar_disabled = true;
      node.data.add_icon = [null, null]; //add_icon is a calendar

      //Remove the already added, edited
      let newValues = props.editedAPIPayload.filter((item) => {
        return item.product_code !== nodeId;
      });
      node.data.disableApproveSelection = false;
      node.data.hasConflict = false;
      const updatedConflictObject = cloneDeep(props.conflictObject);
      delete updatedConflictObject[nodeId];
      props.updateConflictObject(updatedConflictObject);
      props.setEditedAPIPayload(generateUniqueEditedPayload(newValues));
    }

    //If value is no or undefined for product-mapping changes
    if (
      props.screenName === "product_mapping" &&
      colDef.column_name === "include_unmapped" &&
      (value === false || !value)
    ) {
      const oldCount = defaultTableData[rowIndex].num_products_mapped.split(
        "/"
      )[0];
      const total = node.data.num_products_mapped.split("/")[1];
      node.data.num_products_mapped = `${oldCount}/${total}`;
      node.data.is_edit = false;
      node.data.is_calendar_disabled = true;
      node.data.add_icon = [null, null]; //add_icon is a calendar
      //Remove the already added, edited
      let newValues = props.editedAPIPayload.filter(
        (item) => item.store_code !== node.data.store_code
      );
      node.data.disableApproveSelection = false;
      const updatedConflictObject = cloneDeep(props.conflictObject);
      delete updatedConflictObject[node.data.store_code];
      props.updateConflictObject(updatedConflictObject);
      props.setEditedAPIPayload(generateUniqueEditedPayload(newValues));
    }

    //If the value is yes, we are making the total count for that respective node
    if (
      props.screenName === "store_mapping" &&
      colDef.column_name === "include_unmapped" &&
      value === true
    ) {
      let newValues = cloneDeep(props.editedAPIPayload);
      //Exclude the newly unmapping payload objects
      newValues = newValues.filter(
        (apiPayloadObject) =>
          !(
            apiPayloadObject.product_code === nodeId &&
            apiPayloadObject.unselect.length > 0
          )
      );
      //Check if there are any newly mapping that were made from the individual
      //view flow - If yes, only include data which is not mapped
      let newlyMappedValues = getNewlyMappedData(newValues, node);
      if (newlyMappedValues.length > 0) {
        //This will get the remaining data after newly mapped values are removed
        //and it will include those stores/products only
        //So we don't have include_unmapped true object
        newValues = includeOnlyUnmappedData(
          node,
          props.selectedProducts,
          newlyMappedValues,
          newValues,
          props.screenName
        );
      } else {
        let body = {
          product_code: nodeId,
          include_unmapped: true,
          map: true,
          select: [],
          unselect: [],
          valid_from: moment().format("YYYY-MM-DD"),
          valid_to: END_DATE,
          edited_ids: [],
          deleted_ids: [],
          mapped_stores: node.data.mapped_stores,
        };
        const isIncludeUnmappedAlreadyExist = newValues.findIndex(
          (val) => val.include_unmapped === true && val.product_code === nodeId
        );
        if (isIncludeUnmappedAlreadyExist > -1) {
          body.edited_ids = newValues[isIncludeUnmappedAlreadyExist].edited_ids;
          newValues.splice(isIncludeUnmappedAlreadyExist, 1);
        }
        newValues.push(body);
      }
      const total = node.data.num_stores_mapped.split("/")[1];
      node.data.num_stores_mapped = `${total}/${total}`;
      node.data.is_edit = true;
      node.data.newDates = [];
      node.data.is_calendar_disabled = false;
      node.data.add_icon = [moment(), moment(END_DATE, "YYYY-MM-DD")];

      props.setEditedAPIPayload(generateUniqueEditedPayload(newValues));
    }

    //If the value is yes, we are making the total count for that respective node
    if (
      props.screenName === "product_mapping" &&
      colDef.column_name === "include_unmapped" &&
      value === true
    ) {
      let newValues = cloneDeep(props.editedAPIPayload);
      //Exclude the newly unmapping payload objects
      newValues = newValues.filter(
        (apiPayloadObject) =>
          !(
            apiPayloadObject.store_code === node.data.store_code &&
            apiPayloadObject.unselect.length > 0
          )
      );
      //Check if there are any newly mapping that were made from the individual
      //view flow - If yes, only include data which is not mapped
      let newlyMappedValues = getNewlyMappedData(
        newValues,
        node,
        "product_mapping"
      );
      if (newlyMappedValues.length > 0) {
        //This will get the remaining data after newly mapped values are removed
        //and it will include those stores/products only
        //So we don't have include_unmapped true object
        newValues = includeOnlyUnmappedData(
          node,
          props.selectedProducts,
          newlyMappedValues,
          newValues,
          props.screenName
        );
      } else {
        let body = {
          store_code: node.data.store_code,
          include_unmapped: true,
          map: true,
          select: [],
          unselect: [],
          valid_from: moment().format("YYYY-MM-DD"),
          valid_to: END_DATE,
          edited_ids: [],
          deleted_ids: [],
          mapped_products: node.data.mapped_products,
        };
        const isIncludeUnmappedAlreadyExist = newValues.findIndex(
          (val) =>
            val.include_unmapped === true &&
            val.store_code === node.data.store_code
        );
        if (isIncludeUnmappedAlreadyExist > -1) {
          body.edited_ids = newValues[isIncludeUnmappedAlreadyExist].edited_ids;
          newValues.splice(isIncludeUnmappedAlreadyExist, 1);
        }
        newValues.push(body);
      }

      const total = node.data.num_products_mapped.split("/")[1];
      node.data.num_products_mapped = `${total}/${total}`;
      node.data.is_edit = true;
      node.data.newDates = [];
      node.data.is_calendar_disabled = false;
      node.data.add_icon = [moment(), moment(END_DATE, "YYYY-MM-DD")];
      props.setEditedAPIPayload(generateUniqueEditedPayload(newValues));
    }

    //If the value is no and old state is already completely mapped
    if (
      colDef.column_name === "include_unmapped" &&
      value === false &&
      num_mapped === num_total
    ) {
      const newValues = (() => {
        if (props.screenName === "store_mapping") {
          node.data.num_stores_mapped = `0/${num_total}`;
          return getUnmappedData(
            props.screenName,
            nodeId,
            node.data.mapped_stores
          );
        } else {
          node.data.num_products_mapped = `0/${num_total}`;
          return getUnmappedData(
            props.screenName,
            node.data.store_code,
            node.data.mapped_products
          );
        }
      })();

      node.data.disableApproveSelection = false;
      node.data.hasConflict = false;
      node.data.is_calendar_disabled = true;
      node.data.add_icon = [null, null]; //add_icon is a calendar
      const updatedConflictObject = cloneDeep(props.conflictObject);
      delete updatedConflictObject[nodeId];
      props.updateConflictObject(updatedConflictObject);
      props.setEditedAPIPayload(
        generateUniqueEditedPayload([...props.editedAPIPayload, ...newValues])
      );
    }

    //If the value is yes and old state is already completely mapped
    if (
      props.screenName === "store_mapping" &&
      colDef.column_name === "include_unmapped" &&
      value === true &&
      num_mapped === num_total
    ) {
      let updatedPayload = cloneDeep(props.editedAPIPayload);
      updatedPayload = updatedPayload.filter(
        (item) =>
          item.product_code !== nodeId ||
          (item.product_code === nodeId && item.unselect.length === 0)
      );
      const updatedEditDelPayload = cloneDeep(
        props.editOrDeleteEditedAPIPayload
      ).filter((item) => {
        return item.product_code != nodeId;
      });
      props.setEditedAPIPayload(generateUniqueEditedPayload(updatedPayload));
      props.seteditOrDeleteEditedAPIPayload(updatedEditDelPayload);
      const totalSelectedStoresToModifyCount = node.data.num_stores_mapped.split(
        "/"
      )[1];
      node.data.num_stores_mapped = `${totalSelectedStoresToModifyCount}/${totalSelectedStoresToModifyCount}`;
      node.data.is_calendar_disabled = true;
    }
    //If the value is yes and old state is already completely mapped
    if (
      props.screenName === "product_mapping" &&
      colDef.column_name === "include_unmapped" &&
      value === true &&
      num_mapped === num_total
    ) {
      let updatedPayload = cloneDeep(props.editedAPIPayload);
      updatedPayload = updatedPayload.filter(
        (item) =>
          item.store_code !== node.data.store_code ||
          (item.store_code === node.data.store_code &&
            item.unselect.length === 0)
      );
      const updatedEditDelPayload = cloneDeep(
        props.editOrDeleteEditedAPIPayload
      ).filter((item) => {
        return item.store_code != node.data.store_code;
      });
      props.setEditedAPIPayload(generateUniqueEditedPayload(updatedPayload));
      props.seteditOrDeleteEditedAPIPayload(updatedEditDelPayload);
      const totalSelectedProductsToModifyCount = node.data.num_products_mapped.split(
        "/"
      )[1];
      node.data.num_products_mapped = `${totalSelectedProductsToModifyCount}/${totalSelectedProductsToModifyCount}`;
      node.data.is_calendar_disabled = true;
    }
    //Redrawing the whole row and replacing the DOM using redraw nodes
    params.api.redrawRows({ rowNodes: [node] });
  };

  const onApplyCalendarDates = (gridInstance, datesArray) => {
    const { node } = gridInstance;
    const index = findIndex(gridInstance.api.editedAPIPayload, function (item) {
      return (
        item[
          props.screenName === "store_mapping" ? "product_code" : "store_code"
        ] ===
          node.data[
            props.screenName === "store_mapping" ? "product_code" : "store_code"
          ] && item.include_unmapped
      );
    });
    let updatedMappedValues = cloneDeep(gridInstance.api.editedAPIPayload);
    if (index > -1) {
      updatedMappedValues[index].valid_from = datesArray[0].format(
        "YYYY-MM-DD"
      );
      updatedMappedValues[index].valid_to = datesArray[1].format("YYYY-MM-DD");
      props.setEditedAPIPayload(
        generateUniqueEditedPayload(updatedMappedValues)
      );
    } else {
      //If the individual mapping objects are created from include unmapped flow
      //Based on from_include_unmapped flow, we are fetching those values
      const added_from_include_unmapped = updatedMappedValues
        .filter((changeObj) => {
          return (
            changeObj[
              props.screenName === "store_mapping"
                ? "product_code"
                : "store_code"
            ] ===
              node.data[
                props.screenName === "store_mapping"
                  ? "product_code"
                  : "store_code"
              ] &&
            !changeObj.include_unmapped &&
            changeObj?.from_include_unmapped
          );
        })
        .map((item) => updatedMappedValues.indexOf(item));
      if (added_from_include_unmapped.length) {
        //Updating those object dates
        added_from_include_unmapped.forEach((eachIndex) => {
          updatedMappedValues[eachIndex].valid_from = datesArray[0].format(
            "YYYY-MM-DD"
          );
          updatedMappedValues[eachIndex].valid_to = datesArray[1].format(
            "YYYY-MM-DD"
          );
        });
        props.setEditedAPIPayload(
          generateUniqueEditedPayload(updatedMappedValues)
        );
      }
    }
  };

  const onSelectionChanged = (event) => {
    const selectedRowObjects = event.api.getSelectedRows();
    if (props.displayTimeBoundMappingDialog) {
      //If the dialog is open, but after bulk edit we reload the table instance
      return;
    }
    props.screenName === "store_mapping"
      ? props.setselectedProductObjects(selectedRowObjects)
      : props.setselectedStoreObjects(selectedRowObjects);
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
      {modifyTableColumns.length > 0 && (
        <AgGridTable
          columns={modifyTableColumns}
          selectAllHeaderComponent={true}
          sizeColumnsToFitFlag
          onGridChanged
          onRowSelected
          manualCallBack={(body, pageIndex, params) =>
            manualCallBack(body, pageIndex, params)
          }
          onCellValueChanged={onCellValueChanged}
          rowModelType="serverSide"
          serverSideStoreType="partial"
          cacheBlockSize={10}
          uniqueRowId={
            props.isAggregated
              ? "article"
              : props.screenName === "store_mapping"
              ? "product_code"
              : "store_code"
          }
          onApplyCalendarDates={onApplyCalendarDates}
          loadTableInstance={(gridInstance) => {
            ref.modifyTableRef.current = gridInstance;
          }}
          onSelectionChanged={onSelectionChanged}
          getRowStyle={getRowStyle}
        />
      )}
    </>
  );
});

export default ModifyTable;
