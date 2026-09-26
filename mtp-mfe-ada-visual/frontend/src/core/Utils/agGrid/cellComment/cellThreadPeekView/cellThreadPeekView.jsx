import { makeStyles } from "@mui/styles";
import { pxToRem } from "core/Utils/functions/utils";
import globalStyles from "core/Styles/globalStyles";
import { Typography } from "@mui/material";
import { getRandomProfileColor, getRelativeTime } from "../utils";
import { addUsersMentioned } from "core/commonComponents/ChatSystem/utils";

const useStyles = makeStyles((theme) => ({
  peekViewBody: {
    width: pxToRem(350),
    maxWidth: pxToRem(350),
    borderRadius: `0rem ${pxToRem(16)} ${pxToRem(16)} ${pxToRem(16)}`,
    boxShadow: `0px 0px 4px 0px #0000001f`,
    minHeight: pxToRem(80),
    background: theme.palette.common.white,
    border: `1px solid  ${theme.palette.background.separaterColor}`,
    padding: pxToRem(8),
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
  },
  username: {
    fontWeight: 600,
    maxWidth:pxToRem(200),
    fontSize: pxToRem(14),
    lineHeight: pxToRem(21),
    color: theme.palette.text.black,
    fontFamily: "Manrope",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    overflow:"hidden"
  },
  helperText: {
    fontWeight: 500,
    fontSize: pxToRem(12),
    lineHeight: pxToRem(15),
    color: theme.palette.colours.neutralGrey,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  highlight: {
    display: "inline",
    color: theme.palette.colours.brightRoyalBlue,
    cursor: "pointer",
    fontSize: "1em",
    fontWeight: 500,
    lineHeight: "1.25rem",
    wordBreak: "break-word",
  },
  gapFour: {
    gap: pxToRem(4),
  },
  commentText: {
    lineHeight: pxToRem(20),
    fontSize: pxToRem(14),
    fontWeight: 500,
    color: theme.palette.text.black,
    fontFamily: "Manrope",
    boxSizing: "border-box",
    marginTop: pxToRem(13.5),
    textOverflow:"ellipsis",
    maxWidth:pxToRem(314)
  },
}));
const CellThreadPeekView = ({ props }) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const {
    user_name = null,
    created_at,
    comment = "",
    users_mentioned=[]
  } = props?.cell_comments?.[0];

  return (
    <>
      <div
        className={`${classes.peekViewBody} ${globalClasses.layoutAlignStart} ${globalClasses.verticalAlignStart} ${classes.gapFour}`}
      >
        <div>
          <Typography
            variant={"text"}
            sx={{
              background: getRandomProfileColor(
                user_name || props?.cell_comments?.[0]?.created_by?.user_name
              ),
            }}
            className={`${globalClasses.centerAlign}  ${classes.profileIcon}`}
          >
            {user_name?.slice(0, 1) ||
              props?.cell_comments?.[0]?.created_by?.user_name?.slice(0, 1)}
          </Typography>
        </div>
        <div>
          <div
            style={{
              marginTop: pxToRem(7.5),
              gap: pxToRem(4),
            }}
            className={`${globalClasses.flexRow} ${globalClasses.verticalAlignBaseline} ${classes.gapFour}`}
          >
            <Typography variant="text" className={classes.username}>
              {user_name || props?.cell_comments?.[0]?.created_by?.user_name}
            </Typography>
            <Typography variant="text" className={classes.helperText}>
              {getRelativeTime(props?.cell_comments?.[0]?.created_at)}
            </Typography>
          </div>
          <div
            className={classes.commentText}
            dangerouslySetInnerHTML={{
              __html: addUsersMentioned(
                props?.cell_comments?.[0]?.comment,
                users_mentioned,
                classes.highlight
              ),
            }}
          ></div>
        </div>
      </div>
    </>
  );
};

export default CellThreadPeekView;
