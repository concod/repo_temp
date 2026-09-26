import { useEffect, useState } from "react";
import Header from "./createheader";
import UnitDefnSelection from "./unitDefnSelection";
import SelectStyleDefn from "./selectDefnitions";
import AttributesMapper from "./attributesMapper";
import { connect } from "react-redux";
import {
  fetchAttributes,
  ToggleLoader,
  setStyleAttributes,
  setUnitDefns,
  fetchUnitDefnById,
  setSelectedStyleId,
  setUnitDefnName,
  setUnitAttributeType,
  fetchUnitDefns,
  createNewDefn,
  setUnitDefnType,
  setPackQuantity,
  setPacksInCartons,
  setCartonsInBoxes,
  updateUnitDefn,
  ResetDefn,
  setLastEditedDetails,
  changeDataStatus,
  changeNameValidStatus,
  setEditName,
} from "../product-unit-definition-service";
import LoadingOverlay from "../../../Utils/Loader/loader";
import { addSnack } from "../../../actions/snackbarActions";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
  LinearProgress,
} from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { useHistory, useParams } from "react-router-dom";
import { cloneDeep, uniqBy } from "lodash";
import { productSizeFormatter } from "core/Utils/formatter";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const useStyles = makeStyles({
  btnDiv: {
    display: "flex",
    justifyContent: "center",
    margin: 20,
  },
  CancelBtn: {
    marginRight: 10,
  },

  contentStyle: {
    height: "20vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  textStyle: {
    fontWeight: 500,
    fontSize: 18,
  },
  actionStyle: {
    backgroundColor: "#F7F7F7",
  },
});
const CreateNew = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const params = useParams();
  const classes = useStyles();
  const [open, setOpen] = useState(false);
  const [showLoader, setshowLoader] = useState(false);
  const [errorOpen, seterrorOpen] = useState(false);
  const getEditMetricValue = (size, color, type, metrics) => {
    if (type === "single size - all colors") {
      const records = metrics.filter((metric) => metric.size === size);
      if (records.length > 0) {
        return records[0].value;
      } else {
        return 0;
      }
    } else if (type === "all size - single color") {
      const records = metrics.filter((metric) => metric.color === color);
      if (records.length > 0) {
        return records[0].value;
      } else {
        return 0;
      }
    } else {
      const records = metrics.filter(
        (metric) => metric.color === color && metric.size === size
      );
      if (records.length > 0) {
        return records[0].value;
      } else {
        return 0;
      }
    }
  };

  const calculateTotal = (data, sizes, colors) => {
    let total = 0;
    sizes.forEach((size, sizeIdx) => {
      colors.forEach((clr, clrIdx) => {
        const val =
          data[sizeIdx][clr] === "" ? 0 : parseInt(data[sizeIdx][clr]);
        total = total + val;
      });
    });
    return total;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        props.ToggleLoader(true);
        props.setSelectedStyleId(location.pathname.split("/")[3]);
        if (props.screen_status === "edit") {
          const res = await props.fetchUnitDefnById(props.defn_id);
          let defn = res.data.data;
          props.changeNameValidStatus(true);
          props.setUnitDefnName(defn.name);
          props.setEditName(defn.name);
          props.setUnitDefnType(defn.definition_type);
          props.setUnitAttributeType(defn.metric_type);
          props.setPackQuantity(defn.pack_quantity);
          props.setPacksInCartons(defn.packs_in_carton_quantity);
          props.setCartonsInBoxes(defn.cartons_in_box_quantity);
          defn.metrics = defn.metrics.map((metric) => ({
            ...metric,
            size: productSizeFormatter(metric.size),
          }));
          let rows = defn.sizes.map((defn_size) => {
            let size = productSizeFormatter(defn_size);
            let colorsObj = {};
            defn.colors.map((color) => {
              const value = getEditMetricValue(
                size,
                color,
                defn.metric_type,
                defn.metrics
              );
              if (
                defn.metrics.filter(
                  (metric) =>
                    metric["color"] === color && metric["size"] === size
                ).length > 0
              ) {
                colorsObj[color] = value;
              } else {
                colorsObj[color] = 0;
              }
              return null;
            });
            const totalColMetricVal = getEditMetricValue(
              size,
              "total",
              defn.metric_type,
              defn.metrics
            );
            return {
              size: size,
              unit_type: defn.definition_type,
              attributeType: defn.metric_type,
              metrics: defn.metrics,
              ...colorsObj,
              total:
                defn.metric_type === "single size - all colors" &&
                totalColMetricVal !== 0
                  ? totalColMetricVal
                  : 0,
            };
          });
          let colorsObj = {};

          defn.colors.map((color) => {
            const totalRowMetricVal = getEditMetricValue(
              "Total",
              color,
              defn.metric_type,
              defn.metrics
            );
            colorsObj[color] =
              defn.metric_type === "all size - single color" &&
              totalRowMetricVal !== 0
                ? totalRowMetricVal
                : 0;
            return null;
          });
          rows.push({
            size: "Total",
            unit_type: defn.definition_type,
            attributeType: defn.metric_type,
            metrics: defn.metrics,
            ...colorsObj,
            total: 0,
          });
          rows[rows.length - 1]["total"] = calculateTotal(
            rows,
            defn.sizes,
            defn.colors
          );
          props.setLastEditedDetails({ data: rows, type: defn.metric_type });
          props.setStyleAttributes({
            colors: defn.colors.map((color) => {
              return {
                label: color,
                value: color,
              };
            }),
            sizes: defn.sizes.map((size) => {
              return {
                label: productSizeFormatter(size),
                value: productSizeFormatter(size),
              };
            }),
            metrics: defn.metrics,
          });
        } else {
          const res = await props.fetchAttributes(params.style_id);
          const colors = res.data.data.colors.map((color) => {
            return {
              label: color,
              value: color,
            };
          });
          let sizes = res.data.data.sizes.map((size) => {
            return {
              label: productSizeFormatter(size),
              value: productSizeFormatter(size),
            };
          });
          sizes = uniqBy(sizes, "value");
          props.setStyleAttributes({
            colors: colors,
            sizes: sizes,
            metrics: res.data.data.metrics.map((metric) => {
              return {
                ...metric,
                size: productSizeFormatter(metric.size),
              };
            }),
          });
        }
        props.ToggleLoader(false);
      } catch (error) {
        //Error handling
      }
    };
    fetchData();
    return () => props.ResetDefn();
  }, []);

  const getMetricValue = (metric, metric_type, defn_type) => {
    if (metric_type === "single size - all colors") {
      const res = props.attributeData.filter(
        (data) => data.size === metric.size
      );
      if (res[0]["total"] === "") {
        return 0;
      }
      return parseInt(res[0]["total"]);
    } else if (metric_type === "all size - single color") {
      const res = props.attributeData.filter((data) => data.size === "Total");
      if (res[0][metric.color] === "") {
        return 0;
      }
      return parseInt(res[0][metric.color]);
    } else {
      const res = props.attributeData.filter(
        (data) => data.size === metric.size
      );
      if (res[0][metric.color] === "") {
        return 0;
      } else {
        return parseInt(res[0][metric.color]);
      }
    }
  };

  const onSave = async () => {
    setshowLoader(true);
    let total = 0;
    const copyMetrics = cloneDeep(props.metrics);
    const metrics = copyMetrics.map((metric) => {
      return {
        ...metric,
        value: getMetricValue(metric, props.metric_type, props.defn_type),
      };
    });
    const uniqueMetrics = metrics.reduce((unique, o) => {
      if (!unique.some((obj) => obj.size === o.size && obj.color === o.color)) {
        unique.push(o);
      }
      return unique;
    }, []);
    uniqueMetrics.forEach((metric) => {
      total = total + metric.value;
    });
    if (props.defn_name === "") {
      props.addSnack({
        message: "Name can't be empty",
        options: {
          variant: "error",
        },
      });
      setshowLoader(false);
      return;
    }
    if (props.defn_type === "eaches" && total > 1) {
      props.addSnack({
        message: "Eaches can't have more than 1 unit",
        options: {
          variant: "error",
        },
      });
      setshowLoader(false);
      return;
    }
    if (
      props.defn_type === "packs" ||
      props.defn_type === "cartons" ||
      props.defn_type === "boxes"
    ) {
      if (props.pack_quantity === "" || props.pack_quantity === 0) {
        props.addSnack({
          message: "Pack Quantity can't be empty",
          options: {
            variant: "error",
          },
        });
        setshowLoader(false);
        return;
      }
    }
    if (props.defn_type === "cartons" || props.defn_type === "boxes") {
      if (
        props.packs_in_carton_quantity === "" ||
        props.packs_in_carton_quantity === 0
      ) {
        props.addSnack({
          message: "Packs in Carton Quantity can't be empty",
          options: {
            variant: "error",
          },
        });
        setshowLoader(false);
        return;
      }
    }
    if (props.defn_type === "boxes") {
      if (
        props.cartons_in_box_quantity === "" ||
        props.cartons_in_box_quantity === 0
      ) {
        props.addSnack({
          message: "Cartons in Box Quantity can't be empty",
          options: {
            variant: "error",
          },
        });
        setshowLoader(false);
        return;
      }
    }
    if (props.defn_type !== "eaches" && total !== props.pack_quantity) {
      props.addSnack({
        message: "packQuanity is not matched to config",
        options: {
          variant: "error",
        },
      });
      setshowLoader(false);
      return;
    }

    let pack_quantity = props.pack_quantity;
    let cartons_in_box_quantity = props.cartons_in_box_quantity;
    let packs_in_carton_quantity = props.packs_in_carton_quantity;
    if (props.defn_type === "eaches") {
      pack_quantity = 1;
      cartons_in_box_quantity = 0;
      packs_in_carton_quantity = 0;
    } else if (props.defn_type === "packs") {
      cartons_in_box_quantity = 0;
      packs_in_carton_quantity = 0;
    } else if (props.defn_type === "cartons") {
      cartons_in_box_quantity = 0;
    }
    const body = {
      name: props.defn_name,
      description: props.defn_name,
      definition_type: props.defn_type,
      pack_quantity: parseInt(pack_quantity),
      cartons_in_box_quantity: parseInt(cartons_in_box_quantity),
      packs_in_carton_quantity: parseInt(packs_in_carton_quantity),
      metric_type: props.metric_type,
      metrics: metrics,
    };
    try {
      await props.createNewDefn(body, props.style_id);
      props.ResetDefn();
      handleClose();
      props.changeDataStatus({ status: true, type: "save" });
      props.addSnack({
        message: "New Definition created",
        options: {
          variant: "success",
          autoHideDuration: 3000,
          onClose: () => {
            navigate("/product-unit-definition");
          },
        },
      });

      setshowLoader(false);
    } catch (error) {
      props.addSnack({
        message: "Definition creation failed",
        options: {
          variant: "error",
          autoHideDuration: 3000,
        },
      });
      setshowLoader(false);
    }
  };

  const onUpdate = async () => {
    props.ToggleLoader(true);
    let total = 0;
    const metrics = props.metrics.map((metric) => {
      return {
        ...metric,
        value: getMetricValue(metric, props.metric_type, props.defn_type),
      };
    });
    metrics.forEach((metric) => {
      total = total + metric.value;
    });
    if (props.defn_name === "") {
      props.addSnack({
        message: "Name can't be empty",
        options: {
          variant: "error",
        },
      });
      props.ToggleLoader(false);
      return;
    }
    if (props.defn_type === "eaches" && total > 1) {
      props.addSnack({
        message: "Eaches can't have more than 1 unit",
        options: {
          variant: "error",
        },
      });
      props.ToggleLoader(false);
      return;
    }
    if (props.defn_type !== "eaches" && total !== props.pack_quantity) {
      props.addSnack({
        message: "packQuanity is not matched to config",
        options: {
          variant: "error",
        },
      });
      props.ToggleLoader(false);
      return;
    }
    if (
      (props.defn_type === "cartons" && props.packs_in_carton_quantity === 0) ||
      (props.defn_type === "boxes" && props.packs_in_carton_quantity === 0)
    ) {
      props.addSnack({
        message: "Packs in Carton Quantity can't be empty",
        options: {
          variant: "error",
        },
      });
      props.ToggleLoader(false);
      return;
    } else if (
      props.defn_type === "boxes" &&
      props.cartons_in_box_quantity === 0
    ) {
      props.addSnack({
        message: "Cartons in Box Quantity can't be empty",
        options: {
          variant: "error",
        },
      });
      props.ToggleLoader(false);
      return;
    }
    let pack_quantity = props.pack_quantity;
    let cartons_in_box_quantity = props.cartons_in_box_quantity;
    let packs_in_carton_quantity = props.packs_in_carton_quantity;
    if (props.defn_type === "eaches") {
      pack_quantity = 1;
      cartons_in_box_quantity = 0;
      packs_in_carton_quantity = 0;
    } else if (props.defn_type === "packs") {
      cartons_in_box_quantity = 0;
      packs_in_carton_quantity = 0;
    } else if (props.defn_type === "cartons") {
      cartons_in_box_quantity = 0;
    }
    const body = {
      name: props.defn_name,
      description: props.defn_name,
      definition_type: props.defn_type,
      pack_quantity: pack_quantity,
      cartons_in_box_quantity: cartons_in_box_quantity,
      packs_in_carton_quantity: packs_in_carton_quantity,
      metric_type: props.metric_type,
      metrics: metrics,
    };
    try {
      await props.updateUnitDefn(body, props.style_id, props.defn_id);
      props.addSnack({
        message: "Updated Successfully",
        options: {
          variant: "success",
          autoHideDuration: 3000,
          onClose: () => {
            navigate("/product-unit-definition");
          },
        },
      });
      props.ToggleLoader(false);
      props.ResetDefn();
      props.changeDataStatus({ status: true, type: "save" });
    } catch (error) {
      props.addSnack({
        message: "Update failed",
        options: {
          variant: "error",
        },
      });
      props.ToggleLoader(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
  };
  const openModal = () => {
    setOpen(true);
  };

  const onCancel = () => {
    seterrorOpen(true);
  };

  return (
    <>
      <LoadingOverlay loader={props.isLoading} spinner>
        <Header
          id="productUnitDefnCrtEdtHdrComp"
          styleId={
            props.screen_status === "edit" ? props.style_id : params.style_id
          }
        />
        <Dialog
          id="productUnitDefnCrtCfmDialog"
          open={errorOpen}
          fullWidth
          maxWidth="xs"
        >
          <DialogContent classes={{ root: classes.contentStyle }}>
            <Typography className={classes.textStyle}>
              Changes will be lost. Do you want to proceed ?
            </Typography>
          </DialogContent>
          <DialogActions classes={{ root: classes.actionStyle }}>
            <Button
              size="small"
              className={classes.btnStyle}
              onClick={() => seterrorOpen(false)}
              variant="outlined"
              color="primary"
              id="productUnitDefnCrtCfmDialogCnclBtn"
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={() => {
                navigate("/product-unit-definition");
              }}
              color="primary"
              id="productUnitDefnCrtCfmDialogCfmBtn"
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
        <Dialog
          id="productUnitDfnCrtDialog"
          open={open}
          fullWidth
          maxWidth="xs"
        >
          {showLoader && <LinearProgress />}
          <DialogContent classes={{ root: classes.contentStyle }}>
            <Typography className={classes.textStyle}>
              Confirm the newly created definition
            </Typography>
          </DialogContent>
          <DialogActions classes={{ root: classes.actionStyle }}>
            <Button
              size="small"
              className={classes.btnStyle}
              onClick={handleClose}
              variant="outlined"
              color="primary"
              id="productUnitDfnCrtDialogCnclBtn"
            >
              Cancel
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={onSave}
              color="primary"
              id="productUnitDfnCrtDialogCfmBtn"
            >
              {"Confirm & Update"}
            </Button>
          </DialogActions>
        </Dialog>
        <UnitDefnSelection id="productUnitDefnUnitSelectComp" />
        <SelectStyleDefn id="productUnitDefnSelectStyleComp" />
        <AttributesMapper id="prodcutUnitDefnAttrbComp" />
        <div className={classes.btnDiv}>
          <Button
            className={classes.CancelBtn}
            variant="outlined"
            color="primary"
            onClick={onCancel}
            id="prodcutUnitDefnCrtEdtCnclBtn"
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={!props.isNameValid}
            id="prodcutUnitDefnCrtSaveBtn"
            onClick={props.screen_status === "edit" ? onUpdate : openModal}
          >
            {props.screen_status === "edit" ? "Update" : "Save"}
          </Button>
        </div>
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.UnitDefnReducer.isLoading,
    defn_name: state.UnitDefnReducer.unitDefnName,
    defn_type: state.UnitDefnReducer.unitDefnType,
    pack_quantity: state.UnitDefnReducer.packQuantity,
    packs_in_carton_quantity: state.UnitDefnReducer.packsInCartons,
    cartons_in_box_quantity: state.UnitDefnReducer.cartonsInBoxes,
    metric_type: state.UnitDefnReducer.attributeType,
    metrics: state.UnitDefnReducer.metrics,
    attributeData: state.UnitDefnReducer.attributeData,
    colors: state.UnitDefnReducer.attributes_colors,
    sizes: state.UnitDefnReducer.attributes_sizes,
    style_id: state.UnitDefnReducer.selectedStyleId,
    isNameValid: state.UnitDefnReducer.isNameValid,
  };
};
const mapActionsToProps = {
  fetchAttributes,
  fetchUnitDefns,
  ToggleLoader,
  setStyleAttributes,
  setUnitDefns,
  setSelectedStyleId,
  createNewDefn,
  fetchUnitDefnById,
  setUnitDefnName,
  setUnitAttributeType,
  setUnitDefnType,
  setCartonsInBoxes,
  setPacksInCartons,
  setPackQuantity,
  updateUnitDefn,
  addSnack,
  ResetDefn,
  setLastEditedDetails,
  changeDataStatus,
  setEditName,
  changeNameValidStatus,
};
export default connect(mapStateToProps, mapActionsToProps)(CreateNew);
