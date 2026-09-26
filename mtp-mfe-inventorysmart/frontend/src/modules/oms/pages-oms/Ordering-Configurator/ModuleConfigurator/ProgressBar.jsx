import * as React from "react";
import { styled } from "@mui/material/styles";
import LinearProgress, {
  linearProgressClasses,
} from "@mui/material/LinearProgress";
import { Box, Typography } from "@mui/material";

const BorderLinearProgress = styled(LinearProgress)(({ theme, value }) => ({
  height: 5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: "transparent",
  },
  [`& .${linearProgressClasses.bar}`]: {
    backgroundColor: value === 2.5 ? "#FAA0A0" : "#98FB98",
  },
}));

const ProgressBar = ({ percentage }) => {
  return (
    <Box sx={{ width: "100%" }}>
      {percentage > 0 ? (
        <Box sx={{ minWidth: 35 }}>
          <Typography
            sx={{ textAlign: "center" }}
            variant="body2"
            color="text.secondary"
          >{`${Math.round(percentage)}%`}</Typography>
        </Box>
      ) : (
        <></>
      )}
      {percentage > 0 ? (
        <BorderLinearProgress variant="determinate" value={percentage} />
      ) : (
        <BorderLinearProgress variant="determinate" value={2.5} />
      )}
    </Box>
  );
};

export default ProgressBar;
