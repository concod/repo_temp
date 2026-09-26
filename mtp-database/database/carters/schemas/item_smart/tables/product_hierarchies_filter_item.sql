--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:product_hierarchies_filter_item_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for product_hierarchies_filter_item
CREATE TABLE IF NOT EXISTS item_smart.product_hierarchies_filter_item (
	hierarchy_code numeric NULL,
	"level" int4 NULL,
	json_col jsonb NULL
);

--changeset shreyansh.pathak@impactanalytics.co:product_hierarchies_filter_item_v2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.product_hierarchies_filter_item ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;
