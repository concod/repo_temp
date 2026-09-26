--liquibase formatted sql
--changeset liquibase:oms_supersession_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for oms_supersession_mapping

CREATE TABLE IF NOT EXISTS inventory_smart.oms_supersession_mapping (
    child_sku   VARCHAR NOT NULL,
    parent_sku  VARCHAR NOT NULL,
    from_date   DATE NOT NULL,
    to_date     DATE NOT NULL
);
