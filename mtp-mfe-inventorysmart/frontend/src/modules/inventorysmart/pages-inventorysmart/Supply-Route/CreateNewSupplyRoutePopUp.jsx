import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Grid,
  IconButton,
  Typography,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useMemo, useRef, useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";
import Loader from "core/Utils/Loader/loader";
import { Box, height } from "@mui/system";
import { connect } from "react-redux";
import { useTranslation } from "impact-ui-v3";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import {
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getDc,
  getStore,
  getStoreGroup,
  getStoreListFromStoreGroup,
  resetSupplyRouteState,
  getCreateSupplyRouteTableConfig,
  saveSupplyRoute
} from "modules/inventorysmart/services-inventorysmart/Suply-Routes/supply-routes-service";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import classNames from "classnames";
import Form from "core/Utils/form";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";

const useStyles = makeStyles(() => ({
  root: {
    "& .MuiDialog-paperWidthSm": {
      maxWidth: "50rem",
      borderRadius: "0.8rem",
    },
  },
  button: {
    height: "20%",
    marginTop: "1.5rem"
  }
}));

var skuIdSelectArray = [
  { label: "Vendor-DC", value: "Vendor-DC" },
  { label: "DC-DC", value: "DC-DC" },
  { label: "DC-Store", value: "DC-Store" },
  { label: "Store-Store", value: "Store-Store" },
];

var DestinationNodeArray = [
  { label: "store", value: "store" },
  { label: "store Group", value: "store Group" },
];
var SourceNodeArray = [
  { label: "store", value: "store" },
  { label: "store Group", value: "store Group" },
];

const SupplyRouteTypeFields = [
  {
    accessor: "supply_route_type",
    field_type: "dropdown",
    label: "Select Supply Route Type",
    required: true,
    options: skuIdSelectArray,
    isMulti: false,
    isSearchable: false,
    isClearable: true,
  },
  {
    accessor: "source_node",
    field_type: "dropdown",
    label: "Source Node",
    required: true,
    options: [],
    isMulti: true,
    isSearchable: true,
    isClearable: true,
  },
  {
    accessor: "destination_node",
    field_type: "dropdown",
    label: "Destination Node",
    required: true,
    options: [],
    isMulti: true,
    isSearchable: true,
    isClearable: true,
  },
];

var sourceNodeData = [
  { label: "V1", value: "V1" },
  { label: "V2", value: "V2" },
];

const CreateNewSupplyRoutePopUp = (props) => {
  const { t } = useTranslation();
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [formData, setFormData] = useState({});
  const [field, setField] = useState(SupplyRouteTypeFields);
  const [loader, setLoader] = useState(false);
  const [defaultValues, setDefaultValues] = useState({
    destination_node_toggle: "store",
    source_node_toggle: "store",
  })
  const [supplyRouteTableData, setSupplyRouteTableData] = useState([])
  const [supplyRouteTableColumns, setSupplyRouteTableColumns] = useState([])
  const [tableLoader, setTableLoader] = useState(false)
  const [supplyRouteType,setSupplyRouteType] = useState()


  const onCancel = () => {
   let reset =  SupplyRouteTypeFields.map(item=>{
      if(item.accessor == "source_node")
      {
        item.options = []
      }
      if(item.accessor == "destination_node")
      {
        item.options =[]
      }
    })
    setField(reset);
    props?.setShowSetAllModal(false);
  };

  const generateDropDownOptions = (dropDownValues) => {
    return (
      dropDownValues?.length &&
      dropDownValues.map((obj) => {
        return {
          value: obj?.dc_code || obj?.store_name || obj?.sg_code,
          label: obj?.dc_name || obj?.store_code || obj?.name,
          id: obj?.dc_code || obj?.store_name || obj?.sg_code,
        };
      })
    );
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleChange = async (data, id, formField, e) => {
    setFormData(data);
    //setDefaultValues(data)
    if (id === "supply_route_type") {
      if (data?.supply_route_type === "Vendor-DC") {
        setLoader(true);
        let dcResponse = await props.getDc();
        let dcData = generateDropDownOptions(dcResponse?.data?.data);
        let newField = field.filter(
          (item) =>
            item.accessor !== "source_node_toggle" &&
            item.accessor !== "destination_node_toggle"
        );
        newField.map((item) => {
          if (item.accessor === "source_node") {
            item.options = sourceNodeData;
          }
          if (item.accessor === "destination_node") {
            item.options = dcData;
          }
        });
        setLoader(false);
        setField(newField);
        setDefaultValues({
          ...data,
          source_node: [],
          destination_node: []
        })
      }
      if (data?.supply_route_type === "DC-DC") {
        setLoader(true);
        let dcResponse = await props.getDc();
        let dcData = generateDropDownOptions(dcResponse?.data?.data);
        let newField = field.filter(
          (item) =>
            item.accessor !== "source_node_toggle" &&
            item.accessor !== "destination_node_toggle"
        );
        newField.map((item) => {
          if (item.accessor === "source_node") {
            item.options = dcData;
          }
          if (item.accessor === "destination_node") {
            item.options = dcData;
          }
        });
        setField(newField);
        setDefaultValues({
          ...data,
          source_node: [],
          destination_node: []
        })
        setLoader(false);
      }
      if (data?.supply_route_type === "DC-Store") {
        setLoader(true);
        let dcResponse = await props.getDc();
        let postBody = {
          filters: [],
          meta: {
            search: [],
            range: [],
            sort: [],
          },
        };
        let storeResponse = await props.getStore(postBody);
        let dcData = generateDropDownOptions(dcResponse?.data?.data);
        let storeData = generateDropDownOptions(storeResponse?.data?.data);
        let newField = field.filter(
          (item) => item.accessor !== "source_node_toggle"
        );
        let contains = field.filter(
          (item) => item.accessor === "destination_node_toggle"
        );
        if (!contains?.length) {
          newField.push({
            accessor: "destination_node_toggle",
            field_type: "toggle",
            label: "Destination Node",
            options: DestinationNodeArray,
          });
        }
        newField.map((item) => {
          if (item.accessor === "source_node") {
            item.options = dcData;
          }
          if (item.accessor === "destination_node") {
            item.options = storeData;
          }
        });
        setLoader(false);
        setDefaultValues({
          ...data,
          source_node: [],
          destination_node: []
        })
        setField(newField);
      }
      if (data?.supply_route_type === "Store-Store") {
        setLoader(true);
        let postBody = {
          filters: [],
          meta: {
            search: [],
            range: [],
            sort: [],
          },
        };
        let storeResponse = await props.getStore(postBody);
        let storeData = generateDropDownOptions(storeResponse?.data?.data);
        let newField = field.filter((item) => item)
        let contains = field.filter(
          (item) => item.accessor === "destination_node_toggle"
        );
        newField.splice(2, 0, {
          accessor: "source_node_toggle",
          field_type: "toggle",
          label: "Source Node",
          options: SourceNodeArray,
        });
        if (!contains?.length) {
          newField.splice(4, 0, {
            accessor: "destination_node_toggle",
            field_type: "toggle",
            label: "Destination Node",
            options: DestinationNodeArray,
          });
        }
        newField.map((item) => {
          if (item.accessor === "source_node") {
            item.options = storeData;
          }
          if (item.accessor === "destination_node") {
            item.options = storeData;
          }
        });
        setLoader(false);
        setDefaultValues({
          ...data,
          source_node: [],
          destination_node: []
        })
        setField(newField);
      }
    }
    if (id === "destination_node_toggle") {
      setLoader(true);
      if (data?.destination_node_toggle === "store Group") {
        let storeGroupResponse = await props.getStoreGroup();
        let storeGroupData = generateDropDownOptions(
          storeGroupResponse?.data?.data
        );
        field.map((item) => {
          if (item.accessor === "destination_node") {
            item.options = storeGroupData;
          }
        });
      } else if (data?.destination_node_toggle === "store") {
        let postBody = {
          filters: [],
          meta: {
            search: [],
            range: [],
            sort: [],
          },
        };
        let storeResponse = await props.getStore(postBody);
        let storeData = generateDropDownOptions(storeResponse?.data?.data);
        field.map((item) => {
          if (item.accessor === "destination_node") {
            item.options = storeData;
          }
        });
      }
      setLoader(false);
      setField(field);
    }
    if (id === "source_node_toggle") {
      setLoader(true);
      if (data?.source_node_toggle === "store Group") {
        let storeGroupResponse = await props.getStoreGroup();
        let storeGroupData = generateDropDownOptions(
          storeGroupResponse?.data?.data
        );
        field.map((item) => {
          if (item.accessor === "source_node") {
            item.options = storeGroupData;
          }
        });
      } else if (data?.source_node_toggle === "store") {
        let postBody = {
          filters: [],
          meta: {
            search: [],
            range: [],
            sort: [],
          },
        };
        let storeResponse = await props.getStore(postBody);
        let storeData = generateDropDownOptions(storeResponse?.data?.data);
        field.map((item) => {
          if (item.accessor === "source_node") {
            item.options = storeData;
          }
        });
      }
      setLoader(false);
      setField(field);
    }
  };

  const handleGenerateSupplyRouteData = async() => {
    let data = []
    setSupplyRouteTableData([])
    setSupplyRouteType(formData?.supply_route_type)
    if (Object.keys(formData).length === 0) {
      setTableLoader(false);
      displaySnackMessages(t("inventorysmart.selectRequiredFields"), "error");
    } else {
      if (
        formData?.destination_node === undefined ||
        formData?.destination_node?.length === 0
      ) {
        setTableLoader(false);
        displaySnackMessages(t("inventorysmart.selectRequiredFields"), "error");
      }
      if (
        formData?.source_node === undefined ||
        formData?.source_node?.length === 0
      ) {
        setTableLoader(false);
        displaySnackMessages(t("inventorysmart.selectRequiredFields"), "error");
      }
      if (formData?.supply_route_type === "Vendor-DC") {
        setTableLoader(true);
        for (var i = 0; i < formData?.source_node_options?.length; i++) {
          for (var j = 0; j < formData?.destination_node_options.length; j++) {
            data.push({
              supply_route_id : formData?.source_node_options?.[i]?.value + "_" + formData?.destination_node_options?.[j]?.value,
              supply_route_name: formData?.source_node_options?.[i]?.label + "_" + formData?.destination_node_options?.[j]?.label,
              source: formData?.source_node_options?.[i]?.label,
              source_id: formData?.source_node_options?.[i]?.value,
              destination: formData?.destination_node_options?.[j]?.label,
              destination_id: formData?.destination_node_options?.[j]?.value,
            })

          }
        }
        setSupplyRouteTableData(data)
        setTableLoader(false)
      }
      if (formData?.supply_route_type === "DC-Store" && formData?.destination_node_toggle === "store") {
        setTableLoader(true)
        for (var i = 0; i < formData?.source_node_options?.length; i++) {
          for (var j = 0; j < formData?.destination_node_options.length; j++) {
            data.push({
              supply_route_id : formData?.source_node_options?.[i]?.value + "_" + formData?.destination_node_options?.[j]?.label,
              supply_route_name: formData?.source_node_options?.[i]?.label + "_" + formData?.destination_node_options?.[j]?.value,
              source: formData?.source_node_options?.[i]?.label,
              source_id: formData?.source_node_options?.[i]?.value,
              destination: formData?.destination_node_options?.[j]?.value,
              destination_id: formData?.destination_node_options?.[j]?.label,
            })

          }
        }
        setSupplyRouteTableData(data)
        setTableLoader(false)
      }
      if(formData?.supply_route_type === "DC-DC")
      {
        for (var i = 0; i < formData?.source_node_options.length; i++) {
          for (var j = 0; j < formData?.destination_node_options.length; j++) {
            if (formData?.source_node_options?.[i]?.value !== formData?.destination_node_options?.[j]?.value)
            {
              data.push({
                supply_route_id : formData?.source_node_options?.[i]?.value + "_" + formData?.destination_node_options?.[j]?.value,
                supply_route_name: formData?.source_node_options?.[i]?.label + "_" + formData?.destination_node_options?.[j]?.label,
                source: formData?.source_node_options?.[i]?.label,
                source_id: formData?.source_node_options?.[i]?.value,
                destination: formData?.destination_node_options?.[j]?.label,
                destination_id: formData?.destination_node_options?.[j]?.value,
              });
            } else {
              displaySnackMessages(
                t("inventorysmart.sameSourceAndDestination"),
                "info"
              );
            }

          }
        }
        setSupplyRouteTableData(data)
        setTableLoader(false)
      }
      if ((formData?.supply_route_type === "Store-Store" && formData?.destination_node_toggle === "store" && formData?.source_node_toggle === "store")) {
        for (var i = 0; i < formData?.source_node_options.length; i++) {
          for (var j = 0; j < formData?.destination_node_options.length; j++) {
            if (formData?.source_node_options?.[i]?.value !== formData?.destination_node_options?.[j]?.value)
              data.push({
                supply_route_id : formData?.source_node_options?.[i]?.label + "_" + formData?.destination_node_options?.[j]?.label,
                supply_route_name: formData?.source_node_options?.[i]?.value + "_" + formData?.destination_node_options?.[j]?.value,
                source: formData?.source_node_options?.[i]?.value,
                source_id: formData?.source_node_options?.[i]?.label,
                destination: formData?.destination_node_options?.[j]?.value,
                destination_id: formData?.destination_node_options?.[j]?.label,
              })

          }
        }
        setSupplyRouteTableData(data)
        setTableLoader(false)
      }
      if (formData?.supply_route_type === "DC-Store" && formData?.destination_node_toggle === "store Group") {
        setTableLoader(true)
        let sgCode = formData?.destination_node_options.map((item)=>{
          return item.value
        })
        let payload ={
          sg_codes: sgCode
        }
        let storeListData = await props.getStoreListFromStoreGroup(payload)
        if(storeListData?.data?.status)
        {
          if(storeListData?.data?.data.length !== 0)
          {
          for (var i = 0; i < formData?.source_node_options.length; i++) {
            for (var j = 0; j < storeListData?.data?.data.length; j++) {
              data.push({
                supply_route_id : formData?.source_node_options?.[i]?.value + "_" + storeListData?.data?.data[j]?.store_code,
                supply_route_name: formData?.source_node_options?.[i]?.label + "_" + storeListData?.data?.data[j]?.store_name,
                source: formData?.source_node_options?.[i]?.label,
                source_id: formData?.source_node_options?.[i]?.value,
                destination: storeListData?.data?.data[j]?.store_name,
                destination_id: storeListData?.data?.data[j]?.store_code,
              })
              }
            }
            setSupplyRouteTableData(data);
            setTableLoader(false);
          } else {
            setSupplyRouteTableData([]);
            displaySnackMessages(t("inventorysmart.noData"), "error");
            setTableLoader(false);
          }
        } else {
          displaySnackMessages(t("inventorysmart.somethingWentWrong"), "error");
          setTableLoader(false);
          setSupplyRouteTableData([]);
        }
      }
      if (
        formData?.supply_route_type === "Store-Store" &&
        formData?.destination_node_toggle === "store Group" &&
        formData?.source_node_toggle === "store"
      ) {
        setTableLoader(true);
        let sgCode = formData?.destination_node_options.map((item) => {
          return item.value;
        });
        let payload = {
          sg_codes: sgCode,
        };
        let storeListData = await props.getStoreListFromStoreGroup(payload);
        if (storeListData?.data?.status) {
          if (storeListData?.data?.data.length !== 0) {
            for (var i = 0; i < formData?.source_node_options.length; i++) {
              for (var j = 0; j < storeListData?.data?.data.length; j++) {
                if (
                  formData?.source_node_options?.[i]?.value !==
                  storeListData?.data?.data[j]?.store_code
                )
                  data.push({
                    supply_route_id:
                      formData?.source_node_options?.[i]?.value +
                      "_" +
                      storeListData?.data?.data[j]?.store_code,
                    supply_route_name:
                      formData?.source_node_options?.[i]?.label +
                      "_" +
                      storeListData?.data?.data[j]?.store_name,
                    source: formData?.source_node_options?.[i]?.label,
                    source_id: formData?.source_node_options?.[i]?.value,
                    destination: storeListData?.data?.data[j]?.store_name,
                    destination_id: storeListData?.data?.data[j]?.store_code,
                  });
              }
            }
            setSupplyRouteTableData(data);
            setTableLoader(false);
          } else {
            setSupplyRouteTableData([]);
            displaySnackMessages(t("inventorysmart.noData"), "error");
            setTableLoader(false);
          }
        } else {
          displaySnackMessages(t("inventorysmart.somethingWentWrong"), "error");
          setTableLoader(false);
          setSupplyRouteTableData([]);
        }
      }
      if (formData?.supply_route_type === "Store-Store" && formData?.destination_node_toggle === "store" && formData?.source_node_toggle === "store Group") {
        setTableLoader(true)
        let sgCode = formData?.source_node_options.map((item)=>{
          return item.value
        })
        let payload ={
          sg_codes: sgCode
        }
        let storeListData = await props.getStoreListFromStoreGroup(payload)
        if(storeListData?.data?.status)
        {
          if(storeListData?.data?.data.length !== 0)
          {
          for (var i = 0; i < formData?.destination_node_options.length; i++) {
            for (var j = 0; j < storeListData?.data?.data.length; j++) {
              if (formData?.destination_node_options?.[i]?.value !== storeListData?.data?.data[j]?.store_code)
              data.push({
                supply_route_id :  storeListData?.data?.data[j]?.store_code + "_" + formData?.source_node_options?.[i]?.value,
                supply_route_name: storeListData?.data?.data[j]?.store_name+ "_" + formData?.destination_node_options?.[i]?.label,
                source: storeListData?.data?.data[j]?.store_name,
                source_id: storeListData?.data?.data[j]?.store_code,
                destination: formData?.destination_node_options?.[i]?.label,
                destination_id: formData?.source_node_options?.[i]?.value,
              })
              }
            }
            setSupplyRouteTableData(data);
            setTableLoader(false);
          } else {
            setSupplyRouteTableData([]);
            displaySnackMessages(t("inventorysmart.noData"), "error");
            setTableLoader(false);
          }
        } else {
          displaySnackMessages(t("inventorysmart.somethingWentWrong"), "error");
          setTableLoader(false);
          setSupplyRouteTableData([]);
        }
      }
      if (formData?.supply_route_type === "Store-Store" && formData?.destination_node_toggle === "store Group" && formData?.source_node_toggle === "store Group") {
        setTableLoader(true)
        let sourceSgCode = formData?.source_node_options.map((item)=>{
          return item.value
        })
        let sourcePayload ={
          sg_codes: sourceSgCode
        }
        let destinationSgCode = formData?.destination_node_options.map((item)=>{
          return item.value
        })
        let destinationPayload ={
          sg_codes: destinationSgCode
        }

        let SourceStoreListData = await props.getStoreListFromStoreGroup(sourcePayload)
        let DestinationStoreListData = await props.getStoreListFromStoreGroup(destinationPayload)
        if(SourceStoreListData?.data?.status && DestinationStoreListData?.data?.status)
        {
            if(SourceStoreListData?.data?.data.length!==0 && DestinationStoreListData?.data?.data.length!==0 )
            {
              for (var i = 0; i < SourceStoreListData?.data?.data?.length; i++) {
                for (var j = 0; j < DestinationStoreListData?.data?.data.length; j++) {
                  if (SourceStoreListData.data?.data[i]?.store_code !== DestinationStoreListData?.data?.data[j]?.store_code)
                  data.push({
                    supply_route_id :  SourceStoreListData.data?.data?.[i]?.store_code + "_" + DestinationStoreListData?.data?.data[j]?.store_code,
                    supply_route_name: SourceStoreListData.data?.data?.[i]?.store_name + "_" + DestinationStoreListData?.data?.data[j]?.store_name,
                    destination: DestinationStoreListData?.data?.data[j]?.store_name,
                    source_id: SourceStoreListData.data?.data?.[i]?.store_code,
                    source: SourceStoreListData.data?.data?.[i]?.store_name,
                    destination_id:
                      DestinationStoreListData?.data?.data[j]?.store_code,
                  });
              }
            }
            setSupplyRouteTableData(data);
            setTableLoader(false);
          } else {
            setSupplyRouteTableData([]);
            displaySnackMessages(t("inventorysmart.noData"), "error");
            setTableLoader(false);
          }
        } else {
          displaySnackMessages(t("inventorysmart.somethingWentWrong"), "error");
          setTableLoader(false);
          setSupplyRouteTableData([]);
        }
      }
    }

  }

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await props.getCreateSupplyRouteTableConfig()
        if (response?.data?.status) {
          let formattedColumns = agGridColumnFormatter(response?.data?.data);
          setSupplyRouteTableColumns(formattedColumns)
        }

      } catch (error) {

        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();;
    return () => {
      props.resetSupplyRouteState();
    };
  }, []);


  const STORE_SETALL_FIELDS = useMemo(() => field, [
    field,
  ]);

  const handleSaveButton =async()=>{
    let data = supplyRouteTableData?.map((item)=>{
     return {
      supply_route_id :  item?.supply_route_id,
      supply_route_name : item?.supply_route_name,
      destination_name : item?.destination,
      source_id : item?.source_id,
      source_name : item?.source,
      destination_id : item?.destination_id
     }
    })
    try{
    let payloadData = {
        data,
        supply_route_type: supplyRouteType,
      };
      let saveSupplyRouteData = await props.saveSupplyRoute(payloadData);
      if (saveSupplyRouteData?.data?.status) {
        displaySnackMessages(t("inventorysmart.saved"), "success");
        setField(SupplyRouteTypeFields);
        props?.setShowSetAllModal(false);
        props?.setrenderAgGrid(true);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  console.log('ss123',field)

  return (
    <Dialog
      //onClose={() => onCancel()}
      className={classes.root}
      maxWidth={"70%"}
      aria-labelledby="customized-dialog-title"
      open={true}
      fullWidth={true}
      style={{ background: "rgba(90, 90, 90, 0.5)" }}
      disableEscapeKeyDown={true}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            Create New Supply-Route
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => onCancel()}
            size="large"
          >
            <CloseIcon />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent style={{ height: "900px", overflow: "revert" }} >
        <Loader loader={loader} minHeight="100px">
          <div style={{ display: "flex" }}>
            <Form
              layout={"vertical"}
              // maxFieldsInRow={3}
              handleChange={handleChange}
              fields={STORE_SETALL_FIELDS}
              updateDefaultValue={false}
              defaultValues={defaultValues}
              // labelWidthSpan={4}
              sizeOfFieldsInRow={STORE_SETALL_FIELDS.length === 3 ? 2.5 : 12 / STORE_SETALL_FIELDS.length || 2}
            ></Form>
            <Button
              variant="contained"
              color="primary"
              id="scenarioApplyBtn"
              className={classes.button}
              onClick={() => handleGenerateSupplyRouteData()}
            >
              Generate
            </Button>
          </div>
        </Loader>
        <Loader loader={tableLoader} minHeight={"260px"}>
        {supplyRouteTableData.length !== 0  &&
          <>
            <div className={classNames(globalClasses.marginVertical1rem)}>
              <Grid
                container
                className={globalClasses.marginVertical1rem}
                justifyContent={"space-between"}
              >
                <Grid container alignItems={"center"} item xs={6} lg={6}>
                  <Typography variant="h6">Supply-Routes</Typography>
                </Grid>
              </Grid>
             
                <AgGridComponent columns={supplyRouteTableColumns} rowdata={supplyRouteTableData} pagination={true} uniqueRowId={"supply_route_name"} sizeColumnsToFitFlags />
            
            </div>
          </>
         
        }
         </Loader>
      </DialogContent>
      <DialogActions >
        <Button
          variant="contained"
          color="primary"
          id="scenarioApplyBtn"
          className={classes.button}
          disabled={supplyRouteTableData.length === 0}
          onClick={() => handleSaveButton()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const mapDispatchToProps = (dispatch) => ({
  getDc: (payload) => dispatch(getDc(payload)),
  getStore: (payload) => dispatch(getStore(payload)),
  getStoreGroup: (payload) => dispatch(getStoreGroup(payload)),
  getStoreListFromStoreGroup: (payload) => dispatch(getStoreListFromStoreGroup(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  saveSupplyRoute: (payload) => dispatch(saveSupplyRoute(payload)),
  resetSupplyRouteState: () => dispatch(resetSupplyRouteState()),
  getCreateSupplyRouteTableConfig: () => dispatch(getCreateSupplyRouteTableConfig())
});

export default connect(null, mapDispatchToProps)(CreateNewSupplyRoutePopUp);
