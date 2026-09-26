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

--changeset shrrayan.sheel@impactanalytics.co:tb_product_hierarchy_lifecycle_combination_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Combined ALTER statement to transform tb_product_hierarchy_lifecycle_combination and create index
ALTER TABLE price_promo.tb_product_hierarchy_lifecycle_combination
    DROP COLUMN IF EXISTS l4_id,
    DROP COLUMN IF EXISTS l4_cid,
    DROP COLUMN IF EXISTS l4_cuq,
    DROP COLUMN IF EXISTS mfg_no,
    DROP COLUMN IF EXISTS brand_cid,
    DROP COLUMN IF EXISTS mfg_name,
    DROP COLUMN IF EXISTS lifecycle_indicator_id,
    DROP COLUMN IF EXISTS lifecycle_indicator,
    DROP COLUMN IF EXISTS brand,
    ADD COLUMN manufacturer_id int4 NULL,
    ADD COLUMN manufacturer_name text NULL,
    ADD COLUMN product_status_cid int4 NULL,
    ADD COLUMN product_status text NULL,
    ADD COLUMN map_flag int NULL,
    ADD COLUMN clearance_cid int4 NULL,
    ADD COLUMN clearance text NULL,
    ADD COLUMN kvc_store_res_id int4 NULL,
    ADD COLUMN kvc_store_res text NULL,
    ADD COLUMN kvi_store_res_id int4 NULL,
    ADD COLUMN kvi_store_res text NULL,
    ADD COLUMN kvc_les_res_id int4 NULL,
    ADD COLUMN kvc_les_res text NULL,
    ADD COLUMN kvi_les_res_id int4 NULL,
    ADD COLUMN kvi_les_res text NULL,
    ADD COLUMN kvc_its_res_id int4 NULL,
    ADD COLUMN kvc_its_res text NULL,
    ADD COLUMN kvi_its_res_id int4 NULL,
    ADD COLUMN kvi_its_res text NULL,
    ADD COLUMN kvc_com_com_id int4 NULL,
    ADD COLUMN kvc_com_com text NULL,
    ADD COLUMN kvi_com_com_id int4 NULL,
    ADD COLUMN kvi_com_com text NULL,
    ADD COLUMN product_id int4 NULL,
    ADD COLUMN product_name text NULL;

--changeset shrrayan.sheel@impactanalytics.co:tb_product_hierarchy_lifecycle_combination_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Drop already existing indexes
DROP INDEX IF EXISTS idx_tb_product_hierarchy_lifecycle_combination;
DROP INDEX IF EXISTS tb_product_hierarchy_lifecycle_combination_hierarchy_id_idx;

--changeset shrrayan.sheel@impactanalytics.co:tb_product_hierarchy_lifecycle_combination_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: create new indexes
CREATE INDEX IF NOT EXISTS tb_product_hierarchy_lifecycle_combination_hierarchy_id_idx ON price_promo.tb_product_hierarchy_lifecycle_combination USING btree (hierarchy_id);
CREATE INDEX IF NOT EXISTS tb_product_hierarchy_lifecycle_combination_product_id_idx ON price_promo.tb_product_hierarchy_lifecycle_combination USING btree (product_id);