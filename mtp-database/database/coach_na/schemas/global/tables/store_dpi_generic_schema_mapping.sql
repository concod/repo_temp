--liquibase formatted sql
--changeset manas.malik@impactanalytics.co:store_dpi_generic_schema_mapping_1 stripComments:false splitStatements:false context:Release_1.1 labels:store_dpi_generic_schema_mapping
--comment: changeset for store_dpi_generic_schema_mapping

CREATE TABLE global."store_dpi_generic_schema_mapping" (LIKE global.product_generic_schema_mapping INCLUDING ALL);
