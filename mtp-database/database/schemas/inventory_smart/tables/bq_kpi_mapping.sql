--liquibase formatted sql
--changeset liquibase:bq_kpi_mapping stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: MTP-108633:initial changeset for bq_kpi_mapping
CREATE TABLE IF NOT EXISTS inventory_smart.bq_kpi_mapping (
    table_name VARCHAR(50),
    column_name VARCHAR(50),
    UNIQUE (table_name, column_name)
);

--changeset navin.chandan@impactanalytics.co:renamed_to_kpi_name stripComments:false splitStatements:false context:MTP-108633 labels:MTP-108633
--comment: Renamed column_name to kpi_name
ALTER TABLE inventory_smart.bq_kpi_mapping RENAME COLUMN column_name TO kpi_name;