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