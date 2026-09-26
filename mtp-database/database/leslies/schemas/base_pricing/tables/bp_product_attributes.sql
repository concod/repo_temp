--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_product_attributes_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_product_attributes_10

CREATE TABLE base_pricing.bp_product_attributes (
	product_id int4 NOT NULL,
	launch_date date NULL,
	manufacturer text NULL,
	"family" text NULL,
	channel_grade text NULL,
	active bool NULL,
	"map" float8 NULL,
	"size" float8 NULL,
	uom text NULL,
	derived_size float8 NULL,
	derived_uom text NULL,
	base_cost float8 NULL,
	rebate float8 NULL,
	marketplace_fee float8 NULL,
	shipping_cost float8 NULL,
	residential_price float8 NULL,
	c1_price float8 NULL,
	c2_price float8 NULL,
	c3_price float8 NULL,
	c4_price float8 NULL,
	c5_price float8 NULL,
	c6_price float8 NULL,
	c7_price float8 NULL,
	c8_price float8 NULL,
	c9_price float8 NULL,
	refurb_indicator bool NULL,
	kvi_store_residential text NULL,
	kvi_lesliespool_residential text NULL,
	kvi_its_residential text NULL,
	kvi_marketplace_residential text NULL,
	kvi_commercial_commercial text NULL,
	kvc_store_residential text NULL,
	kvc_lesliespool_residential text NULL,
	kvc_its_residential text NULL,
	kvc_marketplace_residential text NULL,
	kvc_commercial_commercial text NULL,
	item_key text NULL,
	dept_cls_hier_key text NULL,
	sku_type_desc text NULL,
	merch_flag int4 NULL,
	item_clearance_date text NULL,
	item_short_desc text NULL,
	item_set_typ_cd text NULL,
	item_set_typ_nm text NULL,
	chain_prc_cd text NULL,
	zone_prc_cd text NULL,
	store_prc_cd text NULL,
	item_discontinue_dt_skey date NULL,
	buyer_id text NULL,
	buyer_description text NULL,
	vendor_id text NULL,
	vendor_description text NULL,
	line_group varchar NULL,
	size_family varchar NULL,
	size_class varchar NULL,
	brand_family varchar NULL,
	brand_class varchar NULL,
	other_family varchar NULL,
	other_class varchar NULL,
	price_lock bool NULL,
	pre_price bool NULL,
	CONSTRAINT bp_product_attributes_pkey PRIMARY KEY (product_id),
	CONSTRAINT fk_product FOREIGN KEY (product_id) REFERENCES base_pricing.bp_product_master(product_id)
);
CREATE INDEX bs_product_attributes_idx ON base_pricing.bp_product_attributes USING btree (product_id);


--changeset abhishek.singh@impactanalytics.co:bp_product_attributes_new_06 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: Altering bp_product_attributes_new_06

ALTER TABLE base_pricing.bp_product_attributes
-- Drop old columns
DROP COLUMN IF EXISTS kvi_store_residential,
DROP COLUMN IF EXISTS kvi_lesliespool_residential,
DROP COLUMN IF EXISTS kvi_marketplace_residential,
DROP COLUMN IF EXISTS kvc_store_residential,
DROP COLUMN IF EXISTS kvc_lesliespool_residential,
DROP COLUMN IF EXISTS kvc_marketplace_residential,
DROP COLUMN IF EXISTS custom_family_1,
DROP COLUMN IF EXISTS custom_class_1,

-- Add new / renamed columns
ADD COLUMN IF NOT EXISTS kvi_leslie_residential text NULL,
ADD COLUMN IF NOT EXISTS kvi_its_residential text NULL,
ADD COLUMN IF NOT EXISTS kvi_commercial_commercial text NULL,
ADD COLUMN IF NOT EXISTS kvc_leslie_residential text NULL,
ADD COLUMN IF NOT EXISTS kvc_its_residential text NULL,
ADD COLUMN IF NOT EXISTS kvc_commercial_commercial text NULL,
ADD COLUMN IF NOT EXISTS custom_family_1 varchar NULL,
ADD COLUMN IF NOT EXISTS custom_class_1 varchar NULL,
ADD COLUMN IF NOT EXISTS is_usable bool NULL;

--changeset abhishek.singh@impactanalytics.co:bp_product_attributes_new_07 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: Altering bp_product_attributes_new_07

ALTER TABLE base_pricing.bp_product_attributes
ADD COLUMN IF NOT EXISTS residential_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c1_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c2_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c3_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c4_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c5_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c6_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c7_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c8_price_final float8 NULL,
ADD COLUMN IF NOT EXISTS c9_price_final float8 NULL;