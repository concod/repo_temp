import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { getModuleBasedTenantConfig } from "../../../services-inventorysmart/common/inventory-smart-common-services";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { setModuleConfig } from 'modules/inventorysmart/services-inventorysmart/Allocation-Reports/allocation-reports-common-service';
import { formatModuleName } from 'modules/inventorysmart/utils-inventorysmart/utilityFunctions';

const FetchModuleWrapper = ({module_name, children}) => {
    const dispatch = useDispatch();
    const [loader, setLoader] = useState(true);

    const fetchModuleConfigs = useCallback(async () => {
      try {
        setLoader(true);
        const configResponse = await dispatch(
          getModuleBasedTenantConfig({
            module_name: formatModuleName(module_name),
          })
        );
        dispatch(setModuleConfig({ key: module_name, value: configResponse }));
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(e);
      } finally {
        setLoader(false);
      }
    },[module_name,dispatch])

    useEffect(() => {
        if (module_name) {
            fetchModuleConfigs();
        }
    }, [module_name,fetchModuleConfigs]);


    return (
        <div>
            {!loader && children}
        </div>
    )
}

FetchModuleWrapper.propTypes = {
    module_name: PropTypes.string,
    children: PropTypes.node,
};

export default FetchModuleWrapper