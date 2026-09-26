import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import {
  pxToRem,
  splitStringFromLastUnderscore,
} from "core/Utils/functions/utils";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import CheckIcon from "@mui/icons-material/Check";
import { Typography } from "@mui/material";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import {
  getRandomProfileColor,
  handleMenuOpen,
  handleMenuClose,
} from "../utils";
import { useDispatch } from "react-redux";
import {
  getRowForComments,
  setActiveTableInfo,
  setThreadPopupInfo,
} from "../cell-comment-services";
import colours from "core/Styles/colours";
import { isEmpty } from "lodash";

const useStyles = makeStyles((theme) => ({
  commentWrapper: {
    width: pxToRem(307),
    maxHeight: pxToRem(133),
    borderRadius: pxToRem(16),
    padding: pxToRem(8),
    cursor: "pointer",
  },
  selectedCard: {
    background: theme.palette.colours.softLightGrey,
  },
  commentActionWrapper: {
    gap: pxToRem(8),
  },
  participantsWrapper: {
    gap: pxToRem(4),
  },
  profileIcon: {
    width: pxToRem(36),
    aspectRatio: "1/1",
    borderRadius: pxToRem(12),
    border: `1px solid ${theme.palette.common.white}`,
    color: theme.palette.common.white,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(30),
    fontWeight: 800,
    fontFamily: "Manrope",
  },
  repliesWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: pxToRem(8),
    marginTop: pxToRem(8),
    cursor: "pointer",
  },
  username: {
    fontWeight: 600,
    fontSize: pxToRem(14),
    lineHeight: pxToRem(21),
    color: theme.palette.text.black,
    fontFamily: "Manrope",
    maxWidth: pxToRem(198),
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  commentText: {
    lineHeight: pxToRem(15),
    fontSize: pxToRem(12),
    fontWeight: 500,
    color: theme.palette.text.black,
    fontFamily: "Manrope",
    textOverflow: "ellipsis",
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  commentInfoWrapper: {
    gap: pxToRem(4),
  },
  menuIcon: {
    width: pxToRem(32),
    aspectRatio: "1/1",
    color: theme.palette.colours.neutralGrey,
    cursor: "pointer",
  },
  finishedCommentIcon: {
    width: pxToRem(20),
    aspectRatio: "1/1",
    borderRadius: "50%",
    border: `1px solid ${theme.palette.colours.brightRoyalBlue}`,
    color: theme.palette.colours.brightRoyalBlue,
    padding: pxToRem(2),
    cursor: "pointer",
  },
  helperText: {
    fontWeight: 500,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(15),
    color: theme.palette.colours.neutralGrey,
    cursor: "pointer",
  },
  menuBody: {
    width: pxToRem(150),
    borderRadius: pxToRem(12),
    border: `1px solid  ${theme.palette.colours.menuBorder}`,
    boxShadow: "0px 1px 6px 0px #1A277C24",
    padding: `${pxToRem(8)} ${pxToRem(6)}`,
    "& .MuiList-root": {
      padding: 0,
    },
  },
  menuItem: {
    width: pxToRem(138),
    height: pxToRem(36),
    padding: `${pxToRem(8)} ${pxToRem(12)}`,
  },
}));

const CommentBody = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const {
    commentList,
    selectedCard,
    index,
    setSelectedCard,
    activeTableInfo,
  } = props;
  const dispatch = useDispatch();
  const [actionsMenu, setActionsMenu] = useState({
    isMenuOpen: false,
    anchorEl: null,
  });

  /**
   * Navigates to and highlights the target cell in the grid based on the comment's cell reference
   */
  const redirectToCellComment = async () => {
    let columnName = splitStringFromLastUnderscore(commentList?.cell);
    let rowId = splitStringFromLastUnderscore(commentList?.cell, true);
    const api = props.gridApi;

    // Get total number of rows and rows per page
    const rowsPerPage = api.paginationGetPageSize();
    // Get the row node
    const rowNode = api.getRowNode(rowId);
    let targetRowIndex = -1;

    if (!isEmpty(rowNode)) {
      targetRowIndex = rowNode.rowIndex;
      // Calculate target page number (0-based)
      const targetPage = Math.floor(targetRowIndex / rowsPerPage);

      // Go to the target page
      api.paginationGoToPage(targetPage);

      // After page load, find and scroll to the cell
      setTimeout(() => {
        // Get the row node
        if (rowNode) {
          // Scroll to the row
          api.ensureNodeVisible(rowNode, "middle");

          // Focus the specific cell
          api.setFocusedCell(rowNode.rowIndex, columnName);

          // Optionally flash the cell to highlight it
          api.flashCells({
            rowNodes: [rowNode],
            columns: [columnName],
          });
        }
      }, 100);

      setSelectedCard(index);
    } else {
      //handling server side table
      setSelectedCard(index);
      api.setPinnedTopRowData([]);
      try{
        const request = await getRowForComments(commentList?.event_id, true);
        const response = await request;
        setTimeout(() => {
          const rowData = response?.data?.data?.row_data?.data?.[0];
          const extraData = {
            tableName: response?.data?.data?.table_name,
            uniqueRowId: response?.data?.data?.unique_column,
          };
          Object.assign(rowData, {
            extraData,
          });
          api.setPinnedTopRowData([rowData]);
          dispatch(
            setThreadPopupInfo({
              open: `${columnName}_${rowId}`,
              eventId: response?.data?.data?.event_id,
              isPanelRedirect: true,
            })
          );
        }, 100);
      } catch (error){
        console.error("redirectToCellComment => ",error);
      }
    }
  };

  return (
    <>
      {commentList?.cell_comments?.length > 0 && (
        <div
          className={`${classes.commentWrapper} ${
            selectedCard === index && classes.selectedCard
          }`}
        >
          <div className={globalClasses.flexAlignBetweenCenter}>
            <div
              className={`${globalClasses.centerAlign} ${classes.participantsWrapper}`}
            >
              {commentList?.participants
                ?.slice(0, 3)
                ?.map((participant, index) => (
                  <Typography
                    variant="text"
                    className={`${globalClasses.centerAlign}  ${classes.profileIcon}`}
                    sx={{ background: getRandomProfileColor(participant) }}
                  >
                    {participant?.slice(0, 1)}
                  </Typography>
                ))}
              {commentList?.participants?.length > 3 && (
                <Typography
                  variant="text"
                  className={`${globalClasses.centerAlign}  ${classes.profileIcon}`}
                  sx={{ background: colours.surfaceYellow }}
                >
                  +{commentList?.participants?.length - 3}
                </Typography>
              )}
            </div>
            {/* Disabling the menu containing copy link option  */}
            {/* {selectedCard === index && (
              <div
                className={`${classes.commentActionWrapper} ${globalClasses.flexAlignBetweenCenter}`}
              >
                <MoreHorizIcon
                  className={`${classes.menuIcon}`}
                  onClick={(event) => handleMenuOpen(event, setActionsMenu)}
                />
                <Menu
                  anchorEl={actionsMenu?.anchorEl}
                  open={actionsMenu?.isMenuOpen}
                  onClose={() => handleMenuClose(setActionsMenu)}
                  classes={{ paper: `${classes.menuBody} comment-panel-menu` }}
                >
                  <MenuItem
                    classes={{ root: classes.menuItem }}
                    onClick={() => handleMenuClose(setActionsMenu)}
                  >
                    Copy link
                  </MenuItem>
                </Menu>
              </div>
            )} */}
          </div>
          <div
            className={`${classes.repliesWrapper}`}
            onClick={() => {
              redirectToCellComment();
              dispatch(
                setThreadPopupInfo({
                  open: commentList?.cell,
                  eventId: commentList?.event_id,
                })
              );
              dispatch(
                setActiveTableInfo({
                  ...activeTableInfo,
                  rowId: splitStringFromLastUnderscore(commentList?.cell, true),
                  columnName: splitStringFromLastUnderscore(commentList?.cell),
                })
              );
            }}
          >
            {commentList?.cell_comments?.slice(0, 2)?.map((comment, index) => (
              <div
                key={`comment_${index}`}
                className={`${globalClasses.layoutAlignStart} ${globalClasses.verticalAlignCenter} ${classes.commentInfoWrapper}`}
              >
                <Typography variant="text" className={`${classes.username}`}>
                  {comment?.created_by?.user_name}
                </Typography>
                <Typography variant="text" className={`${classes.commentText}`}>
                  {comment?.comment}
                </Typography>
              </div>
            ))}
            {commentList?.comments_count > 2 && (
              <Typography variant="text" className={`${classes.helperText}`}>
                {commentList?.comments_count - 2}{" "}
                {commentList?.comments_count - 2 > 1 ? "replies" : "reply"}
              </Typography>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default CommentBody;
