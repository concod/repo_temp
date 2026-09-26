--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:itemfact_sku stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial_changeset_for_itemfact_sku

CREATE TABLE item_smart.itemfact_sku (
	dept text NULL,
	hierarchy_code int8 NULL,
	launch_date date NULL,
	exit_date date NULL,
	lead_time int8 NULL,
	baseline_discount float8 NULL,
	launch_date_feed date NULL,
	exit_date_feed date NULL,
	lead_time_feed int8 NULL,
	baseline_discount_feed float8 NULL,
	launch_date_is_source_feed bool DEFAULT true NULL,
	exit_date_is_source_feed bool DEFAULT true NULL,
	lead_time_is_source_feed bool DEFAULT true NULL,
	baseline_discount_is_source_feed bool DEFAULT true NULL,
	clearance_date date NULL,
	clearance_date_feed date NULL,
	clearance_date_is_source_feed bool NULL,
	CONSTRAINT unique_itemfact_sku UNIQUE (dept, hierarchy_code)
)
PARTITION BY LIST (dept);

--changeset abhimanyu.j@impactanalytics.co:itemfact_sku stripComments:false splitStatements:false context:Release_index labels:itemfact_sku-fix
--comment: added alter stmt

ALTER TABLE item_smart.itemfact_sku
DROP COLUMN baseline_discount,
DROP COLUMN baseline_discount_feed,
DROP COLUMN baseline_discount_is_source_feed,
DROP COLUMN clearance_date,
DROP COLUMN clearance_date_feed,
DROP COLUMN clearance_date_is_source_feed;


--changeset abhimanyu.j@impactanalytics.co:itemfact_sku_change_3 stripComments:false splitStatements:false context:Release_index labels:itemfact_sku-fix
--comment: added alter stmt
ALTER TABLE item_smart.itemfact_sku
ADD COLUMN  if not exists sellable_qty int4,
ADD COLUMN if not exists sellable_qty_feed int4,
ADD COLUMN if not exists sellable_qty_is_source_feed bool;

--changeset hari.krishna@impactanalytics.co:itemfact_sku stripComments:false splitStatements:false context:Release_index labels:itemfact_sku-fix
--comment: added alter stmt for itemfact_sku
ALTER TABLE item_smart.itemfact_sku 
ADD COLUMN store_count INTEGER,
ADD COLUMN store_count_feed INTEGER,
ADD COLUMN store_count_is_source_feed BOOLEAN,
ADD COLUMN MOQ INTEGER,
ADD COLUMN MOQ_feed INTEGER,
ADD COLUMN MOQ_is_source_feed BOOLEAN;