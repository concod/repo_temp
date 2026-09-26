import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Button, Input, Select } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import colours from "core/Styles/colours";
import { addSnack } from "core/actions/snackbarActions";
import { ERROR_MESSAGE, TRANSFER_TYPE_OPTIONS } from "../../../constants-inventorysmart/stringConstants";
import { 
  setCrossChannelFilterConfigs, 
  setWithinChannelFilterConfigs,
  setIsFromReview 
} from "../../../services-inventorysmart/Store-Transfer-Rule/store-transfer-rule";
import { fetchFilterConfig } from "../../inventorysmart-utility";
import {getCombinedCrossDimensionFiltersData} from "core/actions/filterAction.js";
import { getFilteredFields } from "core/actions/filterAction";
import createRule from "assets/createRule.png";

const useStyles = makeStyles((theme) => ({
  // Custom styles that don't have global equivalents
  pageWrapper: {
    padding: '1.5rem 1rem',
    display: 'flex',
    justifyContent: 'center',
  },
  mainContainer: {
    width: '100%',
    maxWidth: '80rem',
    borderRadius: '0.5rem',
    background: '#FFF',
    boxShadow: '0 0 0.25rem 0 rgba(171, 171, 171, 0.25)',
    overflow: 'hidden',
  },
  contentGrid: {
    position: 'relative',
    display: 'flex',
    minHeight: '41rem',
    height: '100%',
  },
  divider: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: '1px',
    backgroundColor: '#D9DDE7',
    zIndex: 1,
  },
  leftSection: {
    width: '33.33%',
    padding: '2rem 1.5rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  leftTitle: {
    marginBottom: '1.5rem',
    fontFamily: 'Manrope',
    fontSize: '24px',
    fontWeight: 800,
    lineHeight: '36px',
  },
  descriptionBox: {
    fontSize: '0.875rem',
    lineHeight: 1.6,
    color: colours.neutrals,
    marginBottom: '1.5rem',
    flex: '0 0 auto',
  },
  descriptionItem: {
    marginBottom: '0.75rem',
  },
  boldText: {
    fontWeight: 600,
    display: 'inline',
    color: '#000',
  },
  normalText: {
    fontWeight: 'normal',
    color: '#666',
  },
  imageWrapper: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginTop: '1rem',
    paddingBottom: '2rem',
  },
  image: {
    maxWidth: '80%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  rightSection: {
    width: '66.67%',
    padding: '2rem 6rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  rightTitle: {
    fontSize: '14px',
    fontWeight: 800,
    marginBottom: '1.5rem',
    lineHeight: '21px',
    color: colours.codGray,
  },
  formSection: {
    marginBottom: '2rem',
  },
  storeAttributesTitle: {
    fontSize: '14px',
    fontWeight: 800,
    marginBottom: '1rem',
    marginTop: '1rem',
    lineHeight: '21px',
    color: colours.codGray,
  },
  inputRow: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
    width: '100%',
  },
  formFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '2rem',
    marginTop: '2rem',
  },
  cancelButton: {
    borderColor: colours.neutralBorder,
    color: colours.neutrals,
  },
  nextButton: {
    backgroundColor: '#4259EE',
    color: '#FFF',
    '&:hover': {
      backgroundColor: '#3649C6',
    },
  },
}));

const FieldPair = ({ leftField, rightField }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  
  return (
    <div className={classes.inputRow}>
      <div className={globalClasses.flex}>
        <Select
          {...leftField}
          minWidth="100%"
        />
      </div>
      {rightField ? (
        <div className={globalClasses.flex}>
          <Select
            {...rightField}
            minWidth="100%"
          />
        </div>
      ) : (
        <div className={globalClasses.flex}></div>
      )}
    </div>
  );
};

const AddNewRule = (props) => {
  const [isLoading, setIsLoading] = useState(false);
  // Specific loading state for when coming back from review
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [ruleName, setRuleName] = useState("");
  const [transferType, setTransferType] = useState(null);
  const [isTransferTypeOpen, setIsTransferTypeOpen] = useState(false);
  const [transferTypeOptions, setTransferTypeOptions] = useState(TRANSFER_TYPE_OPTIONS);
  
  // Store group state variables
  const [storeGroup, setStoreGroup] = useState([]);
  const [storeGroupOptions, setStoreGroupOptions] = useState([]);
  const [originalStoreGroupOptions, setOriginalStoreGroupOptions] = useState([]);
  const [isStoreGroupOpen, setIsStoreGroupOpen] = useState(false);
  const [isStoreGroupLoading, setIsStoreGroupLoading] = useState(false);
  const [shouldRefreshStoreGroup, setShouldRefreshStoreGroup] = useState(false);
  const [isSelectAllStoreGroup, setIsSelectAllStoreGroup] = useState(false);
  
  // Linkage cluster state variables
  const [linkageCluster, setLinkageCluster] = useState(null);
  const [linkageClusterOptions, setLinkageClusterOptions] = useState([]);
  const [originalLinkageClusterOptions, setOriginalLinkageClusterOptions] = useState([]); 
  const [isLinkageClusterOpen, setIsLinkageClusterOpen] = useState(false);
  const [isLinkageClusterLoading, setIsLinkageClusterLoading] = useState(false);
  
  // Channel state variables
  const [fromChannel, setFromChannel] = useState(null);
  const [toChannel, setToChannel] = useState(null);
  const [fromChannelOptions, setFromChannelOptions] = useState([]);
  const [toChannelOptions, setToChannelOptions] = useState([]);
  const [originalChannelList, setOriginalChannelList] = useState([]);
  const [isFromChannelOpen, setIsFromChannelOpen] = useState(false);
  const [isToChannelOpen, setIsToChannelOpen] = useState(false);
  const [isChannelLoading, setIsChannelLoading] = useState(false);
  const globalClasses = globalStyles();
  const classes = useStyles();

  
  useEffect(() => {
    initializeFilterConfig();
  }, []);
  
  const initializeFilterConfig = async () => {
    try {
      setIsLoading(true);
      const crossChannelConfig = await fetchFilterConfig("Inventorysmart Configurations Store Transfer Push");
      props.setCrossChannelFilterConfigs(crossChannelConfig);
      
      const withinChannelConfig = await fetchFilterConfig("Inventorysmart Configurations Store Transfer");
      props.setWithinChannelFilterConfigs(withinChannelConfig);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      handleErrorMessage(error);
    }
  };

  const handleErrorMessage = (e, defaultError = ERROR_MESSAGE) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(defaultError, "error");
  };

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        onClose: onClose,
      },
    });
  };

  const getAttributeNameFromConfig = (attributeType) => {
    const filterConfig = transferType && transferType.value === 'CROSS CHANNEL PUSH' 
      ? props.crossChannelFilterConfigs 
      : props.withinChannelFilterConfigs;
    
    if (!filterConfig || !filterConfig.length) {
      const defaultAttributeNames = {
        'channel': 'channel',
        'Store Groups': 'store_group'
      };
      return defaultAttributeNames[attributeType];
    }
    
    const columnConfig = filterConfig.find(config => {
      return config.label === attributeType || 
             config.label?.toLowerCase() === attributeType.toLowerCase();
    });
    
    return columnConfig?.column_name;
  };
  
  const fetchCrossFiltersData = async (attributeType, dimension, filters = []) => {
    try {
      const attributeName = getAttributeNameFromConfig(attributeType);
      
      const payload = {
        attributes: [
          {
            attribute_name: attributeName,
            dimension: dimension,
            filter_type: "cascaded",
          },
        ],
        filter_type: "cascaded",
        filters: filters,
        application_code: 1,
        is_urm_filter: false,
        screen_name: "Inventorysmart Configurations Store Transfer",
      };
      
      const response = await getCombinedCrossDimensionFiltersData(payload)();
      return response.data.data?.[attributeName] || [];
    } catch (error) {
      handleErrorMessage(error);
      return [];
    }
  };
  
  const fetchStoreGroupOptions = async () => {
    try {
      setIsStoreGroupLoading(true);
      
      if (!transferType) {
        handleErrorMessage("Transfer type is is not Selected");
        setIsStoreGroupLoading(false);
        return;
      }
      
      let filters = [];
      
      if (transferType.value === 'CROSS CHANNEL PUSH') {
        let fromChannelValue = fromChannel?.value;
        let toChannelValue = toChannel?.value;
        
        if ((!fromChannelValue || !toChannelValue) && props.isFromReview && props.formState) {
          const savedFromChannel = props.formState["From channel"];
          const savedToChannel = props.formState["To channel"];
          
          if (savedFromChannel && savedFromChannel.raw_value) {
            fromChannelValue = savedFromChannel.raw_value;
          }
          
          if (savedToChannel && savedToChannel.raw_value) {
            toChannelValue = savedToChannel.raw_value;
          }
        }
        
        if (fromChannelValue && toChannelValue) {
          filters = [
            {
              values: [fromChannelValue, toChannelValue],
              operator: "in",
              dimension: "store",
              filter_type: "cascaded",
              display_type: "dropdown",
              attribute_name: "channel",
              filter_id: "channel",
              display_order: 3
            }
          ];
        }
      }
      
      const storeGroups = await fetchCrossFiltersData("Store Groups", "store", filters);
      
      const formattedOptions = storeGroups.map(group => ({
        value: group,
        label: group
      }));
      
      setStoreGroupOptions(formattedOptions);
      setOriginalStoreGroupOptions(formattedOptions);
      
      if (props.isFromReview && props.formState && props.formState["Store group"]) {
        const savedStoreGroup = props.formState["Store group"];
        
        if (Array.isArray(savedStoreGroup.raw_value)) {
          const matchingOptions = savedStoreGroup.raw_value.map(value => {
            return formattedOptions.find(option => option.value === value);
          }).filter(Boolean); 
          
          if (matchingOptions.length > 0) {
            setStoreGroup(matchingOptions);
            if (matchingOptions.length === formattedOptions.length) {
              setIsSelectAllStoreGroup(true);
            }
          }
        }
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsStoreGroupLoading(false);
    }
  };
  
  const fetchChannelOptions = async (isFromChannel = true) => {
    try {
      setIsChannelLoading(true);
      
      const channels = await fetchCrossFiltersData("channel", "store");
      
      const formattedOptions = channels.map(channel => ({
        value: channel,
        label: channel
      }));
      
      setOriginalChannelList(formattedOptions);
      
      if (props.isFromReview && props.formState) {
        const savedFromChannel = props.formState["From channel"];
        const savedToChannel = props.formState["To channel"];
        
        if (savedFromChannel && savedFromChannel.raw_value) {
          const matchingFromOption = formattedOptions.find(option => option.value === savedFromChannel.raw_value);
          if (matchingFromOption) {
            setFromChannel(matchingFromOption);
          }
        }
        
        if (savedToChannel && savedToChannel.raw_value) {
          const matchingToOption = formattedOptions.find(option => option.value === savedToChannel.raw_value);
          if (matchingToOption) {
            setToChannel(matchingToOption);
          }
        }
      }
      
      if (isFromChannel) {
        const filteredOptions = toChannel 
          ? formattedOptions.filter(option => option.value !== toChannel.value)
          : formattedOptions;
        setFromChannelOptions(filteredOptions);
      } else {
        const filteredOptions = fromChannel 
          ? formattedOptions.filter(option => option.value !== fromChannel.value)
          : formattedOptions;
        setToChannelOptions(filteredOptions);
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsChannelLoading(false);
    }
  };
  
  const fetchLinkageClusterOptions = async () => {
    try {
      setIsLinkageClusterLoading(true);
      
      const response = await getFilteredFields("store", "All")();
      
      const linkageClusters = response.data?.data?.filters || [];
      const formattedOptions = linkageClusters.map(cluster => ({
        value: cluster.column_name,
        label: cluster.label
      }));
      
      setLinkageClusterOptions(formattedOptions);
      setOriginalLinkageClusterOptions(formattedOptions);
      
      if (props.isFromReview && props.formState && props.formState["Linkage cluster"]) {
        const savedLinkageCluster = props.formState["Linkage cluster"];
        const matchingOption = formattedOptions.find(option => option.value === savedLinkageCluster.raw_value);
        if (matchingOption) {
          setLinkageCluster(matchingOption);
        }
      }
    } catch (error) {
      handleErrorMessage(error);
    } finally {
      setIsLinkageClusterLoading(false);
    }
  };
  
  const handleTransferTypeChange = (option) => {
    setTransferType(option);
    
    if (option.value === 'CROSS CHANNEL PUSH') {
      setFromChannel(null);
      setToChannel(null);
      setFromChannelOptions([]);
      setToChannelOptions([]);
      setOriginalChannelList([]);
    }

    setStoreGroup([]);
    setStoreGroupOptions([]);
    setOriginalStoreGroupOptions([]);
    setIsSelectAllStoreGroup(false);
    setLinkageCluster(null);
    setLinkageClusterOptions([]);
    setOriginalLinkageClusterOptions([]);
    
    !props.isFromReview && setShouldRefreshStoreGroup(true);
  };
  
  useEffect(() => {
    if (storeGroup && storeGroupOptions && storeGroupOptions.length > 0) {
      if (storeGroup.length === storeGroupOptions.length) {
        setIsSelectAllStoreGroup(true);
      } else {
        setIsSelectAllStoreGroup(false);
      }
    } else {
      setIsSelectAllStoreGroup(false);
    }
  }, [storeGroup, storeGroupOptions]);
  
  const handleStoreGroupOpen = () => {
    setIsStoreGroupOpen(true);
    
    if (!transferType) {
      handleErrorMessage("Transfer type is not selected");
      setIsStoreGroupLoading(false);
      return;
    }
    
    if (transferType.value === 'CROSS CHANNEL PUSH') {
      if (fromChannel && toChannel) {
        
        if (shouldRefreshStoreGroup || storeGroupOptions.length === 0) {
          fetchStoreGroupOptions();
          setShouldRefreshStoreGroup(false);
        }
      }
    } else {
      if (storeGroupOptions.length === 0) {
        fetchStoreGroupOptions();
      }
    }
  };
  
  const handleFromChannelOpen = () => {
    setIsFromChannelOpen(true);
    
    if (originalChannelList.length === 0) {
      fetchChannelOptions(true);
    } else {
      const filteredOptions = toChannel 
        ? originalChannelList.filter(option => option.value !== toChannel.value)
        : originalChannelList;
      setFromChannelOptions(filteredOptions);
    }
  };
  
  const handleToChannelOpen = () => {
    setIsToChannelOpen(true);
    
    if (originalChannelList.length === 0) {
      fetchChannelOptions(false);
    } else {
      const filteredOptions = fromChannel 
        ? originalChannelList.filter(option => option.value !== fromChannel.value)
        : originalChannelList;
      setToChannelOptions(filteredOptions);
    }
  };
  
  const handleFromChannelChange = (option) => {
    setFromChannel(option);
    
    setStoreGroup([]);
    setStoreGroupOptions([]);
    setOriginalStoreGroupOptions([]);
    setIsSelectAllStoreGroup(false);
    
    !props.isFromReview && setShouldRefreshStoreGroup(true);
    
    if (option) {
      const filteredOptions = originalChannelList.filter(item => item.value !== option.value);
      setToChannelOptions(filteredOptions);
    } else {
      setToChannelOptions(originalChannelList);
    }
  };
  
  const handleToChannelChange = (option) => {
    setToChannel(option);
    
    if (originalChannelList.length > 0) {
      const filteredOptions = option 
        ? originalChannelList.filter(item => item.value !== option.value)
        : originalChannelList;
      setFromChannelOptions(filteredOptions);
    }
    
    if (transferType && transferType.value === 'CROSS CHANNEL PUSH') {
      setStoreGroup([]);
      setStoreGroupOptions([]);
      setOriginalStoreGroupOptions([]);
      setIsSelectAllStoreGroup(false);
      
      !props.isFromReview && setShouldRefreshStoreGroup(true);
    }
  };
  
  const handleLinkageClusterOpen = () => {
    setIsLinkageClusterOpen(true);
    
    if (linkageClusterOptions.length === 0) {
      fetchLinkageClusterOptions();
    }
  };
  
  const handleStoreGroupSearch = (searchTerm) => {
    const searchValue = searchTerm.target.value;
    
    if (searchValue && searchValue.trim() !== "") {
      const lowerCaseSearchTerm = searchValue.toLowerCase();
      const filteredOptions = originalStoreGroupOptions.filter(option => 
        option.label.toLowerCase().includes(lowerCaseSearchTerm)
      );
      setStoreGroupOptions(filteredOptions);
    } else {
      setStoreGroupOptions(originalStoreGroupOptions);
    }
  };
  
  const handleLinkageClusterSearch = (searchTerm) => {
    const searchValue = searchTerm.target.value;
    
    if (searchValue && searchValue.trim() !== "") {
      const lowerCaseSearchTerm = searchValue.toLowerCase();
      const filteredOptions = originalLinkageClusterOptions.filter(option => 
        option.label.toLowerCase().includes(lowerCaseSearchTerm)
      );
      setLinkageClusterOptions(filteredOptions);
    } else {
      setLinkageClusterOptions(originalLinkageClusterOptions);
    }
  };


  
  const handleSubmitForm = () => {
    // Basic validations for all transfer types
    if (!ruleName) {
      displaySnackMessages("Rule name is required", "error");
      return;
    }
    
    if (!transferType) {
      displaySnackMessages("Transfer type is required", "error");
      return;
    }
    
    if (!linkageCluster) {
      displaySnackMessages("Linkage cluster is required", "error");
      return;
    }
    if (transferType) {
      switch (transferType.value) {
        case 'CROSS CHANNEL PUSH':
          if (!fromChannel) {
            displaySnackMessages("From channel is required", "error");
            return;
          }
          
          if (!toChannel) {
            displaySnackMessages("To channel is required", "error");
            return;
          }
          
          if (fromChannel && toChannel && (!storeGroup || storeGroup.length === 0)) {
            displaySnackMessages("Store group is required", "error");
            return;
          }
          break;
          
        case 'WITHIN CHANNEL REBALANCING':
        case 'CROSS CHANNEL REBALANCING':
          if (!storeGroup || storeGroup.length === 0) {
            displaySnackMessages("Store group is required", "error");
            return;
          }
          break;
          
        default:
          break;
      }
    }
    
    const formData = {
      "Rule name": {
        key: "rule_name",
        value: ruleName
      },
      "Transfer type": {
        key: "transfer_within",
        value: transferType.label,
        raw_value: transferType.value
      },
      "Linkage cluster": {
        key: "linkage_cluster",
        value: linkageCluster.label,
        raw_value: linkageCluster.value
      },
    };
    
    switch (transferType.value) {
      case 'CROSS CHANNEL PUSH':
        formData["From channel"] = {
          key: "from_channel",
          value: fromChannel?.label,
          raw_value: fromChannel?.value
        };
        formData["To channel"] = {
          key: "to_channel",
          value: toChannel?.label,
          raw_value: toChannel?.value
        };
        if (storeGroup && storeGroup.length > 0) {
          formData["Store group"] = {
            key: "store_group_names",
            value: storeGroup.map(group => group.label).join(", "),
            raw_value: storeGroup.map(group => group.value)
          };
        }
        break;
        
      case 'WITHIN CHANNEL REBALANCING':
      case 'CROSS CHANNEL REBALANCING':
        if (storeGroup && storeGroup.length > 0) {
          formData["Store group"] = {
            key: "store_group_names",
            value: storeGroup.map(group => group.label).join(", "),
            raw_value: storeGroup.map(group => group.value)
          };
        }
        break;
        
      default:
        break;
    }
    
    if (props.onSubmit) {
      props.onSubmit(formData);
    } 
  };

  
  useEffect(() => {
    if (props.isFromReview && props.formState) {
      setIsReviewLoading(true);
      const formData = props.formState;
      
      if (formData["Rule name"]) {
        setRuleName(formData["Rule name"].value || "");
      }
      
      if (formData["Transfer type"]) {
        const transferTypeOption = TRANSFER_TYPE_OPTIONS.find(
          option => option.value === formData["Transfer type"].raw_value
        );
        setTransferType(transferTypeOption);
      }      
    }
  }, [props.isFromReview, props.formState]);
  
  useEffect(() => {
    if (transferType && props.isFromReview) {
      setIsReviewLoading(true);
      const apiCalls = [];
      
      if (transferType.value === 'CROSS CHANNEL PUSH') {
        apiCalls.push(fetchChannelOptions(true));
      }
      
      apiCalls.push(fetchLinkageClusterOptions());
      apiCalls.push(fetchStoreGroupOptions());
      
      props.setIsFromReview(false);
      
      Promise.allSettled(apiCalls)
        .then(results => {
          const hasFailures = results.some(result => result.status === 'rejected');
          if (hasFailures) {
            displaySnackMessages("Something went wrong while loading data", "error");
          }
        })
        .finally(() => {
          setTimeout(() => {
            setIsReviewLoading(false);
          }, 500);
        });
    }
  }, [transferType]);

  return (
    <Loader loader={isLoading || isReviewLoading}>
      <div className={classes.pageWrapper}>
        
        <div className={classes.mainContainer}>
          <div className={classes.contentGrid}>
            <div className={classes.divider}></div>
            
            <div className={classes.leftSection}>
              <h2 className={classes.leftTitle}>Basic details</h2>
              <div className={classes.descriptionBox}>
                <p className={classes.descriptionItem}><span className={classes.boldText}>Rule Name - </span><span className={classes.normalText}>User defined rule name</span></p>
                <p className={classes.descriptionItem}><span className={classes.boldText}>Transfer Type - </span><span className={classes.normalText}>Type of transfer between Within channel rebalancing, Cross channel rebalancing, and Cross channel Fixed push</span></p>
                <p className={classes.descriptionItem}><span className={classes.boldText}>Store groups - </span><span className={classes.normalText}>User defined store groups as a domain of all stores involved</span></p>
                <p><span className={classes.boldText}>Linkage Cluster - </span><span className={classes.normalText}>This is the cluster of stores within which Source destination pairs are to be created from the set of selected stores</span></p>
              </div>
              
              <div className={classes.imageWrapper}>
                <img 
                  src={createRule} 
                  alt="Create flow store transfer" 
                  className={classes.image}
                />
              </div>
            </div>
            
            <div className={classes.rightSection}>
              <div className={`${globalClasses.flexColumn} ${globalClasses.h_100} ${globalClasses.flexRow}`}>
                <div className={`${globalClasses.flex} ${globalClasses.flexColumn}`}>
                  <div className={`${ globalClasses.marginBottom} ${classes.formSection}`}>
                    <h2 className={classes.rightTitle}>Basic details</h2>
                    <div className={`${globalClasses.fullWidth} ${globalClasses.marginBottom}`}>
                      <Input
                        placeholder="Enter Rule Name"
                        onChange={(e) => setRuleName(e.target.value)}
                        value={ruleName}
                        label="Rule name"
                        isRequired
                      />
                    </div>
                  </div>
                  
                  <div className={`${globalClasses.marginBottom} ${classes.formSection}`}>
                    <h3 className={classes.storeAttributesTitle}>Store attributes</h3>
                    
                    <FieldPair
                      leftField={{
                        isOpen: isTransferTypeOpen,
                        setIsOpen: setIsTransferTypeOpen,
                        isWithSearch: false,
                        label: "Transfer type",
                        isClearable: false,
                        isMulti: false,
                        currentOptions: transferTypeOptions,
                        setCurrentOptions: setTransferTypeOptions,
                        selectedOptions: transferType,
                        initialOptions: TRANSFER_TYPE_OPTIONS,
                        setSelectedOptions: setTransferType,
                        handleChange: handleTransferTypeChange,
                        placeholder: "Select",
                        isRequired: true,
                        withPortal: true
                      }}
                      rightField={null} 
                    />
                    
                    {transferType && (() => {
                      const storeGroupField = {
                        isOpen: isStoreGroupOpen,
                        setIsOpen: setIsStoreGroupOpen,
                        isWithSearch: true,
                        onSearch: handleStoreGroupSearch,
                        label: "Store group",
                        isClearable: true,
                        isCloseWhenClickOutside: true,
                        isMulti: true,
                        currentOptions: storeGroupOptions,
                        selectedOptions: storeGroup,
                        initialOptions: originalStoreGroupOptions,
                        setSelectedOptions: setStoreGroup,
                        handleChange: (options) => setStoreGroup(options),
                        placeholder: "Select",
                        isRequired: true,
                        isLoading: isStoreGroupLoading,
                        onDropdownOpen: handleStoreGroupOpen,
                        withPortal: true,
                        isSelectAll: isSelectAllStoreGroup,
                        setIsSelectAll: setIsSelectAllStoreGroup,
                        isWithSelectAll: true,
                        toggleSelectAll: true
                      };
                      
                      const linkageClusterField = {
                        isOpen: isLinkageClusterOpen,
                        setIsOpen: setIsLinkageClusterOpen,
                        isWithSearch: true,
                        onSearch: handleLinkageClusterSearch,
                        label: "Linkage cluster",
                        isClearable: false,
                        isMulti: false,
                        currentOptions: linkageClusterOptions,
                        setCurrentOptions: setLinkageClusterOptions,
                        selectedOptions: linkageCluster,
                        initialOptions: originalLinkageClusterOptions,
                        setSelectedOptions: setLinkageCluster,
                        handleChange: (option) => setLinkageCluster(option),
                        placeholder: "Select",
                        isRequired: true,
                        isLoading: isLinkageClusterLoading,
                        onDropdownOpen: handleLinkageClusterOpen,
                        withPortal: true
                      };
                      
                      const fromChannelField = {
                        isOpen: isFromChannelOpen,
                        setIsOpen: setIsFromChannelOpen,
                        isWithSearch: false,
                        label: "From channel",
                        isClearable: false,
                        isMulti: false,
                        currentOptions: fromChannelOptions,
                        selectedOptions: fromChannel,
                        initialOptions: fromChannelOptions,
                        setSelectedOptions: setFromChannel,
                        handleChange: handleFromChannelChange,
                        placeholder: "Select",
                        isRequired: true,
                        isLoading: isChannelLoading && isFromChannelOpen,
                        onDropdownOpen: handleFromChannelOpen,
                        withPortal: true
                      };
                      
                      const toChannelField = {
                        isOpen: isToChannelOpen,
                        setIsOpen: setIsToChannelOpen,
                        isWithSearch: false,
                        label: "To channel",
                        isClearable: false,
                        isMulti: false,
                        currentOptions: toChannelOptions,
                        selectedOptions: toChannel,
                        initialOptions: toChannelOptions,
                        setSelectedOptions: setToChannel,
                        handleChange: handleToChannelChange,
                        placeholder: "Select",
                        isRequired: true,
                        isLoading: isChannelLoading && isToChannelOpen,
                        onDropdownOpen: handleToChannelOpen,
                        withPortal: true
                      };
                      
                      const crossChannelStoreGroupField = {
                        ...storeGroupField,
                        placeholder: !fromChannel || !toChannel ? "Select channels first" : "Select",
                        isDisabled: !fromChannel || !toChannel
                      };
                      
                      switch(transferType.value) {
                        case 'WITHIN CHANNEL REBALANCING':
                        case 'CROSS CHANNEL REBALANCING':
                          return <FieldPair 
                            leftField={storeGroupField} 
                            rightField={linkageClusterField} 
                          />;
                        
                        case 'CROSS CHANNEL PUSH':
                          return (
                            <>
                              <FieldPair 
                                leftField={fromChannelField} 
                                rightField={toChannelField} 
                              />
                              <FieldPair 
                                leftField={crossChannelStoreGroupField} 
                                rightField={linkageClusterField} 
                              />
                            </>
                          );
                        
                        default:
                          return null;
                      }
                    })()}
                  </div>
                </div>
                
                <div className={classes.formFooter}>
                  <Button
                    variant="text"
                    onClick={props.onCancel}
                    className={classes.cancelButton}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    variant="contained"
                    onClick={handleSubmitForm}
                    className={classes.nextButton}
                  >
                    Next &gt;
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    crossChannelFilterConfigs: inventorysmartReducer.storeTransferRuleService?.crossChannelFilterConfigs,
    withinChannelFilterConfigs: inventorysmartReducer.storeTransferRuleService?.withinChannelFilterConfigs,
    formState: inventorysmartReducer.storeTransferRuleService?.formState,
    isFromReview: inventorysmartReducer.storeTransferRuleService?.isFromReview,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setCrossChannelFilterConfigs: (payload) => dispatch(setCrossChannelFilterConfigs(payload)),
    setWithinChannelFilterConfigs: (payload) => dispatch(setWithinChannelFilterConfigs(payload)),
    setIsFromReview: (flag) => dispatch(setIsFromReview(flag)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(AddNewRule);
