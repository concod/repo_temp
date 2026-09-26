--liquibase formatted sql
--changeset liquibase:product_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master - added serial 4

CREATE TABLE price_promo.product_master (
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
	l5_name text NULL,
	l5_cuq text NULL,
	l5_cid int4 NULL,
	product_id int8 NULL,
	product_name text NULL,
	product_cuq text NULL,
	mfg_no int8 NULL,
	mfg_name text NULL,
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
	fob text NULL
);
CREATE INDEX product_master_product_id_idx ON price_promo.product_master USING btree (product_id);
CREATE INDEX product_master_promo_product_id_idx ON price_promo.product_master USING btree (product_id);


--changeset kumaran.k@impactanalytics.co:product_master_promo_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: add new columns to product_master_promo_v2 table

ALTER TABLE price_promo.product_master
ALTER COLUMN ecom_shipping_cost
TYPE float4
USING ecom_shipping_cost::float4;



--changeset abhishek.singh@impactanalytics.co:bxgy_percentage_v3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for price_promo.product_master

ALTER TABLE price_promo.product_master
    ALTER COLUMN l0_id TYPE text,
    ALTER COLUMN l1_id TYPE text,
    ALTER COLUMN l2_id TYPE text,
    ALTER COLUMN l3_id TYPE text,
    ALTER COLUMN l4_id TYPE text,
    ALTER COLUMN l5_id TYPE text,
    ALTER COLUMN mfg_no TYPE text;