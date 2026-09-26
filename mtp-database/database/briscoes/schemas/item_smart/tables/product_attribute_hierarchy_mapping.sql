
--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:product_attribute_hierarchy_mapping000 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for product_attribute_hierarchy_mapping

CREATE TABLE IF NOT EXISTS item_smart.product_attribute_hierarchy_mapping (
	l0_name varchar NULL,
	l1_name varchar NULL,
	l3_name varchar NULL,
	l5_name varchar NULL,
	"attribute" json NULL
);


--changeset shrey.jaiswal@impactanalytics.co:product_attribute_hierarchy_mapping_change01 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: rename column name
ALTER TABLE item_smart.product_attribute_hierarchy_mapping RENAME COLUMN attribute TO "Attribute" ; 



--changeset shrey.jaiswal@impactanalytics.co:product_attribute_hierarchy_mapping_change2 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: adding l2_name column 
ALTER TABLE item_smart.product_attribute_hierarchy_mapping ADD l2_name varchar NULL;