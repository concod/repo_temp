--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:tb_hierarchy_cid_mapping_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_hierarchy_cid_mapping_version

DROP TABLE IF EXISTS "global".tb_hierarchy_cid_mapping_version CASCADE;
CREATE TABLE IF NOT EXISTS "global".tb_hierarchy_cid_mapping_version (
	hierarchy_level int4 NOT NULL,
	hierarchy_value int4 NOT NULL,
	hierarchy_name text NOT NULL,
	version_code int4 NOT NULL,
	hierarchy_level_name varchar NULL,
	id int4 NULL,
	CONSTRAINT pk_hierarchy_mapping PRIMARY KEY (version_code, hierarchy_level, hierarchy_value)
)
PARTITION BY LIST (version_code);

--changeset siddharth.bajpai@impactanalytics.co:fix_tb_hierarchy_cid_mapping_version_pk_20251216_v2 stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:tb_hierarchy_cid_mapping
--comment: Fix primary key order and hierarchy_value data type to match dev DB

ALTER TABLE "global".tb_hierarchy_cid_mapping_version DROP CONSTRAINT IF EXISTS pk_hierarchy_mapping CASCADE;
ALTER TABLE "global".tb_hierarchy_cid_mapping_version ALTER COLUMN hierarchy_value TYPE text USING hierarchy_value::text;
ALTER TABLE "global".tb_hierarchy_cid_mapping_version ADD CONSTRAINT pk_hierarchy_mapping PRIMARY KEY (hierarchy_level, hierarchy_value, version_code);