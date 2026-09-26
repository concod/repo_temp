--liquibase formatted sql
--changeset liquibase:tb_rule_config stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_rule_config
CREATE TABLE price_markdown.tb_rule_config (
	rule_config_id serial4 NOT NULL,
	rule_type_id int4 NOT NULL,
	enable_min_value int2 NULL DEFAULT 1,
	enable_max_value int2 NULL DEFAULT 1,
	enable_applicable_value int2 NULL DEFAULT 1,
	enable_flexibility_type int2 NULL,
	input_type varchar NULL,
	max_applicable_value int2 NULL,
	min_applicable_value int2 NULL,
	applicable_value_range _float4 NULL DEFAULT ARRAY[]::real[],
	additional_config jsonb NULL
);