--liquibase formatted sql
--changeset suchithra.pr@impactanalytics.co:product_attribute_hierarchy_mapping stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for product_attribute_hierarchy_mapping

CREATE TABLE item_smart.product_attribute_hierarchy_mapping (
	l0_name varchar(50) NULL,
	l1_name varchar(50) NULL,
	l2_name varchar(50) NULL,
	l3_name varchar(50) NULL,
	"Attribute" json NULL
);


--changeset pr.suchithra@impactanalytics.co:product_attribute_hierarchy_mapping_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: l4_name


ALTER TABLE item_smart.product_attribute_hierarchy_mapping ADD COLUMN IF NOT EXISTS l4_name varchar(50) NULL;

--changeset pr.suchithra@impactanalytics.co:product_attribute_hierarchy_mapping_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: collection

ALTER TABLE item_smart.product_attribute_hierarchy_mapping ADD COLUMN IF NOT EXISTS "collection" varchar(100) NULL;
ALTER TABLE item_smart.product_attribute_hierarchy_mapping ALTER COLUMN l0_name TYPE varchar(50) USING l0_name::varchar(100);
ALTER TABLE item_smart.product_attribute_hierarchy_mapping ALTER COLUMN l1_name TYPE varchar(50) USING l1_name::varchar(100);
ALTER TABLE item_smart.product_attribute_hierarchy_mapping ALTER COLUMN l2_name TYPE varchar(50) USING l2_name::varchar(100);
ALTER TABLE item_smart.product_attribute_hierarchy_mapping ALTER COLUMN l3_name TYPE varchar(50) USING l3_name::varchar(100);
ALTER TABLE item_smart.product_attribute_hierarchy_mapping ALTER COLUMN l4_name TYPE varchar(50) USING l4_name::varchar(100);

