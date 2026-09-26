import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import { TextField } from "@mui/material";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from '@mui/icons-material/LockOpen';
const LockableCell = ({ props }) => {
  const [showLock, setShowLock] = useState(false);
  const [cellLock, setCellLock] = useState(false);

  const LockCell = () => (
    <IconButton>
      {showLock && (
        <LockIcon onClick={() => setCellLock(true)} />
      )} 
    </IconButton>
  );
  const UnlockCell = () => (
    <IconButton>
      {showLock && (
        <LockOpenIcon onClick={() => setCellLock(false)} />
      )}
    </IconButton>
  );
  return (
    <>
      <TextField
        value={props.cellData?.value}
        InputProps={{ endAdornment:  cellLock ? <UnlockCell /> : <LockCell /> }}
        disabled = {cellLock}
        onFocus={() => {
          setShowLock(true);
        }}
        onMouseEnter={() => {
          setShowLock(true);
        }}
        onMouseLeave={() => {
          setShowLock(false);
        }}
      />
    </>
  );
};

export default LockableCell;
