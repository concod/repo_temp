--liquibase formatted sql
--changeset darsh.badukle@impactanalytics.co:dc_to_dc_static_list stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--inventory_smart.dc_to_dc_static_list

CREATE TABLE inventory_smart.dc_to_dc_master (
    source_dc           VARCHAR,
    destination_dc      VARCHAR,
    source_region       VARCHAR,
    destination_region  VARCHAR,
    dc_group            VARCHAR,
    channel             VARCHAR,
    priority            INT,
    PRIMARY KEY (source_dc, destination_dc)
);
