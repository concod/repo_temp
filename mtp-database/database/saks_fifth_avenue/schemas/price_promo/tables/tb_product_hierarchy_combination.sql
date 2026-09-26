--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_combination stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_combination

CREATE TABLE price_promo.tb_product_hierarchy_combination (
	l0_id int4 NULL,
	l0_cid int4 NULL,
	l0_cuq text NULL,
	l1_id int4 NULL,
	l1_cid int4 NULL,
	l1_cuq text NULL,
	l2_id int4 NULL,
	l2_cid int4 NULL,
	l2_cuq text NULL,
	l3_id int4 NULL,
	l3_cid int4 NULL,
	l3_cuq text NULL,
	l4_id int8 NULL,
	l4_cid int4 NULL,
	l4_cuq text NULL,
	mfg_no int8 NULL,
	brand_cid int4 NULL,
	mfg_name text NULL
);


--changeset abhishek.singh@impactanalytics.co:tb_product_hierarchy_combination_1 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for price_promo.tb_product_hierarchy_combination
ALTER TABLE price_promo.tb_product_hierarchy_combination
    ALTER COLUMN l0_id TYPE text,
    ALTER COLUMN l1_id TYPE text,
    ALTER COLUMN l2_id TYPE text,
    ALTER COLUMN l3_id TYPE text,
    ALTER COLUMN l4_id TYPE text,
    ALTER COLUMN mfg_no TYPE text;

--changeset hareeshwar.c@impactanalytics.co:tb_product_hierarchy_combination_3 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for price_promo.tb_product_hierarchy_combination
ALTER TABLE price_promo.tb_product_hierarchy_combination
ADD COLUMN brand text;
