--liquibase formatted sql
--changeset siddharth.upadhyay@impactanalytics.co:product_attributes_filter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter
CREATE TABLE "global".product_attributes_filter (
    -- Mandatory fields
	product_code varchar NOT NULL,
	product_name varchar NOT NULL,
	product_description text NULL,
	price float8 NULL,
	"cost" float8 NULL,
	original_price float8 NULL,
	active bool NOT NULL,
	clearance bool NOT NULL,
	receipt_date date NULL,
	created_at timestamptz NULL,
	updated_at timestamptz NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	replacement_product_codes _varchar NULL,
	reference_product_codes _varchar NULL,
	is_deleted bool NULL,
    -- Patagonia specific attributes from generic schema mapping
	l0_name varchar NOT NULL,
	company_id varchar NULL,
	business_unit varchar NULL,
	apparel varchar NULL,
	division varchar NULL,
	l1_name varchar NOT NULL,
	team_code varchar NULL,
	team_description varchar NULL,
	l2_id varchar NULL,
	l2_name varchar NOT NULL,
	team_key varchar NULL,
	segment_code varchar NULL,
	segment_description varchar NULL,
	l3_id varchar NULL,
	l3_name varchar NOT NULL,
	category_code varchar NULL,
	category_description varchar NULL,
	l4_id varchar NULL,
	l4_name varchar NOT NULL,
	class_code varchar NULL,
	class_description varchar NULL,
	l5_id varchar NULL,
	l5_name varchar NOT NULL,
	department_code varchar NULL,
	department_description varchar NULL,
	vendor_id varchar NULL,
	vendor_name varchar NULL,
	style_id varchar NULL,
	style_description varchar NULL,
	l6_id varchar NULL,
	l6_name varchar NOT NULL,
	color_code varchar NULL,
	color_description varchar NULL,
	l7_id varchar NULL,
	l7_name varchar NOT NULL,
	generic_color varchar NULL,
	size_code varchar NULL,
	config varchar NULL,
	plm_status varchar NULL,
	item_status varchar NULL,
	fabric_content varchar NULL,
	wholesale_price_usd float8 NULL,
	launch_retail_price_usd float8 NULL,
	launch_wholesale_price_usd float8 NULL,
	product_launch_season varchar NULL,
	last_plm_push_season_id varchar NULL,
	last_active_design_season_id varchar NULL,
	last_active_design_year varchar NULL,
	last_active_design_season_name varchar NULL,
	is_dropped bool NULL,
	season_type varchar NULL,
	retail_margin_usd float8 NULL,
	retail_margin_percentage float8 NULL,
	wholesale_margin_usd float8 NULL,
	wholesale_margin_percentage float8 NULL,
	
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name)
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);
ALTER TABLE "global".product_attributes_filter ADD CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;

--changeset siddharth.upadhyay@impactanalytics.co:product_attributes_filter_chg1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  adding l0_id

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l0_id varchar NOT NULL;

--changeset siddharth.upadhyay@impactanalytics.co:product_attributes_filter_chg2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment:  adding l1_id

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS l1_id varchar NOT NULL;

--changeset siddharth.upadhyay@impactanalytics.co:product_attributes_filter_chg3 stripComments:false splitStatements:false context:Release_1_0 labels:
--comment:  wholesale_price_rc, launch_retail_price_rc, launch_wholesale_price_rc

ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS wholesale_price_rc float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS launch_retail_price_rc float8 NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS launch_wholesale_price_rc float8 NULL;

--changeset Shaik.Azmathulla@impactanalytics.co:partition_logic stripComments:false splitStatements:false context:Release_1_0 labels:partition_logic
--comment: Added the l1_name in PK for partition logic.

ALTER TABLE IF EXISTS global.product_attributes_filter DROP CONSTRAINT IF EXISTS product_attributes_filter_pk;
ALTER TABLE IF EXISTS global.product_attributes_filter ADD CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name, l1_name);

--changeset siddharth.upadhyay@impactanalytics.co:product_attributes_filter_chg4 stripComments:false splitStatements:false context:Release_1_0 labels:product_attributes_filter_chg4
--comment: Finalize schema to GSM-compliant fields

-- Add missing columns
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS article varchar NULL;
ALTER TABLE "global".product_attributes_filter ADD COLUMN IF NOT EXISTS product_bucket_code bigint NULL;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS apparel;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS segment_code;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS segment_description;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS category_code;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS category_description;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS class_code;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS class_description;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS style_id;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS style_description;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS color_code;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS color_description;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS retail_margin_usd;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS retail_margin_percentage;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS wholesale_margin_usd;
ALTER TABLE "global".product_attributes_filter DROP COLUMN IF EXISTS wholesale_margin_percentage;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN product_name DROP NOT NULL;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l0_id DROP NOT NULL;
ALTER TABLE "global".product_attributes_filter ALTER COLUMN l1_id DROP NOT NULL;