--liquibase formatted sql
--changeset liquibase:tb_objective_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_objective_config
CREATE TABLE price_markdown.tb_objective_config (
	id int4 NULL,
	objective_id int4 NOT NULL,
	value_format varchar(50) NULL,
	enable_applicable_value int2 DEFAULT 0 NULL,
	max_applicable_value int2 NULL,
	min_applicable_value int2 NULL,
	CONSTRAINT tb_objective_config_pk PRIMARY KEY (objective_id)
);