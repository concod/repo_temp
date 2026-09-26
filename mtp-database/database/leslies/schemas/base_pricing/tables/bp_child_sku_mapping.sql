--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_child_sku_mapping_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_child_sku_mapping_10

CREATE TABLE base_pricing.bp_child_sku_mapping (
    child_product_id int4 NOT NULL,
    master_product_id int4 NOT NULL,
    child_product_name varchar(255) NULL,
    item_clearance_dt date NULL,
    launch_date date NULL,
    active bool NOT NULL,
    
    CONSTRAINT bp_child_sku_mapping_pkey PRIMARY KEY (child_product_id)
);