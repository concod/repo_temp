import React from "react";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";

const Details = (props) => {
  const { data } = props;

  const getDetails = (data) => {
    return data.map((item) => {
      const [label, value] = item;

      return (
        <Stack spacing={1}>
          <Typography
            color="textSecondary"
            variant="caption"
            sx={{ marginBottom: 4 }}
          >
            {label}
          </Typography>
          <Typography>{value ?? "-"}</Typography>
        </Stack>
      );
    });
  };

  return (
    <div>
      <Stack
        direction="row"
        useFlexGap
        spacing={{ xs: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
        sx={{
          marginTop: 2,
          display: "inline-flex",
          flexWrap: "wrap",
          padding: "20px",
          backgroundColor: "#F3F9FF",
        }}
        divider={<Divider orientation="vertical" flexItem />}
      >
        {getDetails(data)}
      </Stack>
    </div>
  );
};

export default Details;
