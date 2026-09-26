import { Container, Grid, TextField } from "@mui/material";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import ReactSelect from "../../../commonComponents/filters/Select/Select";
import {
  setCopyStyleId,
  fetchAvailableDefns,
  setAvailableDefns,
  ToggleLoader,
  setSelectedAvailableDefn,
  fetchUnitDefnById,
  setPackQuantity,
  setPacksInCartons,
  setCartonsInBoxes,
  fetchAvailableStyles,
  setAvailableStyles,
  fetchAttributes,
  setLastEditedDetails,
  setUnitAttributeType,
} from "../product-unit-definition-service";
import { useEffect, useState } from "react";
import { addSnack } from "../../../actions/snackbarActions";
import { getFiltersValues } from "../../../actions/filterAction";
const useStyles = makeStyles({
  Container: {
    backgroundColor: "white",
    margin: "30px 0px",
    padding: 25,
  },
  labelStyle: {
    width: "50%",
  },
  selectDiv: {
    width: "100%",
  },
  flexStyle: {
    display: "flex",
  },
  input: {
    height: 40,
  },
  disabledStyle: {
    backgroundColor: "#F2F2F2",
  },
});

const getEditMetricValue = (size, color, type, metrics) => {
  if (type === "single size - all colors") {
    const records = metrics.filter((metric) => metric.size === size);
    if (records.length > 0) {
      return records[0].value;
    } else {
      return "";
    }
  } else if (type === "all size - single color") {
    const records = metrics.filter((metric) => metric.color === color);
    if (records.length > 0) {
      return records[0].value;
    } else {
      return "";
    }
  } else {
    const records = metrics.filter(
      (metric) => metric.color === color && metric.size === size
    );
    if (records.length > 0) {
      return records[0].value;
    } else {
      return "";
    }
  }
};
const SelectDefns = (props) => {
  const classes = useStyles();
  const [packsDisabled, setpacksDisabled] = useState(true);
  const [packsInCartonsDisabled, setpacksInCartonsDisabled] = useState(true);
  const [cartonsInBoxesDisabled, setCartonsInBoxesDisabled] = useState(true);
  const [resetStyleSelection, setresetStyleSelection] = useState(false);
  useEffect(() => {
    if (props.unitDefnType === "" || props.unitDefnType === "eaches") {
      setpacksDisabled(true);
      setpacksInCartonsDisabled(true);
      setCartonsInBoxesDisabled(true);
      props.setPackQuantity(0);
      props.setPacksInCartons(0);
      props.setCartonsInBoxes(0);
    } else if (props.unitDefnType === "packs") {
      setpacksDisabled(false);
      setpacksInCartonsDisabled(true);
      setCartonsInBoxesDisabled(true);
      props.setPacksInCartons(0);
      props.setCartonsInBoxes(0);
    } else if (props.unitDefnType === "cartons") {
      setpacksDisabled(false);
      setpacksInCartonsDisabled(false);
      setCartonsInBoxesDisabled(true);
      props.setCartonsInBoxes(0);
    } else {
      setpacksDisabled(false);
      setpacksInCartonsDisabled(false);
      setCartonsInBoxesDisabled(false);
    }
  }, [props.unitDefnType]);
  useEffect(() => {
    const setAvailableStylesData = async () => {
      try {
        props.ToggleLoader(true);
        const body = {
          attribute_name: "style",
          filter_type: "cascaded",
          filters: [],
        };
        const response = await getFiltersValues("product", body)();
        props.setAvailableStyles(
          response.data.data.attribute.map((style) => {
            return {
              label: style.attribute,
              value: style.attribute,
            };
          })
        );
        props.ToggleLoader(false);
      } catch (error) {
        //Error handling
      }
    };
    setAvailableStylesData();
  }, []);
  useEffect(() => {
    props.setAvailableDefns([]);
    props.setSelectedAvailableDefn("");
    function arrayEquals(a, b) {
      return (
        Array.isArray(a) &&
        Array.isArray(b) &&
        a.length === b.length &&
        a.every((val, index) => val === b[index])
      );
    }
    const fetchAvailDefns = async () => {
      try {
        props.ToggleLoader(true);
        const attrib = await props.fetchAttributes(props.copyStyleId.value);
        const selectColors = attrib.data.data.colors;
        const selectSizes = attrib.data.data.sizes;
        if (
          arrayEquals(
            selectColors,
            props.colors.map((color) => color.value)
          ) &&
          arrayEquals(
            selectSizes,
            props.sizes.map((size) => size.value)
          )
        ) {
          const res = await props.fetchAvailableDefns(props.copyStyleId.value);
          props.setAvailableDefns(res.data.data);
        } else {
          props.setCopyStyleId("");
          setresetStyleSelection(true);
          props.addSnack({
            message: "Copied style doesn't have same attributes",
            options: {
              variant: "error",
            },
          });
        }
        props.ToggleLoader(false);
      } catch (error) {}
    };
    if (props.copyStyleId && props.copyStyleId !== "") {
      fetchAvailDefns();
    }
  }, [props.copyStyleId]);

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
    const fetchUnitDefn = async () => {
      try {
        props.ToggleLoader(true);
        const res = await props.fetchUnitDefnById(
          props.selectedAvailDefn.pud_code
        );
        let UD = res.data.data;
        const updatedMetrics = props.metrics.map((metric) => {
          const copyMetric =
            UD.metrics &&
            UD.metrics.filter((copy) => {
              return copy.size === metric.size && copy.color === metric.color;
            });
          if (copyMetric && copyMetric.length > 0) {
            return {
              ...metric,
              value: copyMetric[0].value,
            };
          } else {
            return {
              ...metric,
              value: 0,
            };
          }
        });
        UD.metrics = [...updatedMetrics];
        let rows = UD.sizes.map((size) => {
          let colorsObj = {};
          UD.colors.map((color) => {
            const value = getEditMetricValue(
              size,
              color,
              UD.metric_type,
              UD.metrics
            );
            if (
              UD.metrics.filter(
                (metric) => metric["color"] === color && metric["size"] === size
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
            UD.metric_type,
            UD.metrics
          );
          return {
            size: size,
            unit_type: UD.definition_type,
            attributeType: UD.metric_type,
            metrics: UD.metrics,
            ...colorsObj,
            total:
              UD.metric_type === "single size - all colors" &&
              totalColMetricVal !== 0
                ? totalColMetricVal
                : 0,
          };
        });

        let colorsObj = {};
        UD.colors.map((color) => {
          const totalRowMetricVal = getEditMetricValue(
            "Total",
            color,
            UD.metric_type,
            UD.metrics
          );
          colorsObj[color] =
            UD.metric_type === "all size - single color" &&
            totalRowMetricVal !== 0
              ? totalRowMetricVal
              : 0;
          return null;
        });
        rows.push({
          size: "Total",
          metrics: UD.metrics,
          unit_type: UD.definition_type,
          attributeType: UD.metric_type,
          ...colorsObj,
          total: 0,
        });
        rows[rows.length - 1]["total"] = calculateTotal(
          rows,
          UD.sizes,
          UD.colors
        );
        props.setUnitAttributeType(UD.metric_type);
        props.setLastEditedDetails({
          data: rows,
          type: UD.metric_type,
          status: true,
        });
        if (UD.definition_type === "packs") {
          props.setPackQuantity(UD.pack_quantity ? UD.pack_quantity : "");
        } else if (UD.definition_type === "cartons") {
          props.setPackQuantity(UD.pack_quantity ? UD.pack_quantity : "");
          props.setPacksInCartons(
            UD.packs_in_carton_quantity ? UD.packs_in_carton_quantity : ""
          );
        } else {
          props.setPackQuantity(UD.pack_quantity ? UD.pack_quantity : "");
          props.setPacksInCartons(
            UD.packs_in_carton_quantity ? UD.packs_in_carton_quantity : ""
          );
          props.setCartonsInBoxes(
            UD.cartons_in_box_quantity ? UD.cartons_in_box_quantity : ""
          );
        }
        props.ToggleLoader(false);
      } catch (error) {
        props.ToggleLoader(false);
      }
    };
    if (props.selectedAvailDefn !== "") {
      fetchUnitDefn();
    }
  }, [props.selectedAvailDefn]);

  const getDefnOptions = () => {
    return props.availDefns.map((defn) => {
      return {
        ...defn,
        label: defn.name,
        value: defn.pud_code,
      };
    });
  };
  const onStyleChange = (key, option) => {
    setresetStyleSelection(false);
    props.setSelectedAvailableDefn("");
    props.setCopyStyleId(option[0]);
  };

  const onDefnChange = (key, option) => {
    props.setSelectedAvailableDefn(option[0]);
  };

  const onPackChange = (event) => {
    props.setPackQuantity(parseInt(event.target.value));
  };
  const onPacksInCartonsChange = (event) => {
    props.setPacksInCartons(parseInt(event.target.value));
  };
  const onCartonsInBoxesChange = (event) => {
    props.setCartonsInBoxes(parseInt(event.target.value));
  };
  const packsCondn =
    packsDisabled || props.defnName === "" || props.unitDefnType === "";
  const cartonsCondn =
    packsInCartonsDisabled ||
    props.defnName === "" ||
    props.unitDefnType === "";
  return (
    <>
      <Container maxWidth={false} classes={{ root: classes.Container }}>
        <Grid container spacing={3}>
          <Grid className={classes.flexStyle} item xs={4}>
            <Grid item xs={6}>
              <label className={classes.labelStyle}>Select Style</label>
            </Grid>
            <Grid item xs={6}>
              <div className={classes.selectDiv}>
                {/* <Select options={getOptions()} value={props.copyStyleId} /> */}
                <ReactSelect
                  id="productUnitDefnStyleDrpDwn"
                  label={"pud-select-style"}
                  menuPortalTarget={document.body}
                  initialData={props.availableStyles}
                  isSearchable={true}
                  reset={resetStyleSelection}
                  selectedOptions={
                    !props.copyStyleId || props.copyStyleId === ""
                      ? []
                      : [props.copyStyleId]
                  }
                  dependency={[]}
                  updateDependency={onStyleChange}
                  isDisabled={
                    props.defnName === "" || props.unitDefnType === ""
                  }
                />
              </div>
            </Grid>
          </Grid>
          <Grid className={classes.flexStyle} item xs={4}>
            <Grid item xs={6}>
              <label className={classes.labelStyle}>Available Definition</label>
            </Grid>
            <Grid item xs={6}>
              <div className={classes.selectDiv}>
                <ReactSelect
                  id="productUnitDefnCpyDfnDrpDwn"
                  label={"pud-available-defn"}
                  initialData={getDefnOptions()}
                  menuPortalTarget={document.body}
                  selectedOptions={
                    !props.selectedAvailDefn || props.selectedAvailDefn === ""
                      ? []
                      : [props.selectedAvailDefn]
                  }
                  isSearchable={false}
                  dependency={[]}
                  updateDependency={onDefnChange}
                  isDisabled={
                    props.defnName === "" || props.unitDefnType === ""
                  }
                />
              </div>
            </Grid>
          </Grid>
          <Grid className={classes.flexStyle} item xs={4}>
            <Grid item xs={6}>
              <label className={classes.labelStyle}>Pack Quantity</label>
            </Grid>
            <Grid item xs={6}>
              <TextField
                id="productUnitDefnPckQntyInp"
                helperText="Only Integer value can be entered"
                value={
                  packsDisabled ||
                  props.defnName === "" ||
                  props.unitDefnType === ""
                    ? ""
                    : props.packQuantity
                }
                type="number"
                variant="outlined"
                placeholder="Enter"
                onChange={onPackChange}
                disabled={
                  packsDisabled ||
                  props.defnName === "" ||
                  props.unitDefnType === ""
                }
                className={packsCondn ? classes.disabledStyle : ""}
                InputProps={{
                  className: classes.input,
                }}
              />
            </Grid>
          </Grid>
          <Grid className={classes.flexStyle} item xs={4}>
            <Grid item xs={6}>
              <label className={classes.labelStyle}>Packs in Carton</label>
            </Grid>
            <Grid item xs={6}>
              <TextField
                id="productUnitDefnPckCrtnsInp"
                helperText="Only Integer value can be entered"
                value={
                  packsInCartonsDisabled ||
                  props.defnName === "" ||
                  props.unitDefnType === ""
                    ? ""
                    : props.packsInCartons
                }
                className={cartonsCondn ? classes.disabledStyle : ""}
                onChange={onPacksInCartonsChange}
                type="number"
                variant="outlined"
                placeholder="Enter"
                disabled={
                  packsInCartonsDisabled ||
                  props.defnName === "" ||
                  props.unitDefnType === ""
                }
                InputProps={{
                  className: classes.input,
                }}
              />
            </Grid>
          </Grid>
          <Grid className={classes.flexStyle} item xs={4}>
            <Grid item xs={6}>
              <label className={classes.labelStyle}>Cartons in boxes</label>
            </Grid>
            <Grid item xs={6}>
              <TextField
                id="productUnitDefnCrtnsBoxesInp"
                helperText="Only Integer value can be entered"
                value={
                  cartonsInBoxesDisabled ||
                  props.defnName === "" ||
                  props.unitDefnType === ""
                    ? ""
                    : props.cartonsInBoxes
                }
                className={
                  cartonsInBoxesDisabled ||
                  props.defnName === "" ||
                  props.unitDefnType === ""
                    ? classes.disabledStyle
                    : ""
                }
                onChange={onCartonsInBoxesChange}
                type="number"
                variant="outlined"
                placeholder="Enter"
                disabled={
                  cartonsInBoxesDisabled ||
                  props.defnName === "" ||
                  props.unitDefnType === ""
                }
                InputProps={{
                  className: classes.input,
                }}
              />
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    styles: state.UnitDefnReducer.stylesData,
    copyStyleId: state.UnitDefnReducer.copyStyleId,
    availDefns: state.UnitDefnReducer.availableDefinitions,
    selectedAvailDefn: state.UnitDefnReducer.selectedAvailableDefn,
    packQuantity: state.UnitDefnReducer.packQuantity,
    packsInCartons: state.UnitDefnReducer.packsInCartons,
    cartonsInBoxes: state.UnitDefnReducer.cartonsInBoxes,
    unitDefnType: state.UnitDefnReducer.unitDefnType,
    availableStyles: state.UnitDefnReducer.availableStyles,
    colors: state.UnitDefnReducer.attributes_colors,
    sizes: state.UnitDefnReducer.attributes_sizes,
    defnName: state.UnitDefnReducer.unitDefnName,
    metrics: state.UnitDefnReducer.metrics,
  };
};

const mapActionsToProps = {
  setCopyStyleId,
  fetchAvailableDefns,
  ToggleLoader,
  setAvailableDefns,
  setSelectedAvailableDefn,
  fetchUnitDefnById,
  setPackQuantity,
  addSnack,
  setPacksInCartons,
  setCartonsInBoxes,
  fetchAvailableStyles,
  setAvailableStyles,
  fetchAttributes,
  setLastEditedDetails,
  setUnitAttributeType,
  getFiltersValues,
};
export default connect(mapStateToProps, mapActionsToProps)(SelectDefns);
