--liquibase formatted sql
--changeset liquibase:tb_product_hierarchy_lifecycle_combination stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_product_hierarchy_lifecycle_combination

CREATE TABLE price_promo.tb_product_hierarchy_lifecycle_combination (
	hierarchy_id serial4 NOT NULL,
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
	mfg_name text NULL,
	lifecycle_indicator_id int4 NULL,
	lifecycle_indicator text NULL
);


--changeset liquibase:tb_product_hierarchy_lifecycle_combination_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added index on hierarchy id
CREATE INDEX tb_product_hierarchy_lifecycle_combination_hierarchy_id_idx ON price_promo.tb_product_hierarchy_lifecycle_combination (hierarchy_id);


--changeset abhishek.singh@impactanalytics.co:tb_product_hierarchy_lifecycle_combination_2 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for price_promo.tb_product_hierarchy_lifecycle_combination

ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination
    ALTER COLUMN l0_id TYPE text,
    ALTER COLUMN l1_id TYPE text,
    ALTER COLUMN l2_id TYPE text,
    ALTER COLUMN l3_id TYPE text,
    ALTER COLUMN l4_id TYPE text,
    ALTER COLUMN mfg_no TYPE text;


--changeset sidharth.harish@impactanalytics.co:tb_product_hierarchy_lifecycle_combination_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added brand column
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination ADD brand text NULL;

