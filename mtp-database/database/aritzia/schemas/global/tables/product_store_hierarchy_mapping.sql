--liquibase formatted sql
--changeset rohan.santhosh@impactanalytics.co:product_store_hierarchy_mapping_0707_v5 stripComments:false splitStatements:false context:Release_1_0 labels:aritzia_product_store_hierarchy_mapping_0707-v5
--comment: updated changeset for product_store_hierarchy_mapping_0707_v5

CREATE TABLE "global".product_store_hierarchy_mapping (
    l0_name varchar NOT NULL,
    l1_name varchar NOT NULL,
    l2_name varchar NOT NULL,
	s0_name varchar NOT NULL,
    channel varchar NOT NULL,
    constraint product_store_hierarchy_mapping_pk primary key (l0_name, l1_name, l2_name, s0_name, channel)
);