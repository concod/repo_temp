--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:tb_store_hierarchy_combination_version  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Initial changeset for price_promo.tb_store_hierarchy_combination_version

CREATE TABLE IF NOT EXISTS price_promo.tb_store_hierarchy_combination_version (
	s0_id text NULL,
	s0_cid int4 NULL,
	s0_cuq text NULL,
	hierarchy_id int4 NULL,
	version_code int4 NOT NULL,
	CONSTRAINT tb_store_hierarchy_cid_v_uniq_key UNIQUE (version_code, hierarchy_id)
)
PARTITION BY LIST (version_code);
CREATE INDEX tb_store_hierarchy_combination_v_hier_idx ON price_promo.tb_store_hierarchy_combination_version USING btree (hierarchy_id);

--changeset siddharth.bajpai@impactanalytics.co:alter_tb_store_hierarchy_combination_version stripComments:false splitStatements:false context:Release_1_0 ignore:false
--comment: ALTER statements to sync schema with database

ALTER TABLE price_promo.tb_store_hierarchy_combination_version 
ADD COLUMN IF NOT EXISTS s1_id int4 NULL,
ADD COLUMN IF NOT EXISTS s1_cuq text NULL,
ADD COLUMN IF NOT EXISTS s2_id int4 NULL,
ADD COLUMN IF NOT EXISTS s2_cuq text NULL,
ADD COLUMN IF NOT EXISTS s3_id int4 NULL,
ADD COLUMN IF NOT EXISTS s3_cuq text NULL,
ADD COLUMN IF NOT EXISTS s4_id int4 NULL,
ADD COLUMN IF NOT EXISTS s4_cuq text NULL,
ADD COLUMN IF NOT EXISTS s5_id int4 NULL,
ADD COLUMN IF NOT EXISTS s5_cuq text NULL,
ADD COLUMN IF NOT EXISTS s6_id int4 NULL,
ADD COLUMN IF NOT EXISTS s6_cuq text NULL;

--changeset sreevathsa.sp:alter_s0_id_to_int4_20251220 stripComments:false splitStatements:false context:Release_1_0 labels:tb_store_hierarchy_combination_version_alter
--comment: Alter s0_id column from text to int4
--rollback: ALTER TABLE price_promo.tb_store_hierarchy_combination_version ALTER COLUMN s0_id TYPE text;

ALTER TABLE price_promo.tb_store_hierarchy_combination_version ALTER COLUMN s0_id TYPE int4 USING s0_id::int4;
