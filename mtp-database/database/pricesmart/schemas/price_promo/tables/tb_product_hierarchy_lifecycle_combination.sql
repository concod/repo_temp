--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_lifecycle_combination stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_lifecycle_combination
CREATE TABLE price_promo.tb_product_hierarchy_lifecycle_combination (
	hierarchy_id serial4 NOT NULL,
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
	l4_id text NULL,
	l4_cid int4 NULL,
	l4_cuq text NULL,
	mfg_no text NULL,
	brand_cid int4 NULL,
	mfg_name text NULL,
	lifecycle_indicator_id int4 NULL,
	lifecycle_indicator text NULL,
	brand text NULL
);
CREATE INDEX idx_tb_product_hierarchy_lifecycle_combination ON price_promo.tb_product_hierarchy_lifecycle_combination USING btree (l0_cid, l1_cid, l2_cid);
CREATE INDEX tb_product_hierarchy_lifecycle_combination_hierarchy_id_idx ON price_promo.tb_product_hierarchy_lifecycle_combination USING btree (hierarchy_id);