import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import { Box, Divider } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useStyles } from "./styles";

const style = {
  p: 2,
  width: "100%",
  borderRadius: 2,
  border: "1px solid",
  borderColor: "divider",
  backgroundColor: "background.paper",
  display: "flex",
  flexDirection: "column",
};

const ListItems = ({ handleClose, tooltipData }) => {
  const classes = useStyles();
  return (
    <Box onClick={(e) => e.stopPropagation()} sx={style}>
      <CloseIcon
        sx={{
          marginLeft: "auto",
          width: "fit-content",
          color: "grey",
          height: "1rem",
          "&:hover": {
            cursor: "pointer",
          },
        }}
        onClick={(e) => {
          handleClose(e);
          e.stopPropagation();
        }}
      ></CloseIcon>
      <List sx={{ p: 0 }}>
        {tooltipData?.filter(tooltipInfo => tooltipInfo && tooltipInfo.title).map((tooltipInfo, index) => {
          return (
            <div key={index}>
              <ListItem sx={{ p: 0, pt: index > 0 ? 1 : 0 }}>
                <ListItemText>
                  <div className={classes.listHeader}>{tooltipInfo?.title || ""}</div>
                </ListItemText>
              </ListItem>
              {tooltipInfo?.listItems?.map((listItem, i) => {
                return (
                  <ListItem
                    sx={{
                      pl: 0,
                      pr: 0,
                      pt: 0,
                      pb: i === tooltipInfo.listItems.length - 1 ? 1 : 0,
                    }}
                    key={i}
                  >
                    <ListItemText>
                      <div className={classes.listSubHeader}>{listItem}</div>
                    </ListItemText>
                  </ListItem>
                );
              })}
              {index === tooltipData.length - 1 ? (
                <></>
              ) : (
                <Divider component="li" light />
              )}
            </div>
          );
        })}
      </List>
    </Box>
  );
};

export default ListItems;
