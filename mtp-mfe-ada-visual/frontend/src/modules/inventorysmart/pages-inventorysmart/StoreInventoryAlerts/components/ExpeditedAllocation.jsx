import { cloneDeep, isEmpty } from "lodash";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import {
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import React, { useEffect, useRef, useState } from "react";
import { fetchProductCodes } from "../../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import {
  addMinMaxforUserDefinedInv,
  checkValidationForArticles,
  getRequestForStoreAndDC,
  mutateStoreGroupCode,
} from "../../Create-Allocation/helperFunctions";
import {
  createAllocationApi,
  getAllocate,
  getStoreGroupStoreMap,
  saveDraft,
} from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { setDashboardLoaderFullScreen } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import globalStyles from "core/Styles/globalStyles";

const ExpeditedAllocation = (props) => {
  const globalClasses = globalStyles();

  const [pageIndex, setPageIndex] = useState(0);
  const [offset, setOffset] = useState(0);
  const [articleDetails, setArticleDetails] = useState([]);
  const [validationData, setValidationData] = useState({});
  const [showInValidModal, setShowInValidModal] = useState(false);
  const [apiWithZeroRows, setApiWithZeroRows] = useState(false);
  const storeGroupStoreMap = useRef(null);
  const defaultStoreGroupCode = useRef(null);
  const { redirectionConfigurations } = props;
  useEffect(() => {
    const fetchStoreGroupStoreMap = async () => {
      if (!isEmpty(redirectionConfigurations.filters)) {
        const filters = redirectionConfigurations.filters;
        let l_storeGroupStoreMap = await props.getStoreGroupStoreMap({
          channel: filters.filter((val) => val.attribute_name === "channel"),
          application_code: 1,
        });
        storeGroupStoreMap.current = l_storeGroupStoreMap?.data?.data;
      }
    };

    (async () => {
      let l_defaultStoreGroupCode = await props.getTenantConfigApplicationLevel(
        1,
        {
          attribute_name: "default_store_groups",
        }
      );
      defaultStoreGroupCode.current = l_defaultStoreGroupCode?.data?.data;
    })();

    if (!isEmpty(redirectionConfigurations.filters)) {
      fetchStoreGroupStoreMap();
    }
    if (!isEmpty(redirectionConfigurations)) {
      fetchArticleDetailsForAllocation();
    }
  }, [redirectionConfigurations]);

  useEffect(() => {
    if (!isEmpty(articleDetails)) {
      if (
        !(articleDetails.length % 10) &&
        !validationData?.articlesWithValidationError?.length &&
        !apiWithZeroRows
      ) {
        fetchArticleDetailsForAllocation();
      } else {
        let l_articlesWithValidationError = checkValidationForArticles(
          articleDetails,
          "article",
          storeGroupStoreMap?.current,
          {},
          true,
          true
        );
        if (
          l_articlesWithValidationError?.articlesWithValidationError?.length
        ) {
          setValidationData(l_articlesWithValidationError);
        } else {
          createAllocation();
        }
      }
    }
  }, [articleDetails]);

  useEffect(() => {
    if (validationData?.articlesWithValidationError?.length) {
      setShowInValidModal(true);
    }
  }, [validationData]);

  const onCloseModalHandler = () => {
    setShowInValidModal((value) => !value);
  };

  const excludeAllHandler = () => {
    // props.excludeAllHandler();
    let l_articles = validationData?.articlesWithValidationError;
    let l_filteredArticles = cloneDeep(articleDetails);
    l_filteredArticles = l_filteredArticles.filter(
      (val) => !l_articles?.includes(val?.article)
    );
    if (!l_filteredArticles?.length) {
      props.setDashboardLoaderFullScreen(false);
    }
    setArticleDetails(l_filteredArticles);
    setPageIndex(0);
    setOffset(0);
    setApiWithZeroRows(false);
    storeGroupStoreMap.current = null;
    defaultStoreGroupCode.current = null;
    onCloseModalHandler();
  };
  const resetState = () => {
    setPageIndex(0);
    setOffset(0);
    setArticleDetails([]);
    setValidationData({});
    setShowInValidModal(false);
    setApiWithZeroRows(false);
    storeGroupStoreMap.current = null;
    defaultStoreGroupCode.current = null;
    props.setExpeditedAllocation(false);
  };
  const createAllocation = async () => {
    try {
      let l_request = {
        mandatory: redirectionConfigurations.filters
          ?.filter((filter) => filter.attribute_name === "channel")[0]
          .values[0].replaceAll(" ", ""),
        req_top_table: {
          filters: [],
          filter_dependency: redirectionConfigurations.filters,
          selection: [],
          set_all: [],
          prev_action: "",
          store_group_codes: [],
          dc_codes: [],
          poCode: null,
          filteredSelection: !isEmpty(
            redirectionConfigurations.filteredSelection
          )
            ? redirectionConfigurations.filteredSelection
            : [],
          popupLink: redirectionConfigurations.popupLink,
          product_profile_codes: [],
          displayedAndHiddenCheckedRows: {},
          isExpedited: true,
        },
        data: {},
      };
      let l_draftResponse = await props.saveDraft(l_request);
      if (
        l_draftResponse.data.status &&
        l_draftResponse.data.data.allocation_id
      ) {
        const { l_storeRequest } = getRequestForStoreAndDC(
          articleDetails,
          [],
          redirectionConfigurations.filters?.filter(
            (filter) => filter.attribute_name === "channel"
          )[0].values,
          redirectionConfigurations.poCode,
          true
        );
        let l_createAllocationResponse = await props.createAllocationApi(
          {
            input: Object.values(l_storeRequest),
            allocationID: l_draftResponse.data.data?.allocation_id,
          },
          props.isV3?.includes("allocation")
        );
        displaySnackMessages(l_createAllocationResponse.data.message, "info");
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      resetState();
      props.setDashboardLoaderFullScreen(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const fetchArticleDetailsForAllocation = async () => {
    try {
      //Using the redux store data if user has been redirected to Create Allocation from different page
      let selectedFilters = [...redirectionConfigurations.filters];
      const selectedArticleIds = fetchProductCodes(
        redirectionConfigurations.selectedArticles
      );

      let articleFilter = tableArticleFilter;
      articleFilter.values = [...selectedArticleIds];
      selectedFilters.push(articleFilter);

      let body = {
        filters: selectedFilters,
        meta: {
          range: [],
          search: [],
          sort: [],
          limit: { limit: 100, page: pageIndex + 1, offset: offset },
        },
        channel: selectedFilters?.filter(
          (filter) => filter.attribute_name === "channel"
        )[0].values[0],
        selection: [],
        po_id: redirectionConfigurations.poCode
          ? [redirectionConfigurations.poCode]
          : redirectionConfigurations.poCode,
        filtered_selection: !isEmpty(
          redirectionConfigurations.filteredSelection
        )
          ? redirectionConfigurations.filteredSelection
          : [],
        popupLink: redirectionConfigurations.popupLink,
      };

      let response = await props.getAllocate(body);
      if (response.data.status) {
        if (!response.data?.data?.table_data?.length) {
          setApiWithZeroRows(true);
        }
        setPageIndex(response.data.page);
        setOffset(response.data.offset);
        let l_userSelectedStores = response.data?.data?.user_selected_stores;
        let l_responseData = response.data?.data?.table_data,
          l_updatedResponse;
        l_responseData = mutateStoreGroupCode(
          l_responseData,
          defaultStoreGroupCode.current?.[0]?.attribute_value
        );
        l_updatedResponse = addMinMaxforUserDefinedInv(
          l_responseData,
          storeGroupStoreMap.current,
          l_userSelectedStores
        );
        setArticleDetails((old) => [...old, ...l_updatedResponse]);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      resetState();
    }
  };
  return (
    <>
      {showInValidModal && (
        <Dialog
          onClose={() => {
            onCloseModalHandler();
            props.setDashboardLoaderFullScreen(false);
            resetState();
          }}
          maxWidth={"sm"}
          aria-labelledby="customized-dialog-title"
          open={true}
          fullWidth={true}
          disableEscapeKeyDown={true}
        >
          <DialogTitle id="customized-dialog-title">
            <Grid
              container
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography variant="h4" gutterBottom>
                {"Validation Error"}
              </Typography>
              <IconButton
                aria-label="close"
                onClick={() => {
                  onCloseModalHandler();
                  props.setDashboardLoaderFullScreen(false);
                  resetState();
                }}
                size="large"
              >
                <CloseIcon />
              </IconButton>
            </Grid>
          </DialogTitle>
          <DialogContent>
            <Typography variant="h6" className={globalClasses.marginBottom}>
              {validationData?.articlesWithValidationError.join(",")}
            </Typography>
            <Typography variant="h6" className={globalClasses.marginBottom}>
              {validationData?.validationErrorMessage}
            </Typography>
          </DialogContent>

          <DialogActions>
            <Button
              onClick={() => {
                excludeAllHandler();
              }}
              color="primary"
            >
              Exclude All
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    isV3:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.isV3,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (snack) => dispatch(addSnack(snack)),
  getStoreGroupStoreMap: (payload) => dispatch(getStoreGroupStoreMap(payload)),
  getTenantConfigApplicationLevel: (dynamicRoute, queryParam) =>
    dispatch(getTenantConfigApplicationLevel(dynamicRoute, queryParam)),
  getAllocate: (payload) => dispatch(getAllocate(payload)),
  createAllocationApi: (payload, isV3) =>
    dispatch(createAllocationApi(payload, isV3)),
  saveDraft: (payload) => dispatch(saveDraft(payload)),
  setDashboardLoaderFullScreen: (payload) =>
    dispatch(setDashboardLoaderFullScreen(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExpeditedAllocation);
