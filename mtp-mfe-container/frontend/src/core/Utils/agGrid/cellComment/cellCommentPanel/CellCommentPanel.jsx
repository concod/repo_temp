import { Popper, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import globalStyles from "core/Styles/globalStyles";
import CommentBody from "./CommentBody";
import { useSelector, useDispatch } from "react-redux";
import { pxToRem } from "core/Utils/functions/utils";
import { Button, Select } from "impact-ui-v3";
import { useState, useEffect , useRef} from "react";
import { setIsPanelOpen } from "../cell-comment-services";
import { filterOptions } from "./constants";
import { generateCommentList } from "../utils";
import { isEmpty } from "lodash";
import { getAllCommentsForPanel } from "./cellCommentPanelActions";
import Loader from "core/Utils/Loader/loader";

const FilterSelect = ({ props }) => {
  const { selectedOptions, setSelectedOptions } = props;
  const classes = useStyles();
  const [isOpen, setIsOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(filterOptions);
  return (
    <div className={`${classes.commentPanelDropwdownWrapper}`}>
      <Select
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        currentOptions={currentOptions}
        setCurrentOptions={setCurrentOptions}
        initialOptions={filterOptions}
        selectedOptions={selectedOptions}
        setSelectedOptions={setSelectedOptions}
        name="comment-panel-select"
      />
    </div>
  );
};

const useStyles = makeStyles((theme) => ({
  commentPanel: {
    width: pxToRem(360),
    height: "calc(100vh - 56px)",
    background: "transparent",
    background: theme.palette.common.white,
    zIndex: 1302,
    left: "unset !important",
    right: 0,
    top: `${pxToRem(57)} !important`,
    borderRadius: pxToRem(6),
    padding: pxToRem(20),
    paddingRight:0,
    boxShadow: `-2px 0px 8px 0px ${theme.palette.colours.boxShadowCard}`,
  },
  commentPanelHeader: {
    paddingRight: pxToRem(20),
  },
  commentPanelHeaderText: {
    fontSize: pxToRem(20),
    fontWeight: 600,
    lineHeight: pxToRem(20),
    color: theme.palette.text.textDark,
    marginTop: pxToRem(10),
    fontFamily: "Manrope",
  },
  panelActionWrapper: {
    marginTop: pxToRem(17),
  },
  commentsWrapper: {
    marginTop: pxToRem(30),
    display: "flex",
    flexDirection: "column",
    gap: pxToRem(16),
    overflowY: "auto",
    minHeight: "20%",
  },
  commentPanelDropwdownWrapper: {
    "& .ia-select-styled-dropdown-main-button ": {
      border: "none",
      minWidth: "unset",
      maxWidth: pxToRem(160),
    },
    "& .ia-select-button-clear-icon": {
      display: "none",
    },
    "& .ia-select-button-text": {
      width: "unset",
    },
  },
}));
const CellCommentPanel = ({ props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const {
    isPanelOpen,
    tableCommentsData,
    activeTableInfo,
    activeApplicationInfo,
  } = useSelector((state) => state.cellCommentReducer);
  const { visibleRowIds = [] } = props;
  const [selectedCard, setSelectedCard] = useState(-1);
  const dispatch = useDispatch();
  const [commentList, setCommentList] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState(filterOptions?.[0]);
  const [isLoading, setIsLoading] = useState(true);
  const commentsWrapperRef = useRef(null);
  const appDetails = useSelector(
    (state) => state.commonChatReducer?.appDetails
  );
  useEffect(() => {    
    (async () => {
      if (
        isPanelOpen &&
        !isEmpty(activeApplicationInfo) && appDetails?.screenCode && activeTableInfo?.tableId &&
        !isEmpty(visibleRowIds)
      ) {
        setIsLoading(true);
        const payload = {
          component_type: activeTableInfo?.tableId,
          application_code: activeApplicationInfo?.applicationCode,
          screen_code: appDetails?.screenCode,
          components: visibleRowIds?.map((row) => ({
            component_id: String(row),
          })),
          filter: selectedOptions?.value,
        };
        const request = await getAllCommentsForPanel(payload, dispatch);
        if (request.status) {
          // Generating array of comments corresponding to different cells
          const list = generateCommentList(
            request?.data,
            selectedOptions?.value,
            visibleRowIds
          );
          setCommentList(list);
          setIsLoading(false);
        }
      }
    })();
  }, [
    tableCommentsData?.[activeTableInfo?.tableId],
    selectedOptions,
    isPanelOpen,
  ]);

  useEffect(() => {
    if (commentsWrapperRef.current) {
      const rect = commentsWrapperRef.current.getBoundingClientRect();
      const maxHeight = window.innerHeight - rect.top -20;
      commentsWrapperRef.current.style.maxHeight = `${maxHeight}px`;
    }
  }, [isPanelOpen, commentList]);
  return (
    <>
      <Popper
        className={`${classes.commentPanel}`}
        open={isPanelOpen}
        anchorEl={null}
        placement="top-end"
        modifiers={[
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
            },
          },
          {
            name: "offset",
            options: {
              offset: [0, 10],
            },
          },
        ]}
      >
        <div className="cellCommentPanel">
          <div
            className={`${globalClasses.verticalAlignStart} ${globalClasses.layoutAlignSpaceBetween} ${classes.commentPanelHeader}`}
          >
            <Typography
              variant="text"
              className={classes.commentPanelHeaderText}
            >
              Comments
            </Typography>
            <Button
              size="large"
              variant="url"
              icon={<span class="material-symbols-outlined">close</span>}
              onClick={() => {
                dispatch(setIsPanelOpen(false));
                setSelectedCard(-1)
              }}
            />
          </div>
          <Loader loader={isLoading} spinner>
            <div
              className={`${classes.panelActionWrapper} ${globalClasses.verticalAlignCenter} ${globalClasses.layoutAlignStart} ${globalClasses.gapHalf}`}
            >
              <Typography variant="text" className={classes.dropdownLabel}>
                Show :
              </Typography>
              <FilterSelect
                props={{
                  selectedOptions: selectedOptions,
                  setSelectedOptions: setSelectedOptions,
                }}
              />
            </div>

            <div
              className={`${classes.commentsWrapper}`}
              ref={commentsWrapperRef}
            >
              {commentList?.length > 0 ? (
                commentList.map((comment, index) => (
                  <CommentBody
                    commentList={comment}
                    setSelectedCard={setSelectedCard}
                    selectedCard={selectedCard}
                    index={index}
                    key={`commentCard_${index}`}
                    activeTableInfo={activeTableInfo}
                    gridApi={props?.gridApi}
                  />
                ))
              ) : (
                <Typography>No comments present</Typography>
              )}
            </div>
          </Loader>
        </div>
      </Popper>
    </>
  );
};

export default CellCommentPanel;
