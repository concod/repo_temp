import React, { useState } from "react";
import { Checkbox, Typography } from "@mui/material";
import { Tag } from "impact-ui";
import makeStyles from "@mui/styles/makeStyles";
import globalStyles from "core/Styles/globalStyles";
import Carousel from "react-simply-carousel";
import { capitalize } from "lodash";

const useStyles = makeStyles((theme) => ({
  checkBox: {
    border: `1px solid ${theme.palette.text.disabled}`,
    borderRadius: "0.25rem",
  },
  divider: {
    borderRight: `1px solid ${theme.palette.primary.main}`,
  },
  masterDivider: {
    borderRight: `1px solid ${theme.palette.text.disabled}`,
  },
  masterGroupWrapper: {
    padding: "0.5rem",
    border: `1px solid blue`,
  },
  nameConatainer: {
    overflow: "hidden",
    whiteSpace: "nowrap",
  },
  name: {
    width: "6rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  groupWrapper: {
    padding: "0.5rem",
    border: `1px solid ${theme.palette.primary.main}`,
    borderRadius: "0.25rem",
    width: `calc(100% - 3rem)`,
  },
  groupedCarouselWrapper: {
    flexBasis: "100%",
    maxWidth: "100%",
    flexWrap: "wrap",
    gap: "0.25rem",
  },
  tag: {
    paddingInline: "0.5rem",
  },
}));

const GroupedCarousel = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const { groupConfig, isMasterGroup = false, checkedList = [] } = { ...props };
  const [activeSlide, setActiveSlide] = useState(0);

  return (
    <div
      className={`${classes.groupedCarouselWrapper} ${globalClasses.flexRow}`}
    >
      <div className={classes.checkBox}>
        <Checkbox
          checked={checkedList.includes(groupConfig.groupId)}
          onChange={() => {
            props.handleGroupCheck(
              !checkedList.includes(groupConfig.groupId),
              groupConfig.groupId
            );
          }}
          inputProps={{ "aria-label": "controlled" }}
          id={groupConfig.groupId}
        />
      </div>
      {isMasterGroup ? (
        <div
          className={`${classes.masterGroupWrapper} ${globalClasses.flexRow}`}
        >
          <div
            className={`${globalClasses.centerAlign} ${classes.nameConatainer}`}
          >
            <Typography
              variant="body1"
              component="span"
              className={classes.name}
              title={groupConfig.masterGroupName}
            >
              {groupConfig.masterGroupName}
            </Typography>
          </div>
          <div className={classes.masterDivider} />
          <div className={globalClasses.marginBottom}>
            <div className={`${classes.groupWrapper} ${globalClasses.flexRow}`}>
              <div
                className={`${globalClasses.centerAlign} ${classes.nameConatainer}`}
              >
                <Typography
                  variant="body2"
                  component="span"
                  className={classes.name}
                  title={groupConfig.groupName}
                >
                  {groupConfig.groupName}
                </Typography>
              </div>
              <div className={classes.divider} />
              {Boolean(groupConfig.colGroup.length) && (
                <Carousel
                  containerProps={{
                    style: {
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: "0.5rem",
                      userSelect: "none",
                    },
                  }}
                  infinite={false}
                  disableSwipeByMouse
                  disableNavIfEdgeVisible
                  preventScrollOnSwipe
                  swipeTreshold={60}
                  activeSlideIndex={activeSlide}
                  onRequestChange={setActiveSlide}
                  forwardBtnProps={{
                    children: ">",
                    style: {
                      width: 20,
                      height: 30,
                      alignSelf: "center",
                      order: 3,
                    },
                  }}
                  backwardBtnProps={{
                    children: "<",
                    style: {
                      width: 20,
                      height: 30,
                      alignSelf: "center",
                      order: 2,
                      marginLeft: "auto",
                    },
                  }}
                  itemsToShow={2}
                  speed={400}
                  centerMode={false}
                >
                  {groupConfig.colGroup.map((tag) => {
                    return (
                      <Tag
                        isRemovable={true}
                        key={tag.value}
                        onClose={(_event) => props.onRemoveColumn(tag.value)}
                      >
                        {capitalize(tag.label)}
                      </Tag>
                    );
                  })}
                </Carousel>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className={`${classes.groupWrapper} ${globalClasses.flexRow}`}>
          <div
            className={`${globalClasses.centerAlign} ${classes.nameConatainer}`}
          >
            <Typography
              variant="body2"
              component="span"
              className={classes.name}
              title={groupConfig.groupName}
            >
              {groupConfig.groupName}
            </Typography>
          </div>
          <div className={classes.divider} />
          {Boolean(groupConfig.colGroup.length) && (
            <Carousel
              containerProps={{
                style: {
                  width: "100%",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  gap: "0.5rem",
                  userSelect: "none",
                },
              }}
              infinite={false}
              disableSwipeByMouse
              disableNavIfEdgeVisible
              preventScrollOnSwipe
              swipeTreshold={60}
              activeSlideIndex={activeSlide}
              onRequestChange={setActiveSlide}
              forwardBtnProps={{
                children: ">",
                style: {
                  width: 20,
                  height: 30,
                  alignSelf: "center",
                  order: 3,
                },
              }}
              backwardBtnProps={{
                children: "<",
                style: {
                  width: 20,
                  height: 30,
                  alignSelf: "center",
                  order: 2,
                  marginLeft: "auto",
                },
              }}
              itemsToShow={2}
              speed={400}
              centerMode={false}
            >
              {groupConfig.colGroup.map((tag) => {
                return (
                  <div className={classes.tag}>
                    <Tag
                      isRemovable={true}
                      key={tag.value}
                      onClose={(_event) => props.onRemoveColumn(tag.value)}
                    >
                      {capitalize(tag.label)}
                    </Tag>
                  </div>
                );
              })}
            </Carousel>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupedCarousel;
