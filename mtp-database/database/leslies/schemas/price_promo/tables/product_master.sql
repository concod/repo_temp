--liquibase formatted sql
--changeset liquibase:product_master_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_master - added serial 4

DROP TABLE IF EXISTS price_promo.product_master CASCADE;
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
	product_id int8 NULL,
	product_name text NULL,
	product_cuq text NULL,
	item_key text NULL,
	dept_cls_hier_key text NULL,
	sku_type_desc text NULL,
	manufacturer_id int4 NULL,
	launch_date date NULL,
	item_clearance_dt text NULL,
	item_discontinue_dt_skey text NULL,
	clearance_indicator int4 NULL,
	clearance text NULL,
	status text NULL,
	active bool NULL,
	is_active int4 NULL,
	merch_flag int4 NULL,
	item_short_desc text NULL,
	item_set_typ_cd text NULL,
	item_set_typ_nm text NULL,
	selling_uom_cd text NULL,
	chain_prc_cd text NULL,
	zone_prc_cd text NULL,
	store_prc_cd text NULL,
	buyer_id text NULL,
	buyer_description text NULL,
	vendor_id text NULL,
	vendor_description text NULL,
	launch_price float8 NULL,
	current_price float8 NULL,
	current_bnm_price float8 NULL,
	current_ecom_lesl_price float8 NULL,
	current_ecom_its_price float8 NULL,
	current_comm_price float8 NULL,
	"cost" float8 NULL,
	"map" float8 NULL,
	product_status text NULL,
	kvi_store_res text NULL,
	kvi_les_res text NULL,
	kvi_its_res text NULL,
	kvi_mkt_res text NULL,
	kvi_com_com text NULL,
	kvc_store_res text NULL,
	kvc_les_res text NULL,
	kvc_its_res text NULL,
	kvc_mkt_res text NULL,
	kvc_com_com text NULL,
	kvi_store_res_id int4 NULL,
	kvi_les_res_id int4 NULL,
	kvi_its_res_id int4 NULL,
	kvi_mkt_res_id int4 NULL,
	kvi_com_com_id int4 NULL,
	kvc_store_res_id int4 NULL,
	kvc_les_res_id int4 NULL,
	kvc_its_res_id int4 NULL,
	kvc_mkt_res_id int4 NULL,
	kvc_com_com_id int4 NULL,
	currency_id int4 NULL,
	map_flag int4 NULL,
	bnm_inv int4 NULL,
	ecom_lesliespool_inv int4 NULL,
	ecom_its_inv int4 NULL,
	commercial_inv int4 NULL,
	product_status_cid int4 NULL,
	manufacturer_name text NULL,
	total_inv int4 NULL,
	clearance_cid int4 NULL,
	kvi_indicator int4 NULL DEFAULT 1
);
CREATE INDEX product_master_product_id_idx ON price_promo.product_master USING btree (product_id);
CREATE INDEX product_master_promo_product_id_idx ON price_promo.product_master USING btree (product_id);

--changeset kumaran.k@impactanalytics.co:add_column_prodmaster_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version
--comment: adding columns
ALTER TABLE price_promo.product_master
add column shipping_cost float8 NULL,
add column rebate float8 NULL,
add column marketplace_fee float8 NULL;


--changeset vaibhav.singh@impactanalytics.co:kvi_indi_vs stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version_1
--comment: removing default from kvi_indicator
ALTER TABLE price_promo.product_master
ALTER COLUMN kvi_indicator DROP DEFAULT;


--changeset kumaran.k@impactanalytics.co:added_bnm_com price stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version_1
--comment: added_bnm_com price
ALTER TABLE price_promo.product_master
add column current_pro_bnm_price float8 NULL;


--changeset kumaran.k@impactanalytics.co:added_c8_c9 price stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_product_hierarchy_combination_version_1
--comment: added_c8_c9 price
ALTER TABLE price_promo.product_master
add column current_c8_price float8 NULL,
add column current_c9_price float8 NULL;