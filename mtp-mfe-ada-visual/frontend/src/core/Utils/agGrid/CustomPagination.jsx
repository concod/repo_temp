import {useEffect, useState, forwardRef, useImperativeHandle } from "react";
import Pagination from "@mui/material/Pagination";
import { Select, MenuItem, FormControl } from '@mui/material';
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { pxToRem } from "../functions/utils";
import PaginationItem from '@mui/material/PaginationItem';
import { setPageLimit } from "core/actions/tableColumnActions";
import { useDispatch } from "react-redux";
import { setPageNumber } from "../../actions/tableColumnActions";

const useStyles = makeStyles((theme) => ({
  pagination: {
    "& .MuiPaginationItem-root": {
      minWidth: `${pxToRem(21)}`,
      height: `${pxToRem(20)}`,
      borderRadius: `${pxToRem(4)}`,
    },
    "& .MuiPaginationItem-root:not(.Mui-selected)": {
      color: theme.palette.textColours.slateGrayLight,
      "&:hover":{
        backgroundColor: theme.palette.lighter,
      }
    },
    "& .MuiFormControl-root": {
      paddingLeft: `${pxToRem(8)}`,
      paddingRight: `${pxToRem(12)}`,
    }
  },
  inputBox: {
    height: `${pxToRem(27)}`,
    minWidth:`${pxToRem(54)}`,
    borderRadius: `${pxToRem(4)}`,
    border: `${pxToRem(1)} ${theme.palette.text.disabled}`,
  },
  textStyle: {
    color: theme.palette.text.secondary,
  },
}))

// Exporting the component using forwardRef to allow access to its methods from the parent component
export default forwardRef((props, ref) => {
  // Pagination-related states
  const [totalNumberOfPage, setTotalNumberOfPage] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [maxPageVisited, setMaxPageVisited] = useState(0);
  const [maxRecord, setMaxRecord] = useState(0);
  const [pageSizeOptions, setPageSizeOptions] = useState([]);
  const [inputValue, setInputValue] = useState(10); // Default value for records shown per page
  const [firstIndexRecordNumber, setFirstIndexRecordNumber] = useState(null); // First record index on current page
  const [lastIndexRecordNumber, setLastIndexRecordNumber] = useState(null); // Last record index on current page
  const [totalRows, setTotalRows] = useState(0);
  const [showMore, setShowMore] = useState(false); // Flag to indicate if "more" to be shown when we don't know total number of rows.
  const [lastPage, setLastPage] = useState(false); // Flag to indicate if user is on the last page
  const [outOfData, setOutOfData] = useState(false); // Flag to indicate if data is exhausted

  const globalClasses = globalStyles();
  const classes = useStyles();
  const {api} = props;
  const dispatch = useDispatch();

  // Exposing functions via `useImperativeHandle` to allow parent component to trigger state changes
  useImperativeHandle(ref, () => {
    return {
      setShowMore: (showMore) => {
        setShowMore(showMore);
      },
      setLastPage: (lastPage) => {
        setLastPage(lastPage);
      },
      setOutOfData: (outOfData) => {
        setOutOfData(outOfData);
      },
    };
  });

  // Effect to handle when data is exhausted; navigates to the previous page
  useEffect(() => {
    if(outOfData){
      setTimeout(() => {
        api?.paginationGoToPreviousPage();
        setOutOfData(false);
      },0)
    }
  }, [outOfData])

  // Effect to update pagination information when the pagination changes
  useEffect(() => {
    const updatePaginationInfo = () => {
      setInputValue(Math.min(api?.paginationProxy?.pageSize, 100));
      setCurrentPage(api?.paginationGetCurrentPage()); // Update current page number
      setTotalNumberOfPage(api?.paginationGetTotalPages()); // Update total number of pages
      setTotalRows(api?.paginationGetRowCount()); // Update total row count
    };
    
    // Add event listener to detect pagination changes and update relevant states
    api?.addEventListener('paginationChanged', updatePaginationInfo);
    updatePaginationInfo(); // Call initially to set the state on mount
    
    // Clean up event listener when component unmounts
    return () => {
      api?.removeEventListener('paginationChanged', updatePaginationInfo);
    };

  }, [api]);

  // Handler function to change the page when user selects a different page
  const handleOnPaginationChange = (event, value) => {
    api?.paginationGoToPage(value - 1); // Navigate to the selected page (API uses zero-indexing)
  }

  // Effect to calculate and update the range of records displayed on the current page
  useEffect(() => {
    const pageSize = api?.paginationGetPageSize(); // Get current page size
    const firstIndexRecordNumber = Math.min(totalRows,(currentPage * pageSize + 1)); // Calculate first record index
    const lastIndexRecordNumber = Math.min(pageSize * (currentPage + 1), totalRows); // Calculate last record index
    setMaxRecord((prevMax) => (Math.max(prevMax, lastIndexRecordNumber)));
    setFirstIndexRecordNumber(firstIndexRecordNumber);
    setLastIndexRecordNumber(lastIndexRecordNumber);
  }, [currentPage, api?.paginationGetPageSize(), totalRows]);

  // Handler function to change the number of records shown per page
  const onhandleChange = (event) => {
    const newSize = event.target.value;
    setInputValue(newSize);
    api?.paginationSetPageSize(newSize); // Update the page size in the grid API
    api.gridOptionsWrapper.gridOptions.cacheBlockSize = newSize;
  }

  useEffect(() => {
    dispatch(setPageLimit(inputValue));
  }, [inputValue]);

  useEffect(() => {
    dispatch(setPageNumber(currentPage + 1))
  }, [currentPage])

  // Effect to dynamically update page size options based on total rows and page size
  useEffect(() => {
    if (totalRows !== undefined) {
      const rowArray = [];
      const totalNumberOfOptions = showMore ? Math.min(totalRows, 100) : Math.min(totalRows, 100) + 9; // Set the max page size options to 100
      for (let i = 10; i <= totalNumberOfOptions; i += 10) { // Add options in increments of 10
        rowArray.push(i);
      }
      setPageSizeOptions(rowArray);
    }
  }, [totalRows]);

  useEffect(() => {
    setMaxPageVisited(Math.ceil(maxRecord/inputValue));
  }, [currentPage, maxRecord, inputValue]);

  useEffect(() => {
    props.setDynamicRowBuffer(inputValue);
  }, [inputValue])

  return(
    <div className={`${classes.pagination} ${globalClasses.flexAlignBetweenCenter}`}>
      <Pagination 
        count={showMore ? maxPageVisited : totalNumberOfPage}
        page={currentPage + 1} // Set the current page (Pagination is 1-based, while API is 0-based)
        shape="rounded" 
        color="primary" 
        onChange={handleOnPaginationChange}
        renderItem={(item) => (
          showMore ? (
            <PaginationItem
              {...item}
              disabled={
                (item.type === "next" && lastPage) ||
                (item.type === "previous" && currentPage === 0)
             }
            />
          ) : (
            <PaginationItem
              {...item}
            />
          )
        )}
      />
      <div className={`${globalClasses.flexRow} ${globalClasses.verticalAlignCenter}`}>
        <span className={classes.textStyle}>Show records</span>
        <FormControl size="small">
          <Select
            value={inputValue}
            onChange={onhandleChange}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 172, // Set max height for dropdown
                  overflow: 'auto',
                },
              },
            }}
            renderValue={() => totalRows ? inputValue : 0}
            className={classes.inputBox}
          >
            {pageSizeOptions.map((option) => (
              <MenuItem key={option} value={option}>{option}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <span className={classes.textStyle}>{firstIndexRecordNumber} to {lastIndexRecordNumber} of {showMore ? "more" : totalRows} records</span> 
      </div>
    </div>
  )
});
