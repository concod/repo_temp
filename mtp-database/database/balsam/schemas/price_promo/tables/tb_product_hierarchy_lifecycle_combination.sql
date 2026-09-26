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

--changeset liquibase:tb_product_hierarchy_lifecycle_combination_drop_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Dropping columns from tb_product_hierarchy_lifecycle_combination
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination
    DROP COLUMN mfg_no,
    DROP COLUMN brand_cid,
    DROP COLUMN mfg_name,
    DROP COLUMN lifecycle_indicator_id,
    DROP COLUMN lifecycle_indicator,
    DROP COLUMN brand;


--changeset liquibase:tb_product_hierarchy_lifecycle_combination_add_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Adding additional columns to tb_product_hierarchy_lifecycle_combination
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination
    ADD COLUMN l5_id text NULL,
    ADD COLUMN l5_cid int4 NULL,
    ADD COLUMN l5_cuq text NULL,
    ADD COLUMN status_id text NULL,
    ADD COLUMN status_cid int4 NULL,
    ADD COLUMN status text NULL,
    ADD COLUMN realism_id text NULL,
    ADD COLUMN realism_cid int4 NULL,
    ADD COLUMN realism text NULL,
    ADD COLUMN size_id text NULL,
    ADD COLUMN size_cid int4 NULL,
    ADD COLUMN size text NULL,
    ADD COLUMN light_type_id text NULL,
    ADD COLUMN light_type_cid int4 NULL,
    ADD COLUMN light_type text NULL;


--changeset vamsi.balaga@impactanalytics.co:tb_product_hierarchy_lifecycle_combination_add_derived_status_columns stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Add derived_status_id, derived_status_cid, derived_status columns to tb_product_hierarchy_lifecycle_combination
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination
    ADD COLUMN derived_status_id int4 NULL,
    ADD COLUMN derived_status_cid int4 NULL,
    ADD COLUMN derived_status text NULL;
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination
    DROP COLUMN status_id,
    DROP COLUMN status_cid,
    DROP COLUMN status;
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination ALTER COLUMN realism_id TYPE int4 USING realism_id::int4;
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination ALTER COLUMN size_id TYPE int4 USING size_id::int4;
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination ALTER COLUMN light_type_id TYPE int4 USING light_type_id::int4;
