--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:product_attribute_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for product_attribute_hierarchy_mapping

CREATE TABLE item_smart.product_attribute_hierarchy_mapping (
    l0_name varchar(50) NULL,
    l2_name varchar(50) NULL,
    l3_name varchar(50) NULL,
    l4_name varchar(50) NULL,
    l5_name varchar(50) NULL,
    "Attribute" json NULL
);


--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:product_attribute_hierarchy_mapping_change2 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: rename column name

ALTER TABLE item_smart.product_attribute_hierarchy_mapping RENAME COLUMN "Attribute" TO attributes; 


--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:product_attribute_hierarchy_mapping_change_3 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: rename column name

ALTER TABLE item_smart.product_attribute_hierarchy_mapping RENAME COLUMN attributes TO "Attribute" ; 

--changeset madhumitha.s@impactanalytics.co:product_attribute_hierarchy_mapping_new_01 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.product_attribute_hierarchy_mapping
ADD COLUMN IF NOT EXISTS l1_name TEXT ;