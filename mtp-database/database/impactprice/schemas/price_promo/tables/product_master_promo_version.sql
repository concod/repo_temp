--liquibase formatted sql
--changeset liquibase:product_master_promo_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master_promo_version

CREATE TABLE price_promo.product_master_promo_version (
	article text NULL,
	active bool NULL,
	age_month_bucket text NULL,
	clearance_indicator int4 NULL,
	"cost" float4 NULL,
	cost_usd float4 NULL,
	currency_id int4 NULL,
	current_price float4 NULL,
	current_price_with_vat float4 NULL,
	ecom_age int4 NULL,
	eol_flag varchar NULL,
	hierarchy_id int4 NULL,
	is_active int4 NULL,
	it int4 NULL,
	kvi_indicator int4 NULL,
	l0_cid int4 NULL,
	l0_cuq text NULL,
	l0_id int4 NULL,
	l0_name text NULL,
	l1_cid int4 NULL,
	l1_cuq text NULL,
	l1_id int4 NULL,
	l1_name text NULL,
	l2_cid int4 NULL,
	l2_cuq text NULL,
	l2_id int4 NULL,
	l2_name text NULL,
	l3_cid int4 NULL,
	l3_cuq text NULL,
	l3_id int4 NULL,
	l3_name text NULL,
	l4_cid int4 NULL,
	l4_cuq text NULL,
	l4_id int4 NULL,
	l4_name text NULL,
	l5_cid int4 NULL,
	l5_cuq text NULL,
	l5_id int4 NULL,
	l5_name text NULL,
	l6_cid int4 NULL,
	l6_cuq text NULL,
	l6_id int4 NULL,
	l6_name text NULL,
	last_sold varchar NULL,
	launch_date varchar NULL,
	launch_price int4 NULL,
	lifecycle text NULL,
	lifecycle_indicator varchar NULL,
	max_age int4 NULL,
	merchant_mail_id varchar NULL,
	msrp float4 NULL,
	msrp_with_vat float4 NULL,
	oh int4 NULL,
	oo int4 NULL,
	price_bucket varchar NULL,
	price_bucket_cid varchar NULL,
	primary_upc int4 NULL,
	product_cuq text NULL,
	product_description varchar NULL,
	product_id int8 NULL,
	product_name text NULL,
	promo_base_price float8 NULL,
	promo_base_price_valid_from date NULL,
	promo_base_price_valid_to date NULL,
	"size" text NULL,
	size_bucket varchar NULL,
	size_bucket_cid int4 NULL,
	size_id int4 NULL,
	status text NULL,
	status_id int4 NULL,
	store_age int4 NULL,
	total_inventory int4 NULL,
	uam_hierarchy_id varchar NULL,
	launch_price_with_vat numeric NULL,
	l7_id int4 NULL,
	l7_name text NULL,
	l7_cid int4 NULL,
	l7_cuq text NULL,
	customer_choice_id int4 NULL,
	customer_choice_description text NULL,
	last_reg_price_bnm float4 NULL,
	last_reg_price_bnm_with_vat float4 NULL,
	last_reg_price_ecom float4 NULL,
	last_reg_price_ecom_with_vat float4 NULL,
	new_product_flag int4 NULL,
	version_code int4 NULL,
	program_id int4 NULL,
	program_name text NULL,
	CONSTRAINT product_mst_prm_v_version_unique_key UNIQUE (version_code, product_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX product_master_promo_v_product_id_idx ON price_promo.product_master_promo_version USING btree (product_id);

--changeset sreevathsa.sp:add_color_columns_20251224 stripComments:false splitStatements:false context:Release_1_0 labels:product_master_promo_version
--comment: Add color_cid and color_cuq columns to product_master_promo_version
ALTER TABLE price_promo.product_master_promo_version 
    ADD COLUMN color_cid int4 NULL,
    ADD COLUMN color_cuq text NULL;

--changeset harshith.mandli:rename_and_change_dtype_primary_upc_prod_description_20260330 stripComments:false splitStatements:false context:Release_1_0 labels:product_master_promo_version
--comment: Rename and change datatype for primary_upc and product_description columns to product_master_promo_version
ALTER TABLE price_promo.product_master_promo_version 
    DROP COLUMN IF EXISTS primary_upc,
    DROP COLUMN IF EXISTS product_description;

ALTER TABLE price_promo.product_master_promo_version 
    ADD COLUMN IF NOT EXISTS primaryupc text NULL,
    ADD COLUMN IF NOT EXISTS product_description text NULL;