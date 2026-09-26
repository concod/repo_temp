--liquibase formatted sql
--changeset liquibase:duplicate_downstream_data stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for duplicate_downstream_data
CREATE TABLE IF NOT EXISTS inventory_smart.duplicate_downstream_data (
    allocation_code   VARCHAR      NOT NULL,
    article           VARCHAR      NOT NULL,
    store             VARCHAR      NOT NULL,
    retail_size_cd    VARCHAR      NOT NULL,
    dc_codes          VARCHAR[]    NOT NULL,
    agg_data          JSONB        NOT NULL
);

--changeset liquibase:duplicate_downstream_data_V1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Adding created_at column
ALTER TABLE inventory_smart.duplicate_downstream_data ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;