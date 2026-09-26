--liquibase formatted sql
--changeset liquibase:product_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master - added serial 4

CREATE TABLE price_promo.product_master (
	l0_id text NULL,
	l0_name text NULL,
	l0_cuq text NULL,
	l0_cid int4 NULL,
	l1_id text NULL,
	l1_name text NULL,
	l1_cuq text NULL,
	l1_cid int4 NULL,
	l2_id text NULL,
	l2_name text NULL,
	l2_cuq text NULL,
	l2_cid int4 NULL,
	l3_id text NULL,
	l3_name text NULL,
	l3_cuq text NULL,
	l3_cid int4 NULL,
	l4_id text NULL,
	l4_name text NULL,
	l4_cuq text NULL,
	l4_cid int4 NULL,
	brand text NULL,
	brand_cid int4 NULL,
	org_brand text NULL,
	l5_id text NULL,
	l5_name text NULL,
	l5_cuq text NULL,
	l5_cid int4 NULL,
	product_id int8 NULL,
	product_name text NULL,
	product_cuq text NULL,
	mfg_no text NULL,
	mfg_name text NULL,
	msrp float8 NULL,
	launch_price float8 NULL,
	current_price float8 NULL,
	"cost" float8 NULL,
	ecom_shipping_cost float4 NULL,
	phase_id text NULL,
	phase_desc text NULL,
	launch_date date NULL,
	eol_flag text NULL,
	lifecycle_indicator text NULL,
	clearance_indicator int4 NULL,
	dropship_indicator text NULL,
	bopis text NULL,
	status text NULL,
	active bool NULL,
	is_active int4 NULL,
	fob text NULL,
	org_l3_id text NULL,
	org_l3_cuq text NULL,
	org_l5_id text NULL
);
CREATE INDEX product_master_product_id_idx ON price_promo.product_master USING btree (product_id);
CREATE INDEX product_master_promo_product_id_idx ON price_promo.product_master USING btree (product_id);

--changeset liquibase:product_master_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master - added serial 4


-- Step 1: Add new columns that don't exist in old schema
ALTER TABLE price_promo.product_master
ADD COLUMN IF NOT EXISTS brandsku text,
ADD COLUMN IF NOT EXISTS currency text,
ADD COLUMN IF NOT EXISTS l6_id text,
ADD COLUMN IF NOT EXISTS l6_name text,
ADD COLUMN IF NOT EXISTS l6_cuq text,
ADD COLUMN IF NOT EXISTS l6_cid int4,
ADD COLUMN IF NOT EXISTS msrp_with_vat float4,
ADD COLUMN IF NOT EXISTS current_price_with_vat float4,
ADD COLUMN IF NOT EXISTS cost_usd float4,
ADD COLUMN IF NOT EXISTS lifecycle text,
ADD COLUMN IF NOT EXISTS drop_ship text,
ADD COLUMN IF NOT EXISTS status_id int4,
ADD COLUMN IF NOT EXISTS light_type_id int4,
ADD COLUMN IF NOT EXISTS light_type text,
ADD COLUMN IF NOT EXISTS realism_id int4,
ADD COLUMN IF NOT EXISTS realism text,
ADD COLUMN IF NOT EXISTS size_id int4,
ADD COLUMN IF NOT EXISTS "size" text,
ADD COLUMN IF NOT EXISTS ecom_age int4,
ADD COLUMN IF NOT EXISTS max_age int4,
ADD COLUMN IF NOT EXISTS store_age int4,
ADD COLUMN IF NOT EXISTS age_month_bucket text,
ADD COLUMN IF NOT EXISTS vat_rate_per float4,
ADD COLUMN IF NOT EXISTS sku text,
ADD COLUMN IF NOT EXISTS avg_sale_price float4,
ADD COLUMN IF NOT EXISTS avg_sale_price_with_vat float4,
ADD COLUMN IF NOT EXISTS currency_id int4,
ADD COLUMN IF NOT EXISTS derived_status text,
ADD COLUMN IF NOT EXISTS derived_status_id int4,
ADD COLUMN IF NOT EXISTS last_reg_price_bnm int4,
ADD COLUMN IF NOT EXISTS last_reg_price_bnm_with_vat int4,
ADD COLUMN IF NOT EXISTS last_reg_price_ecom float4,
ADD COLUMN IF NOT EXISTS last_reg_price_ecom_with_vat float4,
ADD COLUMN IF NOT EXISTS current_price_with_vat_usd float4,
--ADD COLUMN IF NOT EXISTS lifecycle_indicator_id int4,
ADD COLUMN IF NOT EXISTS msrp_with_vat_usd float4;

-- Step 3: Add new column current_price_usd (referenced in new schema)
ALTER TABLE price_promo.product_master
ADD COLUMN IF NOT EXISTS current_price_usd float4;

--changeset liquibase:product_master_4 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master3 - added serial 4


-- Step 1: Add new columns that don't exist in old schema
ALTER TABLE price_promo.product_master
ADD COLUMN IF NOT EXISTS lifecycle_indicator_id int4;