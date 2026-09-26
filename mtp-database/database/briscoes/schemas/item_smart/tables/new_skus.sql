--liquibase formatted sql
--changeset shrey.jaiswal@impactanalytics.co:new_skus000 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for new_skus

-- Drop table

-- DROP TABLE item_smart.new_skus;

CREATE TABLE IF NOT EXISTS item_smart.new_skus (
	hierarchy_code int4 NULL,
	l0_name text NULL,
	l1_name text NULL,
	l2_name text NULL,
	l3_name text NULL,
	l4_name text NULL,
	l5_name text NULL,
	product_code text NULL,
	article text NULL,
	product_name text NULL,
	"level" int2 NULL,
	product_id int4 NULL,
	product_type text NULL,
	receipt_date date NULL,
	article_season_name text NULL,
	article_season_year text NULL,
	brand_id text NULL,
	buyer_name text NULL,
	category_id text NULL,
	category_name text NULL,
	color text NULL,
	colour_char_name text NULL,
	colour_internal_char text NULL,
	generic_article_id text NULL,
	generic_article_name text NULL,
	info_capacity text NULL,
	order_unit text NULL,
	unit_of_issue text NULL,
	info_capsule text NULL,
	info_capsule_description text NULL,
	info_design text NULL,
	info_design_description text NULL,
	info_lifecycle text NULL,
	info_lifecycle_description text NULL,
	info_material_description text NULL,
	info_pattern_description text NULL,
	info_range_description text NULL,
	info_watts_description text NULL,
	merchandise_category_id text NULL,
	merchandise_category_name text NULL,
	purchasing_group_id text NULL,
	sub_category_id text NULL,
	sub_category_name text NULL,
	vendor_id text NULL,
	vendor_name text NULL,
	style_name text NULL,
	order_counter float8 NULL,
	replen_counter float8 NULL,
	parent_id text NULL,
	product_bucket_code int8 NULL,
	sales_org_name text NULL,
	l5_display_name text NULL,
	product_life_cycle text NULL,
	price float8 NULL,
	"cost" float8 NULL,
	original_price float8 NULL,
	clearance bool NULL,
	launch_date text NULL,
	clearance_date text NULL,
	exit_date date NULL,
	is_cadence_generated bool NULL,
	is_mapped bool NULL,
	mapped_product_code varchar NULL,
	mapped_product_code_description varchar NULL,
	updated_at timestamptz NULL,
	updated_by int4 NULL,
	product_description varchar NULL
);

--changeset shrey.jaiswal@impactanalytics.co:new_skus_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: changing datatype from text to date

ALTER TABLE item_smart.new_skus ALTER COLUMN launch_date TYPE date USING launch_date::date;
ALTER TABLE item_smart.new_skus ALTER COLUMN clearance_date TYPE date USING launch_date::date;

--changeset shrey.jaiswal@impactanalytics.co:new_skus_2 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: changing datatype from text to date

ALTER TABLE item_smart.new_skus ALTER COLUMN clearance_date TYPE date USING clearance_date::date;
ALTER TABLE item_smart.new_skus ALTER COLUMN launch_date TYPE date USING launch_date::date;

--changeset ayush.rajput@impactanalytics.co_add_default_value_col:drop and readd stripComments:false splitStatements:false context:Release_1_0 labels:new_skus_adding_column_1_adding_default_value
--comment: changing is_mapping default value

ALTER TABLE item_smart.new_skus ALTER COLUMN is_mapped SET DEFAULT false;

--changeset ayush.rajput@impactanalytics.co_cadence_add_default_value_col:drop and readd stripComments:false splitStatements:false context:Release_1_0 labels:new_skus_adding_column_1_adding_default_value
--comment: changing is_cadence default value
ALTER TABLE item_smart.new_skus ALTER COLUMN is_cadence_generated SET DEFAULT false;