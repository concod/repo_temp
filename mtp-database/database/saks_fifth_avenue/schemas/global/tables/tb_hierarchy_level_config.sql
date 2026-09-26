--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:tb_hierarchy_level_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_hierarchy_level_config

CREATE TABLE "global".tb_hierarchy_level_config (
	hierarchy_level int4 NULL,
	hierarchy_level_name text NULL,
	id int8 NULL,
	cid int8 NULL,
	"name" text NULL,
	cuq text NULL
);
CREATE INDEX tb_hierarchy_level_config_hierarchy_level_idx ON "global".tb_hierarchy_level_config (hierarchy_level);


--changeset sidharth.harish@impactanalytics.co:tb_hierarchy_level_config_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for tb_hierarchy_level_config
ALTER TABLE global.tb_hierarchy_level_config ALTER COLUMN id TYPE text USING id::text;