--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:new_skus_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for new_skus

CREATE TABLE IF NOT EXISTS item_smart.new_skus (
	hierarchy_code numeric NULL,
	product_code text NULL,
	country text NULL,
	l0_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	"style" text NULL,
	"level" int4 NULL,
	price float8 NULL,
	"cost" float8 NULL,
	original_price float8 NULL,
	active bool NULL,
	clearance bool NULL,
	receipt_date date NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	replacement_product_codes _varchar NULL,
	reference_product_codes _varchar NULL,
	is_deleted bool NULL,
	article text NULL,
	brand text NULL,
	dtc_season text NULL,
	dtc_year text NULL,
	pfs_season text NULL,
	pfs_year text NULL,
	"size" text NULL,
	style_color_id text NULL,
	rtl_released_flg text NULL,
	l2_id text NULL,
	rtl_prnt_sty_dsc text NULL,
	planned_clearance_date date NULL,
	l3_id text NULL,
	floorset_date date NULL,
	sty_secondary_occsn_end_use_dsc text NULL,
	leg_type text NULL,
	prod_sku_key text NULL,
	l5_id text NULL,
	rtl_prnt_sty_id text NULL,
	"class" text NULL,
	season_yr_dsc text NULL,
	season_yr_cd text NULL,
	subclass_id text NULL,
	country_product text NULL,
	l11_id text NULL,
	clearance_flag text NULL,
	item_group_desc text NULL,
	sku text NULL,
	l4_id text NULL,
	product_bucket_code int8 NULL,
	rtl_shared_exclusive_dsc text NULL,
	collection text NULL,
	product_life_cycle text NULL,
	sleeve_length_dsc text NULL,
	in_stock_pct float8 NULL,
	rtl_prnt_sty_cd text NULL,
	launch_date date NULL,
	osv_flag text NULL,
	workstream text NULL,
	pln_clearance_dt_id date NULL,
	sleeve_type text NULL,
	dailysoopp float8 NULL,
	dailysou float8 NULL,
	msrp float8 NULL,
	l1_id text NULL,
	gender text NULL,
	prod_sz_key text NULL,
	item_group_id text NULL,
	reportable_season_dsc text NULL,
	collection_id text NULL,
	l10_id text NULL,
	subclass text NULL,
	leg_length_dsc text NULL,
	seltd_szs_dsc text NULL,
	season text NULL,
	sty_primary_occsn_end_use_dsc text NULL,
	availability_dt_id date NULL,
	class_id text NULL,
	clearance_date date NULL,
	l0_id int8 NULL,
	season_id text NULL,
	style_description text NULL,
	rcl_hash jsonb NULL,
	psa_codes _varchar NULL,
	psm_psa_codes _varchar NULL,
	sty_print_pattern_cd text NULL,
	upc_nbr text NULL,
	primary_vendor_cd text NULL,
	sz_rng_cd text NULL,
	hang_fold_cd text NULL,
	sty_primary_color_fam_cd text NULL,
	strtgy_lnch_dt_id date NULL,
	rtl_pricing_dsc text NULL,
	planning_level_dsc text NULL,
	primary_vendor_dsc text NULL,
	age text NULL,
	prod_sty_body_fiber_1_dsc text NULL,
	flex_space_strategy text NULL,
	prod_initiative text NULL,
	product_strategy text NULL,
	active_ladder_flg bool NULL,
	"ordering" text NULL,
	replenishment_status text NULL,
	replenishment_flag bool NULL,
	sub_style_test _text NULL,
	sub_styles _varchar NULL,
	clr_start_date date NULL,
	product_status text NULL,
	is_cadence_generated bool NULL,
	is_mapped bool NULL,
	mapped_product_code varchar NULL,
	mapped_product_code_description varchar NULL
);

--changeset sonika.baheti@impactanalytics.co:new_skus_2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  rename columns
ALTER TABLE item_smart.new_skus DROP COLUMN product_code;
ALTER TABLE item_smart.new_skus ADD product_type VARCHAR NULL;


--changeset shreyansh.pathak@impactanalytics.co:new_skus_chng3 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for hierarchy code column

ALTER TABLE item_smart.new_skus ALTER COLUMN hierarchy_code TYPE int8 USING hierarchy_code::int8;

--changeset shreyansh.pathak@impactanalytics.co:new_skus_chng4 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.new_skus ALTER COLUMN created_by TYPE int8 USING created_by::int8;
ALTER TABLE item_smart.new_skus ALTER COLUMN updated_by TYPE int8 USING updated_by::int8;

--changeset shreyansh.pathak@impactanalytics.co:l1_name stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: Updating data_type for columns

ALTER TABLE item_smart.new_skus
ADD COLUMN IF NOT EXISTS l1_name TEXT ;

--changeset hithesh.s@impactanalytics.co:new_skus_new_01 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: new_skus adding default value
ALTER TABLE item_smart.new_skus ALTER COLUMN is_cadence_generated SET DEFAULT false;
ALTER TABLE item_smart.new_skus ALTER COLUMN is_mapped SET DEFAULT false;
