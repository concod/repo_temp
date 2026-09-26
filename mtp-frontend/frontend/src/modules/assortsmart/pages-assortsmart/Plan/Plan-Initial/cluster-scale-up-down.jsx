import React from "react";
import { withRouter } from "react-router-dom";
import { Grid, Button } from "@mui/material";
import CompareArrowsOutlinedIcon from "@mui/icons-material/CompareArrowsOutlined";
import { Plan } from "modules/assortsmart/constants-assortsmart/stringContants";
import { useStyles as sharedStyles } from "core/Utils/styles/assortSmartUsestyles";
import {
  getSubRowNodeTotal,
  getClusterTotalRow,
} from "./plan-initial-functions";

const ClusterScaleUpDown = (props) => {
  const sharedClasses = sharedStyles();
  const scaleUpDown = () => {
    let isCarryOverFlow = false;
    let updatedData = [];
    props.AGInstance.current.api.rowModel.rowsToDisplay.forEach((eachRow) => {
      let row = eachRow.data;
      if (row.carryover_flag) {
        isCarryOverFlow = true;
      }
      if (
        (!row.carryover_flag && !row.attribute_value) ||
        (row.carryover_flag &&
          row.carryover_flag === "New" &&
          row.attribute_value === "New")
      ) {
        row.subRows = eachRow.childrenAfterAggFilter;
        let total = 0,
          lockPen = 0,
          unlockPen = 0;
        //sum of all cluster values
        props.uniqueClusterList.forEach((cluster) => {
          let lockKey = `${row.uniqueID}${cluster}_ty`;
          total += parseFloat(row[`${cluster}_ty`] || 0);
          if (row?.cellLocked?.[`${lockKey}`]) {
            //sum of all locked clusters
            lockPen += parseFloat(row[`${cluster}_ty`] || 0);
          } else {
            //sum of all unlocked clusters
            unlockPen += parseFloat(row[`${cluster}_ty`] || 0);
          }
        });
        if (lockPen > 100) {
          props.addSnack({
            message: `Locked percentage cannot be more than 100%`,
            options: {
              variant: "error",
            },
          });
        } else if (unlockPen == 0) {
          props.addSnack({
            message: "Total Non-Locked penetration should not be 0",
            options: {
              variant: "error",
            },
          });
        } else {
          props.uniqueClusterList.forEach((cluster) => {
            //scale the cluster values to 100
            //formula = (current row cluster pen% / sum(non locked cells penetration)) * ( 1-sum(locked cells Penetration))
            let lockKey = `${row.uniqueID}${cluster}_ty`;
            if (!row?.cellLocked?.[`${lockKey}`]) {
              row[`${cluster}_ty`] =
                (parseFloat(row[`${cluster}_ty`] || 0) / unlockPen) *
                (100 - lockPen);
              row[`${cluster}_receipts_quantity_ty`] =
                (row[`${cluster}_ty`] / 100) * row["receipts_quantity_ty"];
            }
          });
        }
        row.total_ty = !total ? total : 100;
        getSubRowNodeTotal(
          row,
          props.uniqueClusterList,
          props.displayMessage,
          props.screenConfiguration
        );
      }
    });
    if (isCarryOverFlow) {
      let totalCurrentCluster = {};
      props.AGInstance?.current?.api?.rowModel.rowsToDisplay.forEach(
        (eachNode) => {
          let eachRow = eachNode.data;
          eachRow.subRows = eachNode.childrenAfterAggFilter;
          props.uniqueClusterList.forEach((clust, index) => {
            if (eachRow.carryover_flag === "Total") {
              let clustTotal = 0;
              let totalQty = 0;
              eachRow.subRows.forEach((subNode) => {
                let subRow = subNode.data;
                if (index === 0) {
                  totalQty =
                    totalQty + subRow.penetration_ty * subRow[`total_ty`];
                }
                clustTotal =
                  clustTotal + subRow.penetration_ty * subRow[`${clust}_ty`];
              });
              eachRow[`${clust}_ty`] = eachRow.penetration_ty
                ? clustTotal / eachRow.penetration_ty
                : 0;
              if (index === 0) {
                eachRow[`total_ty`] = eachRow.penetration_ty
                  ? totalQty / eachRow.penetration_ty
                  : 0;
                if (!totalCurrentCluster[`total_ty`]) {
                  totalCurrentCluster[`total_ty`] = 0;
                }
                totalCurrentCluster[`total_ty`] +=
                  eachRow.penetration_ty * eachRow[`total_ty`];
              }
              if (!totalCurrentCluster[`${clust}_ty`]) {
                totalCurrentCluster[`${clust}_ty`] = 0;
              }
              totalCurrentCluster[`${clust}_ty`] +=
                eachRow.penetration_ty * eachRow[`${clust}_ty`];
            }
            if (
              eachRow[
                props.screenConfiguration?.common?.final_level || "l3_name"
              ] === "Total"
            ) {
              if (index === 0) {
                totalCurrentCluster["total_ty"] =
                  totalCurrentCluster["total_ty"] / 100;
              }
              totalCurrentCluster[`${clust}_ty`] =
                totalCurrentCluster[`${clust}_ty`] / 10000;

              eachRow[`${clust}_ty`] = totalCurrentCluster[`${clust}_ty`];
            }
          });
        }
      );
    }
    if (!isCarryOverFlow) {
      let totalRows = {};
      let totalPen = {};
      props.AGInstance.current.api.forEachNode((eachNode) => {
        if (!eachNode?.data?.attribute_value) {
          if (eachNode?.key.includes("Total")) {
            totalRows[eachNode?.key] = eachNode;
          } else {
            props.uniqueClusterList.forEach((cluster) => {
              if (props.selectedDropData !== "Total") {
                let clusterKey =
                  eachNode?.data?.[
                    props.screenConfiguration?.common?.final_level || "l3_name"
                  ] + cluster.toString();
                if (totalPen[clusterKey] === 0 || totalPen[clusterKey]) {
                  totalPen[clusterKey] =
                    totalPen[clusterKey] +
                    (eachNode?.data?.l3_budget_ty || 0) *
                      (eachNode?.data?.[`${cluster}_ty`] || 0);
                } else {
                  totalPen[clusterKey] =
                    (eachNode?.data?.l3_budget_ty || 0) *
                    (eachNode?.data?.[`${cluster}_ty`] || 0);
                }
              } else {
                if (eachNode.data[`${cluster}_ty`]) {
                  eachNode.data[`${cluster}_ty`] =
                    totalRows?.[
                      `${
                        eachNode.data[
                          props.screenConfiguration?.common?.final_level ||
                            "l3_name"
                        ]
                      }Total`
                    ]?.data?.[`${cluster}_ty`];
                }
              }
            });
          }
        }
      });
      if (props.selectedDropData !== "Total") {
        Object.keys(totalRows).forEach((l3keys) => {
          props.uniqueClusterList.forEach((cluster) => {
            totalRows[l3keys].data[`${cluster}_ty`] =
              totalPen[
                `${
                  totalRows[l3keys].data?.[
                    props.screenConfiguration?.common?.final_level || "l3_name"
                  ]
                }${cluster}`
              ] / totalRows[l3keys].data.l3_budget_ty;
          });
        });
      }
    }
    props.setIsClusterChanged(true);

    let footerData = getClusterTotalRow(
      props.AGInstance,
      props.screenConfiguration
    );
    props.AGInstance.current.api.refreshCells({
      update: updatedData,
      force: true,
    });
    props.setFilteredClusterFooter(footerData);
    props.handleClusterNext(true);
  };
  return (
    <Grid Item className={sharedClasses.btnGroup}>
      <Button
        variant="outlined"
        color="primary"
        className={sharedClasses.scaleUpDownBtn}
        onClick={scaleUpDown}
        title={Plan.__Scale_Up_Down}
        id="cluster-scale-up-down"
      >
        <CompareArrowsOutlinedIcon />
      </Button>
    </Grid>
  );
};

export default withRouter(ClusterScaleUpDown);
