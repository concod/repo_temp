--liquibase formatted sql
--changeset himansh.bhardwaj:product_store_hierarchy_mapping_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_store_hierarchy_mapping_version

CREATE TABLE "global".product_store_hierarchy_mapping_version (
    version_code int4 NOT NULL,
    id int4 NOT NULL,
    l0_name varchar NULL,
    l1_name varchar NULL,
    l2_name varchar NULL,
    l3_name varchar NULL,
    planning_group_name varchar NULL,
    country_id varchar NULL,
    channel varchar NULL,
    CONSTRAINT product_store_hierarchy_mapping_version_pk PRIMARY KEY (version_code, id)
)
PARTITION BY LIST (version_code);

-- global.product_store_hierarchy_mapping_version foreign keys

ALTER TABLE "global".product_store_hierarchy_mapping_version ADD CONSTRAINT product_store_hierarchy_mapping_version_code_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;