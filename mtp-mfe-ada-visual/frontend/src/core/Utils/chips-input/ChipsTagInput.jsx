import React from "react";
import Tags from "@yaireo/tagify/dist/react.tagify";
import "@yaireo/tagify/dist/tagify.css";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme)=>({
  myTags:{
    width: "100%",
    border: "1px solid #ACACAC",
    borderRadius: "0.1875rem",
    '& .tagify__tag' :{
      maxWidth: 'calc(100% - 18px)',
      '&:hover': {
        background: "#D3E2E2"
      },
      
      '& > div > *' : {
        whiteSpace: "nowrap !important",
        width: "-webkit-fill-available",
        marginRight: 14
      }
    },
    '& .tagify__tag__removeBtn': {
      position: "absolute",
      right: 0
    }
    
  },
  tags_looks:{
    '& .tagify__dropdown__item' : {
      display: "inline-block",
      verticalAlign: "middle",
      borderRadius: '3px',
      padding: '.3em .5em',
      border: '1px solid #CCC',
      background: '#F3F3F3',
      margin: '.2em',
      fontSize: '.85em',
      color: 'black',
      transition: '0s',
    }
  } 
}))

const ChipsTagInput = (props) => {
  const classes = useStyles();
  // Tagify settings object
  const settings = {
    delimiters: ['Enter'],
    duplicates: true,
    dropdown: {
      enabled: 0,
      position: "text",
    },
    whitelist: props.tagsInfo,
    userInput: true,
    classname: classes.tags_looks
  };

  const onBlur = (e) => {
    props.onBlur(e);
  };
  return (
    <>
      {props.tagsInfo && (
        <>
          <Tags
            settings={settings}
            className={classes.myTags}
            tagifyRef={props.tagifyRef}
            readOnly={props.isReadonly}
            onBlur={onBlur}
            value={props.value}
          />
        </>
      )}
    </>
  );
};

export default ChipsTagInput;
