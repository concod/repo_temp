import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { getDefinitions } from "core/pages/product-grouping/product-grouping-service";
import { Modal,Select,Loader } from "impact-ui-v3";
const useStyles = makeStyles({
  dialogContent: {
    overflowY: "visible",
  },
});
const DefinitionasSubRule = (props) => {

  const [definitions, setdefinitions] = useState([]);
  const [isLoading, setisLoading] = useState(false);
  const [selectedDefinitions, setselectedDefinitions] = useState([]);

  const [isOpen, setIsOpen] = useState(false);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [currentOptions, setCurrentOptions] = useState([]);
  const [allOptions, setAllOptions] = useState([]);


  const getOptionsFromDefinitions = (defs) => {
    let filteredDefinitions = [...defs];

    // If it is updating a subrule, remove the edited definition from subrules dropdown
    if (props.type === "edit") {
      filteredDefinitions = filteredDefinitions.filter((dfn) => {
        return dfn.pgd_code !== props.editDefinition.pgd_code;
      });
    }

    return filteredDefinitions.map((dfn) => {
      return {
        ...dfn,
        label: dfn.name,
        value: dfn.pgd_code,
      };
    });
  };

  useEffect(() => {
    if (definitions.length > 0) {
      const options = getOptionsFromDefinitions(definitions);
      setCurrentOptions(options);
      setAllOptions(options);
    }
  }, [definitions]);

  useEffect(() => {
    const fetchDefinitions = async () => {
      setisLoading(true);
      try {
        let body = {
          search: [],
          range: [],
          sort: [],
        };
        const res = await props.getDefinitions(body, 100, 0);
        setdefinitions(res.data.data);
        setisLoading(false);
      } catch (error) {
        setisLoading(false);
        //Error handling
      }
    };
    if (props.isOpen) {
      fetchDefinitions();
    }
  }, [props.isOpen]);

  const handleClose = () => {
    setselectedDefinitions([]);
    setdefinitions([]);
    props.handleClose();
  };
  const classes = useStyles();


  const onSearch = (searchValue) => {
    const searchText = searchValue?.target?.value?.toLowerCase() || '';
    
    if (!searchText) {
      setCurrentOptions(allOptions);
    } else {
      setCurrentOptions(
        allOptions.filter(option => 
          option.label.toLowerCase().includes(searchText)
        )
      );
    }
  };
  return (
    <>
      <Modal
        className=""
        open={props.isOpen}
        onClose={handleClose}
        onPrimaryButtonClick={() => props.addedDefns(selectedDefinitions)}
        onSecondaryButtonClick={() => props.handleClose()}
        primaryButtonLabel="Add"
        secondaryButtonLabel="Cancel"
        size="medium"
      >

        <div className={classes.dialogContent}>Select Definitions</div>
        <div style={{ position: "relative", zIndex: 2 }}>
          {isLoading ? (
            <Loader />
          ) : (
            <Select
              isOpen={isOpen}
              setIsOpen={setIsOpen}
              isWithSearch={true}
              isClearable={true}
              setCurrentOptions={setCurrentOptions}
              currentOptions={currentOptions}
              selectedOptions={selectedDefinitions}
              initialOptions={allOptions}
              setSelectedOptions={setselectedDefinitions}
              handleChange={(options) => setselectedDefinitions(options)}
              labelOrientation="left"
              isMulti={true}
              isSelectAll={isSelectAll}
              setIsSelectAll={setIsSelectAll}
              toggleSelectAll={true}
              onSearch={onSearch}              
            />
          )}
        </div>
      </Modal>
    </>
    
  );
};

const mapActionsToProps = {
  getDefinitions,
};
export default connect(null, mapActionsToProps)(DefinitionasSubRule);
