--liquibase formatted sql
--changeset shreyansh.pathak@impactanalytics.co:ItemFact_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for itemfact_sku table

DROP TABLE IF EXISTS item_smart.itemfact_sku;

CREATE TABLE item_smart.itemfact_sku (
	dept text NULL,
	hierarchy_code int8 NULL,
	launch_date date NULL,
	markdown_date date NULL,
	vendor_name text NULL,
	exit_date date NULL,
	no_of_reg_weeks int8 NULL,
	lead_time int8 NULL,
	baseline_discount float8 NULL,
	moq int4 NULL,
	presentation_min int4 NULL,
	fwos_target int4 NULL,
	auc float4 NULL,
	aoh_flag bool NULL,
	launch_date_feed date NULL,
	markdown_date_feed date NULL,
	vendor_name_feed text NULL,
	exit_date_feed date NULL,
	no_of_reg_weeks_feed int8 NULL,
	lead_time_feed int8 NULL,
	moq_feed int4 NULL,
	presentation_min_feed int4 NULL,
	auc_feed float4 NULL,
	fwos_target_feed int4 NULL,
	baseline_discount_feed float8 NULL,
	aoh_flag_feed bool NULL,
	launch_date_is_source_feed bool DEFAULT true NULL,
	markdown_date_is_source_feed bool DEFAULT true NULL,
	vendor_name_is_source_feed bool DEFAULT true NULL,
	exit_date_is_source_feed bool DEFAULT true NULL,
	no_of_reg_weeks_is_source_feed bool DEFAULT true NULL,
	lead_time_is_source_feed bool DEFAULT true NULL,
	moq_is_source_feed bool DEFAULT true NULL,
	presentation_min_is_source_feed bool DEFAULT true NULL,
	auc_is_source_feed bool DEFAULT true NULL,
	fwos_target_is_source_feed bool DEFAULT true NULL,
	baseline_discount_is_source_feed bool DEFAULT true NULL,
	aoh_flag_is_source_feed bool DEFAULT true NULL,
	CONSTRAINT unique_itemfact_sku UNIQUE (dept, hierarchy_code)
)
PARTITION BY LIST (dept);



--changeset abhimanyu.j@impactanalytics.co:ItemFact_2 stripComments:false splitStatements:false context:Release_1_1 labels:itemsmart_alter
--comment: Alter itemfact_sku table to add clearance_date columns and drop unused columns

-- Add new columns
ALTER TABLE item_smart.itemfact_sku 
ADD COLUMN clearance_date DATE,
ADD COLUMN clearance_date_feed DATE,
ADD COLUMN clearance_date_is_source_feed BOOLEAN;

-- Drop unused columns
ALTER TABLE item_smart.itemfact_sku 
DROP COLUMN IF EXISTS markdown_date,
DROP COLUMN IF EXISTS vendor_name,
DROP COLUMN IF EXISTS markdown_date_feed,
DROP COLUMN IF EXISTS vendor_name_feed,
DROP COLUMN IF EXISTS no_of_reg_weeks,
DROP COLUMN IF EXISTS moq,
DROP COLUMN IF EXISTS presentation_min,
DROP COLUMN IF EXISTS fwos_target,
DROP COLUMN IF EXISTS auc,
DROP COLUMN IF EXISTS aoh_flag,
DROP COLUMN IF EXISTS no_of_reg_weeks_feed,
DROP COLUMN IF EXISTS moq_feed,
DROP COLUMN IF EXISTS presentation_min_feed,
DROP COLUMN IF EXISTS fwos_target_feed,
DROP COLUMN IF EXISTS auc_feed,
DROP COLUMN IF EXISTS aoh_flag_feed,
DROP COLUMN IF EXISTS markdown_date_is_source_feed,
DROP COLUMN IF EXISTS vendor_name_is_source_feed,
DROP COLUMN IF EXISTS no_of_reg_weeks_is_source_feed,
DROP COLUMN IF EXISTS moq_is_source_feed,
DROP COLUMN IF EXISTS presentation_min_is_source_feed,
DROP COLUMN IF EXISTS fwos_target_is_source_feed,
DROP COLUMN IF EXISTS auc_is_source_feed,
DROP COLUMN IF EXISTS aoh_flag_is_source_feed,
DROP CONSTRAINT IF EXISTS unique_itemfact_sku;

-- Recreate the constraint if needed on just (dept, hierarchy_code)
ALTER TABLE item_smart.itemfact_sku 
ADD CONSTRAINT unique_itemfact_sku UNIQUE (dept, hierarchy_code);