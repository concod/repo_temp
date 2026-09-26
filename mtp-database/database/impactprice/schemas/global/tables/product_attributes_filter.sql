--liquibase formatted sql
--changeset kumaran.k@impactanalytics.co:product_attributes_filter_v3  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_attributes_filter_3

DROP TABLE IF EXISTS "global".product_attributes_filter CASCADE;
CREATE TABLE IF NOT EXISTS "global".product_attributes_filter (
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
	buyer_id varchar NULL,
	buyer_description varchar NULL,
	l0_name varchar NOT NULL,
	l1_name varchar NULL,
	l2_name varchar NULL,
	l3_name varchar NULL,
	l0_code varchar NULL,
	l0_description varchar NULL,
	l1_code varchar NULL,
	l1_description varchar NULL,
	l2_code varchar NULL,
	l2_description varchar NULL,
	l3_code varchar NULL,
	l3_description varchar NULL,
	primaryupc varchar NULL,
	description varchar NULL,
	wmsdescription varchar NULL,
	create_date date NULL,
	retail_unit float8 NULL,
	retail_measure varchar NULL,
	product_type varchar NULL,
	seasonal int4 NULL,
	active_code varchar NULL,
	pspd_item bool NULL,
	iosub_group int4 NULL,
	manufacturer_id varchar NULL,
	manufacturer varchar NULL,
	brand_id varchar NULL,
	brand varchar NULL,
	inventory_manager_id varchar NULL,
	inventory_manager varchar NULL,
	merchandiser_id varchar NULL,
	merchandiser varchar NULL,
	financeclassname text NULL,
	pspd_vendor_id varchar NULL,
	pspd_vendor varchar NULL,
	msrp float8 NULL,
	imap float8 NULL,
	"map" float8 NULL,
	inset int4 NULL,
	stopped int4 NULL,
	sell_start_date date NULL,
	sell_end_date date NULL,
	psp_kit int4 NULL,
	flash_sales bool NULL,
	preferred_brand bool NULL,
	psp_store_count int4 NULL,
	wnw_store_count int4 NULL,
	product_bucket_code varchar NULL,
	CONSTRAINT product_attributes_filter_pk PRIMARY KEY (product_code, l0_name),
	CONSTRAINT product_attributes_filter_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
)
PARTITION BY LIST (l0_name);
CREATE INDEX product_attributes_filter_l0_name_idx ON global.product_attributes_filter USING btree (l0_name);
CREATE INDEX product_attributes_filter_product_code_idx ON global.product_attributes_filter USING btree (product_code);


--changeset kumaran.k@impactanalytics.co:product_attributes_filter_v4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added manufacturer_cuq product_attributes_filter_v3
ALTER TABLE "global".product_attributes_filter
ADD COLUMN manufacturer_cuq varchar NULL;

--changeset siddharth.bajpai@impactanalytics.co:product_attributes_filter_alters stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_attributes_filter
--comment: ALTER statements for global.product_attributes_filter

ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS article varchar NOT NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS clearance_date date NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS color varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS color_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l0_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l0_id_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l1_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l1_id_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l2_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l2_id_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l3_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l3_id_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l3_name_brand varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l4_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l4_id_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l4_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l5_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l5_id_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l5_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l6_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l7_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l7_id_name varchar NOT NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS l7_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS launch_date date NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS launch_price float8 NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS lifecycle varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS markdown_ind varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS product_channel varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS psa_codes text[] NOT NULL DEFAULT '{}';
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS rcl_hash jsonb NOT NULL DEFAULT '{}';
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS season_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS season_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS "size" varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS size_name varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS sku varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS style varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS style_color_id varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS supersede_flag varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS vendor varchar NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS vendor_case_pack varchar NULL;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS active_code CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS brand CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS brand_id CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS buyer_description CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS buyer_id CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS create_date CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS description CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS financeclassname CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS flash_sales CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS imap CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS inset CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS inventory_manager CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS inventory_manager_id CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS iosub_group CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l0_code CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l0_description CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l1_code CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l1_description CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l2_code CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l2_description CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l3_code CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS l3_description CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS manufacturer CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS manufacturer_id CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS "map" CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS merchandiser CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS merchandiser_id CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS msrp CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS preferred_brand CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS primaryupc CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS product_type CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS psp_kit CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS psp_store_count CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS pspd_item CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS pspd_vendor CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS pspd_vendor_id CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS retail_measure CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS retail_unit CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS seasonal CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS sell_end_date CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS sell_start_date CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS stopped CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS wmsdescription CASCADE;
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS wnw_store_count CASCADE;
ALTER TABLE global.product_attributes_filter ALTER COLUMN product_description TYPE varchar;
ALTER TABLE global.product_attributes_filter ALTER COLUMN product_bucket_code TYPE int8 USING NULLIF(product_bucket_code, '')::bigint;
ALTER TABLE global.product_attributes_filter ALTER COLUMN replacement_product_codes TYPE text[] USING replacement_product_codes::text[];
ALTER TABLE global.product_attributes_filter ALTER COLUMN replacement_product_codes SET NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN replacement_product_codes SET DEFAULT '{}';
ALTER TABLE global.product_attributes_filter ALTER COLUMN reference_product_codes TYPE text[] USING reference_product_codes::text[];
ALTER TABLE global.product_attributes_filter ALTER COLUMN reference_product_codes SET NOT NULL;
ALTER TABLE global.product_attributes_filter ALTER COLUMN reference_product_codes SET DEFAULT '{}';

--changeset siddharth.bajpai@impactanalytics.co:product_attributes_filter_sync_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_attributes_filter
--comment: Sync product_attributes_filter with dev DB DDL - fix column types, add missing columns, fix indexes

-- Fix psa_codes, replacement_product_codes, reference_product_codes to use _varchar (varchar[]) instead of text[]
ALTER TABLE global.product_attributes_filter ALTER COLUMN psa_codes TYPE varchar[] USING psa_codes::varchar[];
ALTER TABLE global.product_attributes_filter ALTER COLUMN replacement_product_codes TYPE varchar[] USING replacement_product_codes::varchar[];
ALTER TABLE global.product_attributes_filter ALTER COLUMN reference_product_codes TYPE varchar[] USING reference_product_codes::varchar[];

-- Add missing columns
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS program_id int4 NULL;
ALTER TABLE global.product_attributes_filter ADD COLUMN IF NOT EXISTS program_name text NULL;

-- Drop manufacturer_cuq if it exists (not in dev DB DDL)
ALTER TABLE global.product_attributes_filter DROP COLUMN IF EXISTS manufacturer_cuq CASCADE;
