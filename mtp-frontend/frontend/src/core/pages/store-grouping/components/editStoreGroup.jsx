import { useEffect, useRef, useState } from "react";
import LoadingOverlay from "../../../Utils/Loader/loader";
import PageRouteTitles from "./PageRouteTitles";
import {
  deleteStoresFromGroups,
  fetchMappedStores,
} from "../services-store-grouping/custom-store-group-service";
import { Button, Container, Typography } from "@mui/material";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Delete } from "@mui/icons-material";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import AgGridComponent from "core/Utils/agGrid";
import { Prompt } from "impact-ui";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const EditStoreGroup = (props) => {
  const globalClasses = globalStyles();
  let location = useLocation();
  const selectedStoreGroups = location?.state?.selectedStoreGroups;
  const navigate = useNavigate();
  const [storeGrpColumns, setStoreGrpColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [storeGrpData, setStoreGrpData] = useState([]);
  const [selectedStores, setSelectedStores] = useState([]);
  const [deletePopup, setDeletePopup] = useState(false);
  const editStoreGrpInstance = useRef({});

  let routeOptions = [
    {
      id: "store_grping_scr",
      label: "Store Grouping",
      action: () => navigate(-1),
      icon: null,
    },

    {
      id: "delete_store_from_groups",
      label: "Delete Stores",
      action: () => null,
    },
  ];

  /**
   * @function
   * @description Fetch intital store data fromt the store groups selected
   */
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedStoreGroups.length) {
        props.addSnack({
          message: "Store Groups not selected",
          options: {
            variant: "error",
            onClose: navigate(-1),
          },
        });
      }
      try {
        setIsLoading(true);
        let cols = await getColumnsAg("table_name=bulk_group_delete")();
        cols = agGridColumnFormatter(cols);
        if (cols?.length) {
          setStoreGrpColumns(cols);
        }
        const payload = {
          sg_codes: selectedStoreGroups.map((group) => group.sg_code),
        };
        const resp = await props.fetchMappedStores(payload);
        setStoreGrpData(resp.data.data);
        setIsLoading(false);
      } catch (error) {
        props.addSnack({
          message: "Something went wrong",
          options: {
            variant: "error",
          },
        });
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const loadTableInstance = (params) => {
    editStoreGrpInstance.current = params;
  };

  /**
   * @function
   * @description Update local state to store selected stores
   */
  const onSelectionChanged = () => {
    let selectedRows = [];
    editStoreGrpInstance?.current?.api?.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data, is_selected: true });
    });
    setSelectedStores(selectedRows);
  };

  /**
   * @function
   * @description Handle delete store operation, prepare payload from selections.
   */
  const deleteStoreGroup = async () => {
    try {
      setIsLoading(true);
      const payload = {
        store_groups: {
          filters: props.groupFilterDependency,
          meta: {
            search: [],
            range: [],
            sort: [],
          },
          metrics: [],
          selection: {
            data: props.checkConfiguration,
            unique_columns: ["sg_code"],
          },
        },
        store_codes: selectedStores.map((store) => store.store_code),
      };
      await props.deleteStoresFromGroups(payload);
      setSelectedStores([]);
      props.addSnack({
        message: "Stores Deleted Successfully",
        options: {
          variant: "success",
          onClose: navigate(-1),
        },
      });
      setIsLoading(false);
    } catch (error) {
      props.addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <PageRouteTitles id="storeGrpingCrtBrdCrmbs" options={routeOptions} />
      <Container maxWidth={false}>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.marginBottom}`}
        >
          <Typography variant="h4" id="storeGrpingCrtEditTableTitle">
            Selected Store Groups:
          </Typography>
          <div
            className={`${globalClasses.flexRow} ${globalClasses.gap} ${globalClasses.layoutAlignCenter} ${globalClasses.marginLeft1rem}`}
          >
            {selectedStoreGroups?.map((item, index) => {
              return (
                <Typography variant="body1">
                  {replaceSpecialCharacter(item?.name)}
                  {selectedStoreGroups.length - 1 != index ? "," : ""}
                </Typography>
              );
            })}
          </div>
        </div>
        <div
          className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
        >
          <Typography variant="h5" id="storeGrpingCrtEditTableTitle">
            All the stores in selected groups:
          </Typography>
          <Button
            color="primary"
            variant="contained"
            id="storeGrpingCreateBtn"
            size="small"
            onClick={() => setDeletePopup(true)}
            disabled={!selectedStores.length}
          >
            <Delete />
          </Button>
        </div>
        <Prompt
          isOpen={deletePopup}
          title="Delete Stores"
          subHeading="Are you sure want to delete stores?"
          infoList={[]}
          primaryButtonProps={{
            children: "Confirm",
            onClick: () => {
              deleteStoreGroup();
              setDeletePopup(false);
            },
          }}
          tertiaryButtonProps={{
            children: "Cancel",
            onClick: () => setDeletePopup(false),
          }}
          variant="error"
        />
        <LoadingOverlay loader={isLoading} spinner>
          <AgGridComponent
            columns={storeGrpColumns}
            rowdata={storeGrpData}
            selectAllHeaderComponent={true}
            onSelectionChanged={onSelectionChanged}
            sizeColumnsToFitFlag
            onGridChanged
            uniqueRowId={"store_code"}
            loadTableInstance={loadTableInstance}
            suppressClickEdit={true}
          />
        </LoadingOverlay>
        <Button
          variant="outlined"
          className={globalClasses.marginTop}
          onClick={() => {
            navigate(location?.state?.prevScr, {
              state: {
                from: location.pathname,
              },
            });
          }}
          id="bulkEditPrevScrBtn"
        >
          Go Back
        </Button>
      </Container>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    groupFilterDependency: state.storeGroupReducer.groupFilterDependency,
    checkConfiguration: state.storeGroupReducer.checkConfiguration,
  };
};

const mapActionsToProps = {
  deleteStoresFromGroups,
  fetchMappedStores,
};

export default connect(mapStateToProps, mapActionsToProps)(EditStoreGroup);
