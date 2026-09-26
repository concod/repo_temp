--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:product_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment:product_master_1

CREATE TABLE pricesmart.product_master (
	brandsku text NULL,
	l0_name text NULL,
	currency text NULL,
	l0_id int4 NULL,
	l0_cuq text NULL,
	l0_cid int4 NULL,
	l1_id int4 NULL,
	l1_name text NULL,
	l1_cuq text NULL,
	l1_cid int4 NULL,
	l2_id int4 NULL,
	l2_name text NULL,
	l2_cuq text NULL,
	l2_cid int4 NULL,
	l3_id int4 NULL,
	l3_name text NULL,
	l3_cuq text NULL,
	l3_cid int4 NULL,
	l4_id int4 NULL,
	l4_name text NULL,
	l4_cuq text NULL,
	l4_cid int4 NULL,
	brand int4 NULL,
	brand_cid int4 NULL,
	org_brand int4 NULL,
	l5_id int4 NULL,
	l5_name text NULL,
	l5_cuq text NULL,
	l5_cid int4 NULL,
	l6_id text NULL,
	l6_name text NULL,
	l6_cuq text NULL,
	l6_cid int4 NULL,
	product_id int4 NOT NULL,
	product_name text NULL,
	product_cuq text NULL,
	msrp_with_vat float4 NULL,
	current_price_with_vat float4 NULL,
	cost_usd float4 NULL,
	lifecycle text NULL,
	drop_ship text NULL,
	status_id int4 NULL,
	status text NULL,
	light_type_id int4 NULL,
	light_type text NULL,
	realism_id int4 NULL,
	realism text NULL,
	size_id int4 NULL,
	"size" text NULL,
	ecom_age int4 NULL,
	max_age int4 NULL,
	store_age int4 NULL,
	age_month_bucket text NULL,
	vat_rate_per float4 NULL,
	sku text NULL,
	avg_sale_price float4 NULL,
	avg_sale_price_with_vat float4 NULL,
	currency_id int4 NULL,
	msrp float4 NULL,
	current_price float4 NULL,
	current_price_usd float4 NULL,
	active bool NULL,
	is_active int4 NULL,
	clearance_indicator int4 NULL,
	derived_status text NULL,
	derived_status_id int4 NULL,
	"cost" float4 NULL,
	last_reg_price_bnm int4 NULL,
	last_reg_price_bnm_with_vat int4 NULL,
	last_reg_price_ecom float4 NULL,
	last_reg_price_ecom_with_vat float4 NULL,
	current_price_with_vat_usd float4 NULL,
	msrp_with_vat_usd float4 NULL,
	CONSTRAINT product_master_mkd_pk PRIMARY KEY (product_id)
);
CREATE INDEX product_master_mkd_product_id_idx ON pricesmart.product_master USING btree (product_id);

--changeset siddharth.bajpai@impactanalytics.co:product_master_alters stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_master
--comment: ALTER statements for pricesmart.product_master

ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS brand_cuq varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS brand_id int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS endcap_flag varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS eol_flag varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS hierarchy_id int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS imap varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS it int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS kvi_indicator int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS last_sold varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS launch_date varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS launch_price int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS lifecycle_indicator varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS lifecycle_indicator_id varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS manufacturer varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS manufacturer_cid int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS manufacturer_cuq varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS manufacturer_id int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS map varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS merchandiser varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS merchandiser_cid int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS merchandiser_cuq varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS merchandiser_id int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS merchant_mail_id varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS movement int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS oh int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS oo int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS original_uom varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS preferred_brand bool NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS price_bucket varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS price_bucket_cid varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS primary_upc int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS product_description varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS promo_base_price int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS promo_base_price_valid_from varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS promo_base_price_valid_to varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS psp_store_count varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS pspd_cost varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS pspd_item varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS size_bucket varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS size_bucket_cid int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS total_inventory int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS type varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS uam_hierarchy_id varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS uom varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS uom_cid varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS version_code varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS wnw_store_count varchar(200) NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS launch_price_with_vat numeric NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS l7_id int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS l7_name text NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS l7_cid int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS l7_cuq text NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS customer_choice_id int4 NULL;
ALTER TABLE pricesmart.product_master ADD COLUMN IF NOT EXISTS customer_choice_description text NULL;


--changeset surya.avinash@impactanalytics.co:product_master_drop stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_master
--comment: ALTER statements for pricesmart.product_master

ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS avg_sale_price cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS avg_sale_price_with_vat cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS brandsku cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS currency cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS current_price_usd cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS current_price_with_vat_usd cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS derived_status cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS derived_status_id cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS drop_ship cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS light_type cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS light_type_id cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS msrp_with_vat_usd cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS org_brand cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS realism cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS realism_id cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS sku cascade;
ALTER TABLE pricesmart.product_master DROP COLUMN IF EXISTS vat_rate_per cascade;

--changeset surya.avinash@impactanalytics.co:product_master_datatype stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_master
--comment: ALTER statements for pricesmart.product_master
ALTER TABLE pricesmart.product_master ALTER COLUMN brand TYPE varchar(200);

--changeset siddharth.bajpai@impactanalytics.co:drop_product_master_table_20251216 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:product_master
--comment: Drop product_master table to create view with same name

DROP TABLE IF EXISTS pricesmart.product_master CASCADE;