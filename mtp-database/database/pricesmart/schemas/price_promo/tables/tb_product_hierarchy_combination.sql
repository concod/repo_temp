--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_combination stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_combination

CREATE TABLE price_promo.tb_product_hierarchy_combination (
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
	brand text NULL
);