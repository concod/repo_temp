import PropTypes from "prop-types";
import { useEffect } from "react";
import ConfigurationsTable from "./configurationsTable";
import { Container } from "@mui/material";

const Configuration = (props) => {
  const id = props.id;
  useEffect(() => {
    //When there is a change in ID, we fetch table data from the API
  }, [id]);

  return (
    <>
      <Container maxWidth={false}>
        <ConfigurationsTable id={id} />
      </Container>
    </>
  );
};

Configuration.propTypes = {
  id: PropTypes.any.isRequired,
};

export default Configuration;
