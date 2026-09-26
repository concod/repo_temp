--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_channel_config_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_channel_config_10


CREATE TABLE base_pricing_restaurant.bp_channel_config (
    hierarchy_level VARCHAR(15) NOT NULL,
    channel_id VARCHAR(15) NULL,
    channel_cid INT4 NULL,
    channel_name VARCHAR(100) NULL,
    is_store_editable BOOLEAN DEFAULT false
);