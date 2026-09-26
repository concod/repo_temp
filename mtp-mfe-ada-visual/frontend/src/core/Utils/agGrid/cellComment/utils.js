import { getAllTableComments, setActiveTableInfo, setIsAddCommentPopupOpen } from "./cell-comment-services";
import {
  doesFirstLetterStartsWithASymbol,
  getTextFromHTML,
} from "core/commonComponents/ChatSystem/utils";
// Function that generates random color codes based on the first name of the user
export const getRandomProfileColor = (userName) => {
  if (userName === localStorage.getItem("user")) {
    return "#3BB273";
  } else {
    const hash = userName?.split(" ")
      ?.reduce((acc, char) => acc + char?.charCodeAt(0), 0);
    const hue = hash % 360;
    const color = `hsl(${hue}, 70%, 60%)`;
    return color;
  }
};

// Function to fetch all of the comments for the table
export const fetchTableComments = async (rowIds, tableName, appDetails) => {
  const formattedRowIds = rowIds?.map((row) => ({
    component_id: String(row),
  }));
  let payload = {
    component_type: tableName,
    application_code: appDetails?.applicationCode,
    screen_code: appDetails?.screenCode,
    components: formattedRowIds,
  };
  const request = await getAllTableComments(payload);
  return request?.data;
};

// Function to return the relative time based on the timestamp passed
export const getRelativeTime = (timestamp) => {
  const inputDate = new Date(timestamp).setHours(0, 0, 0, 0);
  const today = new Date().setHours(0, 0, 0, 0);

  const diffInDays = (today - inputDate) / (1000 * 60 * 60 * 24);

  if (diffInDays === 0) return "Today";
  if (diffInDays === 1) return "1 Day Ago";
  if (diffInDays > 1) return `${Math.floor(diffInDays)} Days Ago`;
  return "";
};

// Function to handle menu open for dropdown menu
export const handleMenuOpen = (event, action) => {
  action({
    isMenuOpen: true,
    anchorEl: event.target,
  });
};

// Function to handle menu close for dropdown menu
export const handleMenuClose = (action) => {
  action({
    isMenuOpen: false,
    anchorEl: null,
  });
};

// Function to return the list of users who have posted a comment in the thread.
const getUsersInvolved = (commentList) => {
  const usersInvolved = new Set();
  const users = commentList
    .map((comment) => comment?.created_by?.user_name)
    .filter((name) => {
      if (!usersInvolved.has(name)) {
        usersInvolved.add(name);
        return true;
      }
      return false;
    });
  return Array.from(users);
};

// Function to return the list of cellComments based on a filter, currently handling comments posted today
const filterCommentList = (commentList, filter, rowId, visibleRowIds) => {
  let commentsToDisplay = [];
  switch (filter) {
    case "today": {
      commentsToDisplay = commentList?.filter((comment) => {
        let date = new Date().toDateString();
        let commentDate = new Date(comment?.created_at).toDateString();
        return date === commentDate;
      });
      break;
    }
    default: {
      commentsToDisplay = commentList;
    }
  }
  return commentsToDisplay;
};

// Function to generate the list of comments to display in the sidepanel
export const generateCommentList = (commentsData, filter, visibleRowIds) => {
  const result = [];
  Object.entries(commentsData).forEach(([rowId, rowData]) => {
      rowData.sub_components.forEach((subComponent) => {
        Object.entries(subComponent).forEach(([columnName, columnData]) => {
        let users = getUsersInvolved(columnData?.cell_comments);
          result.push({
            ...columnData,
            cell: `${columnName}_${rowId}`,
            participants: users,
          });
        });
      });
  });
  return result;
};

export const handleCommentInputChange = (
  event,
  setInputValue,
  setCurrentWordIndex,
  setHasSuggestions
) => {
  const sanitizedData = getTextFromHTML(event.currentTarget.innerHTML);
  setInputValue(sanitizedData.replace(/\s+/g, " ").trim());
  if (
    doesFirstLetterStartsWithASymbol(
      event,
      "@",
      setCurrentWordIndex,
      "cell-comment-input"
    )
  ) {
    setHasSuggestions(true);
  } else {
    setHasSuggestions(false);
  }
};

export const scrollIntoView = (ref) => {
  setTimeout(() => {
    ref?.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, 1000);
};

export const handleCellClick = (event, deps) => {
  const {
    enableCellComment,
    tableName,
    dispatch,
    showComment,
    setShowComment,
    requestUrl,
    appliedFilters,
  } = deps;

  if (event.rowIndex != null && event.column) {
    const cellElement = document.querySelector(
      `.ag-row[row-index="${
        event.rowIndex
      }"] .ag-cell[col-id="${event.column.getId()}"]`
    );
    // If cell if found and if the cell is not the checkbox selection cell
    if (
      enableCellComment &&
      tableName &&
      cellElement &&
      event?.colDef?.field !== "Selection"
    ) {
      dispatch(
        setActiveTableInfo({
          tableId: tableName,
          rowId:
            `${event?.data?.[event?.data?.extraData?.uniqueRowId]}` ||
            `${event?.node?.id}`,
          columnName: event?.colDef?.field,
          requestUrl: requestUrl,
          appliedFilters: appliedFilters,
        })
      );
      setShowComment({
        ...showComment,
        ref: cellElement,
        showCellCommentButton: true,
      });
    } else {
      setShowComment({
        showCellCommentButton: false,
        ref: null,
      });
    }
  } else {
    dispatch(setIsAddCommentPopupOpen(false));
    setShowComment({
      showCellCommentButton: false,
      ref: null,
    });
  }
};