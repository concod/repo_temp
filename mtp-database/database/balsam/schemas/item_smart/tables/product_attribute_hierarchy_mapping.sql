--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:product_attribute_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial_changeset_for_product_attribute_hierarchy_mapping
CREATE TABLE item_smart.product_attribute_hierarchy_mapping (
	l0_name varchar(500) NULL,
	l1_name varchar(500) NULL,
	l2_name varchar(500) NULL,
	l3_name varchar(500) NULL,
	l4_name varchar(500) NULL,
	l5_name varchar(500) NULL,
	"Attribute" json NULL
);
