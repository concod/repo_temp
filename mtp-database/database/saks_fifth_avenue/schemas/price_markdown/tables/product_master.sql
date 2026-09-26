--liquibase formatted sql
--changeset liquibase:product_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master

CREATE TABLE price_markdown.product_master (
	l0_id int4 NULL,
	l0_name text NULL,
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
	l4_id int8 NULL,
	l4_name text NULL,
	l4_cuq text NULL,
	l4_cid int4 NULL,
	brand text NULL,
	brand_cid int4 NULL,
	org_brand text NULL,
	l5_id int8 NULL,
	l5_cuq text NULL,
	l5_cid int4 NULL,
	style_id int8 NULL,
	style_cuq text NULL,
	style_desc text NULL,
	mfg_no int8 NULL,
	mfg_name text NULL,
	product_id int8 NULL,
	product_name text NULL,
	product_cuq text NULL,
	msrp float8 NULL,
	launch_price float8 NULL,
	current_price float8 NULL,
	"cost" float8 NULL,
	ecom_shipping_cost int4 NULL,
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
	store_age int4 NULL,
	ecom_age int4 NULL,
	max_age int4 NULL,
	age_month_bucket text NULL,
	fob text NULL,
	original_style_desc text NULL
);
CREATE INDEX product_master_mkd_product_id_idx ON price_markdown.product_master USING btree (product_id);


--changeset kumaran.k@impactanalytics.co:product_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add new columns to product_master table

ALTER TABLE price_markdown.product_master
ADD COLUMN  st_bnm float4 NULL,
ADD COLUMN  st_ecom float4 NULL,
ADD COLUMN  clearance_eligible_bnm int4 NULL,
ADD COLUMN  clearance_eligible_ecom int4 NULL,
ADD COLUMN  last_reg_price_bnm float4 NULL,
ADD COLUMN  last_reg_price_ecom float4 NULL;


--changeset kumaran.k@impactanalytics.co:product_master_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add clearance_eligible to product_master table

ALTER TABLE price_markdown.product_master
ADD COLUMN  clearance_eligible int4 NULL;


--changeset kumaran.k@impactanalytics.co:product_master_markdown_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add new columns to product_master_markdown_v3 table

ALTER TABLE price_markdown.product_master
ALTER COLUMN ecom_shipping_cost
TYPE float4
USING ecom_shipping_cost::float4;

--changeset kumaran.k@impactanalytics.co:prod_master_mkd_v5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: datatype change to prod_master_mkd_v5 table

ALTER TABLE price_markdown.product_master
    ALTER COLUMN l0_id TYPE text,
    ALTER COLUMN l1_id TYPE text,
    ALTER COLUMN l2_id TYPE text,
    ALTER COLUMN l3_id TYPE text,
    ALTER COLUMN l4_id TYPE text,
    ALTER COLUMN l5_id TYPE text,
    ALTER COLUMN style_id TYPE text,
    ALTER COLUMN mfg_no TYPE text;