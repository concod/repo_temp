--liquibase formatted sql
--changeset liquibase:tb_customer_channel_filter_mapping_v1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_customer_channel_filter_mapping_v1

CREATE TABLE IF NOT EXISTS "global".tb_customer_channel_filter_mapping (
    c0_id int4 NOT NULL,
    s0_id int4 NOT NULL,
    filters_to_enable text NOT NULL,
    CONSTRAINT tb_cust_chnl_fil_pk PRIMARY KEY (c0_id, s0_id, filters_to_enable)
);