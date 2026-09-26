--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:itemfact_sku_week stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial_changeset_for_itemfact_sku_week
CREATE TABLE item_smart.itemfact_sku_week (
	dept text NOT NULL,
	hierarchy_code int8 NULL,
	current_week int8 NOT NULL,
	purchase_status text NULL,
	fwos int8 NULL,
	fwos_feed int8 NULL,
	fwos_is_source_feed bool DEFAULT true NULL,
	lead_time int8 NULL,
	lead_time_feed int8 NULL,
	lead_time_is_source_feed bool DEFAULT true NULL,
	damage_rate int8 NULL,
	damage_rate_feed int8 NULL,
	damage_rate_is_source_feed bool DEFAULT true NULL,
	moq float8 NULL,
	moq_feed float8 NULL,
	moq_is_source_feed bool DEFAULT true NULL,
	CONSTRAINT unique_itemfact_sku_week UNIQUE (hierarchy_code, dept, current_week)
)
PARTITION BY LIST (dept);

--changeset abhimanyu.j@impactanalytics.co:itemfact_sku_week stripComments:false splitStatements:false context:Release_index labels:itemfact_sku_week-fix
--comment: added alter stmt

ALTER TABLE item_smart.itemfact_sku_week
DROP COLUMN purchase_status,
DROP COLUMN fwos,
DROP COLUMN fwos_feed,
DROP COLUMN fwos_is_source_feed,
DROP COLUMN lead_time,
DROP COLUMN lead_time_feed,
DROP COLUMN lead_time_is_source_feed,
DROP COLUMN moq,
DROP COLUMN moq_feed,
DROP COLUMN moq_is_source_feed,
DROP COLUMN damage_rate,
DROP COLUMN damage_rate_feed,
DROP COLUMN damage_rate_is_source_feed;

ALTER TABLE item_smart.itemfact_sku_week
ADD COLUMN eligibility bool,
ADD COLUMN eligibility_feed bool,
ADD COLUMN eligibility_is_source_feed bool;

--changeset saksham.gupta@impactanalytics.co:itemfact_sku_week stripComments:false splitStatements:false context:Release_index labels:itemfact_sku_week
--comment: added alter stmt for itemfact_sku_week

ALTER TABLE item_smart.itemfact_sku_week
ADD COLUMN receipt int4,
ADD COLUMN receipt_feed int4,
ADD COLUMN receipt_is_source_feed bool,
ADD COLUMN receipt_split float8,
ADD COLUMN receipt_split_feed float8,
ADD COLUMN receipt_split_is_source_feed bool;