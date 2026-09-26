--liquibase formatted sql
--changeset liquibase:product_store_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping

CREATE TABLE "global".product_store_hierarchy_mapping (
    l0_name varchar null,
    s0_id  varchar null,
    constraint s0_id_pk primary key(s0_id)
);