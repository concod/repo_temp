import { useState, useEffect } from "react";
import {Modal} from "impact-ui-v3";
import makeStyles from "@mui/styles/makeStyles";
import { getMappedRules } from "../services/storeMappingService";
import Loader from "core/Utils/Loader/loader";
import { getColumnsAg } from "core/actions/tableColumnActions";
import AgGridTable from "core/Utils/agGrid";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { isColumnPresent } from "core/Utils/functions/helpers/table-helpers";

const useStyles = makeStyles((theme) => ({
  root: {
    borderRadius: "8px",
    "& .MuiDialog-paperWidthSm": {
      minWidth: "60%",
    },
  },
  confirmBox: {
    "& .MuiDialog-paper": {
      borderRadius: "10px 10px 6px 6px",
    },
  },
}));

const MappedProducts = (props) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState([]);
  const [isTableGrouped, setIsTableGrouped] = useState(false);

  useEffect(() => {
    setOptions();
  }, []);

  const setOptions = async () => {
    try {
      let cols = await getColumnsAg(
        `table_name=view_mapped_rules_sp_mapping`
      )();
      const isTimePeriodPresent = isColumnPresent(cols, "validity");
      cols = cols.map((col) => {
        if (col.column_name === "primary_sku" && isTimePeriodPresent) {
          setIsTableGrouped(true);
          col.cellRenderer = "agGroupCellRenderer";
        }
        return col;
      });
      setColumns(cols);
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const manualCallBack = async (manualbody, pageIndex, pageSize) => {
    setLoading(true);
    try {
      let body = {
        psa_name: props.data.psa_name,
        psa_code: props.data.psa_code,
        meta: {
          ...manualbody,
          limit: {
            limit: 10,
            page: pageIndex + 1,
          },
        },
      };
      const resp = await getMappedRules(body);
      setLoading(false);
      return {
        data: prepareGroupedData(resp.data.data),
        totalCount: resp.data.total,
      };
    } catch (err) {
      setLoading(true);
    }
  };

  /**
   *
   * @param {stores response object from the API} stores
   * @returns array of records with time_period and their respective store codes
   */
  const prepareGroupedData = (data) => {
    data.forEach((storeData) => {
      let groupedData = [];
      storeData.validity.forEach((time_range) => {
        groupedData.push({
          from_date: time_range[0],
          to_date: time_range[1],
        });
      });
      storeData.validities = [...groupedData];
      delete storeData.validity;
    });
    return data;
  };

  return (
    <Modal
      onClose={() => props.onCancel()}
      className={classes.root}
      size="large"
      aria-labelledby="customized-dialog-title"
      open={true}
      title={`Mapped ${dynamicLabelsBasedOnTenant("product", "core")}s`}
      primaryButtonLabel="Modify"
      secondaryButtonLabel="Cancel"
      onPrimaryButtonClick={() => {
        props.onModify({
          selectedStores: [props.data],
        });
      }}
      onSecondaryButtonClick={() => props.onCancel()}
    >
      <Loader loader={loading}>
        <div>
          {columns.length > 0 && (
            <AgGridTable
              columns={columns}
              sizeColumnsToFitFlag
              onGridChanged
              onRowSelected
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={"rule_code"}
              childKey={"validities"}
              purgeClosedRowNodes={true}
              treeData={isTableGrouped}
              groupDisplayType={"custom"}
              isServerSideGroupOpenByDefault={(params) => true}
              skipAutoSizeColumn={true}
            />
          )}
        </div>
      </Loader>
    </Modal>
  );
};

export default MappedProducts;
