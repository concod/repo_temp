--liquibase formatted sql
--changeset liquibase:tb_group_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_group_config 

CREATE TABLE "global".tb_group_config (
	"type" varchar NULL,
	identifier int2 NULL,
	value varchar NULL,
	CONSTRAINT tb_group_config_unique UNIQUE (type, identifier)
);

--changeset harsh.singh@impactanalytics.co:tb_group_config_added_pk stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added primary key to tb_group_config
ALTER TABLE "global".tb_group_config
    ADD CONSTRAINT tb_group_config_pk PRIMARY KEY (type, identifier);
ALTER TABLE "global".tb_group_config
    DROP CONSTRAINT IF EXISTS tb_group_config_unique;