--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_hierarchy_cid_mapping_version_consolidated stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: consolidated changeset for tb_hierarchy_cid_mapping_version

CREATE TABLE IF NOT EXISTS "pricesmart".tb_hierarchy_cid_mapping_version (
	hierarchy_level int4 NOT NULL,
	hierarchy_value text NOT NULL,
	hierarchy_name text NOT NULL,
	version_code int4 NOT NULL,
	hierarchy_level_name varchar NULL,
	id int4 NULL,
	CONSTRAINT pk_hierarchy_mapping PRIMARY KEY (hierarchy_level, hierarchy_value, version_code)
)
PARTITION BY LIST (version_code);
