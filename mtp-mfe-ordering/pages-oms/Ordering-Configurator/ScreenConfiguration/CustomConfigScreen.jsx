import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Box, Typography, CircularProgress, Alert, Paper, List, ListItem, ListItemText, ListItemIcon, Checkbox, FormControlLabel, Button, Divider } from '@mui/material';
import { invokeApi } from 'core/actions/jsonParserActions';
import { addSnack } from 'core/actions/snackbarActions';
import CustomCheckBox from 'core/commonComponents/customCheckbox';
import {Accordion} from "impact-ui-v3"
import Loader from "core/Utils/Loader/loader";
import { fetchKPIData, saveKPIData } from "modules/oms/services-oms/Ordering-Configurator/ordering-configurator-service.js";
import { connect } from 'react-redux';

// Utility function to generate unique IDs
const generateUniqueId = (item, index) => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substr(2, 9);
  return `generated_${timestamp}_${index}_${randomSuffix}`;
};

const CustomConfigScreen = (props) => {
    const dispatch = useDispatch();
    const [configData, setConfigData] = useState([]);
    const [selectedItems, setSelectedItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [accordionValue, setAccordionValue] = useState("KPI Configuration");


  // Fetch configuration data from API
  const fetchConfigData = async () => {
    setLoading(true);
    setError(null);
        try {
      let queryParams = {
      confguration_key: props.moduleName === "Matrix Summary" ? 'MATRIX_SUMMARY_KPI_KEY' : 'DASHBOARD_KPI_KEY'
      }
      const responseData = await props.fetchKPIData(queryParams)
        if (responseData?.data?.status) {
          if(responseData?.data?.data?.length > 0){
            // Check if each item has an ID, generate one if missing
            const processedData = responseData.data.data.map((item, index) => {
              if (!item.id) {
                // Generate a unique ID using the utility function
                const generatedId = generateUniqueId(item, index);
                console.log(`Generated ID for item: ${item.label || 'Unknown'} - ${generatedId}`);
                return {
                  ...item,
                  id: generatedId
                };
              }
              return item;
            });
            setConfigData(processedData);
            // Initialize selected items based on existing configuration
            const preSelected = processedData.filter(item => item?.isSelected);
            setSelectedItems(preSelected);
          } else {
            setConfigData(responseData?.data?.data);
            // Initialize selected items based on existing configuration
            const preSelected = responseData?.data?.data.filter(item => item?.isSelected);
            setSelectedItems(preSelected);
          }
        } 
      } catch (err) {
        setError('Failed to fetch configuration data');
        console.error('Error fetching config data:', err);
      } finally {
        setLoading(false);
      }
    }

      // Save configuration changes
  const saveConfiguration = async () => {
    setSaving(true);
    
    try {
      selectedItems.forEach(item => {
        item.isSelected = true;
      });
      const payload = {
        [props.moduleName === "Matrix Summary" ? 'matrix_summary_kpi_configurations' : 'dashboard_kpi_configurations']: selectedItems
      };

      const response = await props.saveKPIData(payload)

      if (response?.data?.status) {
        props.addSnack({
          message: 'Configuration saved successfully',
          options: { variant: 'success' }
        });
      }
    } catch (err) {
      props.addSnack({
        message: 'Failed to save configuration',
        options: { variant: 'error' }
      });    
      console.error('Error saving config:', err);
    } finally {
      setSaving(false);
    }
  };

    // Handle individual checkbox change
    const handleItemToggle = (item) => {
        setSelectedItems(prev => {
          const isSelected = prev.some(selectedItem => selectedItem.id === item.id);
          if (isSelected) {
            return prev.filter(selectedItem => selectedItem.id !== item.id);
          } else {
            return [...prev, item];
          }
        });
      };
    
      // Handle select all functionality
      const handleSelectAll = () => {
        if (selectedItems.length === configData.length) {
          setSelectedItems([]);
        } else {
          setSelectedItems([...configData]);
        }
      };

        // Load data on component mount
  useEffect(() => {
    console.log("selectedItems",props.isKpi)
    if(props.isKpi){
      fetchConfigData();
    }

  }, []);


console.log("selectedItems",selectedItems)
 
  
  return (
    <>
 <Loader loader={loading} minHeight={"260px"}>
 <div className="ag-theme-alpine" style={{ height: 500, width: "100%" ,marginTop:"15px"}}>
    {configData?.length !==0 ?
<Accordion
          label="KPI Configuration"
          singleData={{
            header: "KPI Configuration",
            content: (
                <Box p={3}>
                <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      KPI Configuration Options ({selectedItems.length} of {configData.length} selected)
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={handleSelectAll}
                      disabled={configData.length === 0}
                    >
                      {selectedItems.length === configData.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </Box>
                  
                  <Divider sx={{ mb: 2 }} />
                  
                  {configData.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                      No configuration options available
                    </Typography>
                  ) : (
                      <Box 
                      display="flex" 
                      flexWrap="wrap" 
                      gap={2}
                      sx={{ 
                        '& > *': { 
                          flex: '0 0 auto',
                          minWidth: '200px'
                        } 
                      }}
                    >
                      {configData.map((item, index) => (
                        <Paper 
                          key={item.id}
                          elevation={1}
                          sx={{ 
                            p: 2, 
                            display: 'flex', 
                            alignItems: 'center',
                            gap: 1,
                            minWidth: '200px',
                            flex: '0 0 auto'
                          }}
                        >
                          <Checkbox
                            checked={selectedItems.some(selectedItem => selectedItem.id === item.id)}
                            onChange={() => handleItemToggle(item)}
                            color="primary"
                          />
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {item.label}
                            </Typography>
                            {/* {item.description && (
                              <Typography variant="body2" color="text.secondary">
                                {item.description}
                              </Typography>
                            )} */}
                          </Box>
                        </Paper>
                      ))}
                </Box>
                  )}
                </Paper>
          
                <Box display="flex" gap={2} justifyContent="flex-end">
                  {/* <Button
                    variant="outlined"
                    onClick={fetchConfigData}
                    disabled={loading}
                  >
                    Refresh
                  </Button> */}
                  <Button
                    variant="contained"
                    onClick={saveConfiguration}
                    disabled={saving || configData.length === 0}
                    startIcon={saving ? <CircularProgress size={20} /> : null}
                  >
                    {saving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </Box>
              </Box>
            ),
                value: "KPI Configuration",
            }}
          expanded={accordionValue}
          isSingleItem={true}
          onChange={(value) => {
            if (!accordionValue) {
              setAccordionValue("KPI Configuration");
            } else {
              setAccordionValue(null);
            }
          }}
        />
        :
        <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="200px"
        width="100%"
      >
        <Typography variant="h6" color="text.secondary" style={{marginRight:"9%"}}>
          No Custom Configuration for {props.moduleName}
        </Typography>
      </Box>
}
        </div>
        </Loader>
      

  
   
    </>
  )
}
const mapStateToProps = (state) => {
  return {};
};

const mapActionToProps = {
  fetchKPIData,
  addSnack,
  saveKPIData,
};


export default connect(mapStateToProps, mapActionToProps)(CustomConfigScreen)
