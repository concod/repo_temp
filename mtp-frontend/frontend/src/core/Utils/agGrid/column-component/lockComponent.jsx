import React, { useEffect, useRef, useState } from "react";
import { LockOpenOutlined, LockOutlined } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";

import { ascendingOrderLabel, descendingOrderLabel } from "../constants";

const useStyles = makeStyles(() => ({
  TableHeaderWithLock: {
    display: "flex",
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
  },
}));

const LockComponent = ({ props, lockCellApi }) => {
  const [lockState, setLock] = useState(false);
  const classes = useStyles();
  const refButton = useRef(null);

  useEffect(() => {
    if (
      props?.api?.rowModel?.rootNode?.allLeafChildren?.[1]?.data?.cellLocked?.[
        props?.column?.colId
      ] === true
    )
      setLock(true);
  }, [
    props?.api?.rowModel?.rootNode?.allLeafChildren?.[1]?.data?.cellLocked?.[
      props?.column?.colId
    ],
  ]);

  const handleMenuClick = () => {
    props.showColumnMenu(refButton.current);
  };

  const handleLock = (isLocked) => {
    setLock(isLocked);
    lockCellApi(isLocked);
  };

  return (
    <>
      <div className={classes.TableHeaderWithLock}>
        {lockState ? (
          <LockOutlined
            onClick={() => handleLock(false, props)}
            fontSize="small"
            style={{ padding: "1px" }}
          />
        ) : (
          <LockOpenOutlined
            onClick={() => handleLock(true, props)}
            fontSize="small"
            style={{ padding: "1px" }}
          />
        )}
        <div
          className="ag-header-cell-text"
          style={{ textAlign: "center", whiteSpace: "normal", lineHeight: 1 }}
        >
          {props?.displayName}
        </div>
        <span
          className="ag-icon ag-icon-menu ag-header-icon bold"
          onClick={handleMenuClick}
          ref={refButton}
        />
      </div>
    </>
  );
};

export default LockComponent;
