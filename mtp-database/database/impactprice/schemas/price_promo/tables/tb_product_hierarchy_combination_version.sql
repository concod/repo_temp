--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_product_hierarchy_combination_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_combination_version

CREATE TABLE IF NOT EXISTS price_promo.tb_product_hierarchy_combination_version (
	l0_id text NULL,
	l0_cid int4 NULL,
	l0_cuq text NULL,
	l1_id text NULL,
	l1_cid int4 NULL,
	l1_cuq text NULL,
	l2_id text NULL,
	l2_cid int4 NULL,
	l2_cuq text NULL,
	l3_id text NULL,
	l3_cid int4 NULL,
	l3_cuq text NULL,
	manufacturer_id text NULL,
	manufacturer_cid int4 NULL,
	manufacturer text NULL,
	merchandiser_id text NULL,
	merchandiser_cid int4 NULL,
	merchandiser text NULL,
	brand_id text NULL,
	brand_cid int4 NULL,
	brand text NULL,
	product_id int4 NULL,
	product_name text NULL,
	version_code int4 NOT NULL,
	vendor_id text NULL,
	vendor_cid int4 NULL,
	vendor text NULL,
	hierarchy_id int4 NULL,
	uom_id text NULL,
	uom_cid int4 NULL,
	uom text NULL,
	price_bucket_id text NULL,
	price_bucket_cid int4 NULL,
	price_bucket text NULL,
	size_bucket_id text NULL,
	size_bucket_cid int4 NULL,
	size_bucket text NULL,
	CONSTRAINT tb_hierarchy_cid_v_version_unique_key UNIQUE (version_code, product_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX tb_product_hierarchy_combination_v_product_id_idx ON price_promo.tb_product_hierarchy_combination_version USING btree (product_id);

--changeset sriraj.varanasi@impactanalytics.co:drop_column_prod_hier_comb stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: dropping columns
ALTER TABLE price_promo.tb_product_hierarchy_combination_version
DROP COLUMN product_name CASCADE,
DROP COLUMN product_id CASCADE;

--changeset kumaran.k@impactanalytics.co:add_column_prod_hier_comb_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: dropping columns
ALTER TABLE price_promo.tb_product_hierarchy_combination_version
add column manufacturer_cuq text,
add column merchandiser_cuq text,
add column brand_cuq text,
add column vendor_cuq text,
add column uom_cuq text,
add column price_bucket_cuq text,
add column size_bucket_cuq text;

--changeset siddharth.bajpai@impactanalytics.co:alter_tb_product_hierarchy_combination_version stripComments:false splitStatements:false context:Release_1_0 ignore:false
--comment: ALTER statements to sync schema with database

ALTER TABLE price_promo.tb_product_hierarchy_combination_version 
DROP COLUMN IF EXISTS price_bucket CASCADE,
DROP COLUMN IF EXISTS brand_cid CASCADE,
DROP COLUMN IF EXISTS brand CASCADE,
DROP COLUMN IF EXISTS brand_id CASCADE,
DROP COLUMN IF EXISTS uom CASCADE,
DROP COLUMN IF EXISTS merchandiser_cid CASCADE,
DROP COLUMN IF EXISTS size_bucket CASCADE,
DROP COLUMN IF EXISTS uom_id CASCADE,
DROP COLUMN IF EXISTS size_bucket_cid CASCADE,
DROP COLUMN IF EXISTS size_bucket_id CASCADE,
DROP COLUMN IF EXISTS merchandiser CASCADE,
DROP COLUMN IF EXISTS vendor CASCADE,
DROP COLUMN IF EXISTS manufacturer CASCADE,
DROP COLUMN IF EXISTS manufacturer_cid CASCADE,
DROP COLUMN IF EXISTS price_bucket_id CASCADE,
DROP COLUMN IF EXISTS price_bucket_cid CASCADE,
DROP COLUMN IF EXISTS vendor_id CASCADE,
DROP COLUMN IF EXISTS manufacturer_id CASCADE,
DROP COLUMN IF EXISTS vendor_cid CASCADE,
DROP COLUMN IF EXISTS merchandiser_id CASCADE,
DROP COLUMN IF EXISTS uom_cid CASCADE;

ALTER TABLE price_promo.tb_product_hierarchy_combination_version 
ADD COLUMN IF NOT EXISTS l4_id text NULL,
ADD COLUMN IF NOT EXISTS l4_cid int4 NULL,
ADD COLUMN IF NOT EXISTS l4_cuq text NULL,
ADD COLUMN IF NOT EXISTS l5_id text NULL,
ADD COLUMN IF NOT EXISTS l5_cid int4 NULL,
ADD COLUMN IF NOT EXISTS l5_cuq text NULL,
ADD COLUMN IF NOT EXISTS l6_id text NULL,
ADD COLUMN IF NOT EXISTS l6_cid int4 NULL,
ADD COLUMN IF NOT EXISTS l6_cuq text NULL,
ADD COLUMN IF NOT EXISTS l7_id text NULL,
ADD COLUMN IF NOT EXISTS l7_cid int4 NULL,
ADD COLUMN IF NOT EXISTS l7_cuq text NULL;

--changeset harshith.mandli@impactanalytics.co:drop_cuq_columns_prod_hier_comb_version stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: dropping cuq columns
ALTER TABLE price_promo.tb_product_hierarchy_combination_version
DROP COLUMN IF EXISTS manufacturer_cuq CASCADE,
DROP COLUMN IF EXISTS merchandiser_cuq CASCADE,
DROP COLUMN IF EXISTS brand_cuq CASCADE,
DROP COLUMN IF EXISTS vendor_cuq CASCADE,
DROP COLUMN IF EXISTS uom_cuq CASCADE,
DROP COLUMN IF EXISTS price_bucket_cuq CASCADE,
DROP COLUMN IF EXISTS size_bucket_cuq CASCADE;