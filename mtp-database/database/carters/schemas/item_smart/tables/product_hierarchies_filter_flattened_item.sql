--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:product_hierarchies_filter_flattened_item_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for product_hierarchies_filter_flattened_item

CREATE TABLE IF NOT EXISTS item_smart.product_hierarchies_filter_flattened_item (
	hierarchy_code numeric NULL,
	"level" int4 NULL,
	country text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	"style" text NULL,
	oms_style text NULL,
	replenishment_flag bool NULL,
	l0_name text NULL
);

--changeset shreyansh.pathak@impactanalytics.co:product_hierarchies_filter_flattened_item_v2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.product_hierarchies_filter_flattened_item ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shreyansh.pathak@impactanalytics.co:l1_name stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.product_hierarchies_filter_flattened_item
ADD COLUMN IF NOT EXISTS channel TEXT,
ADD COLUMN IF NOT EXISTS article TEXT,
ADD COLUMN IF NOT EXISTS active BOOLEAN;
