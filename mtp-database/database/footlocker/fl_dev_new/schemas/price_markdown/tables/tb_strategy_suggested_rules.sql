--liquibase formatted sql
--changeset liquibase:tb_strategy_suggested_rules stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_suggested_rules

CREATE TABLE price_markdown.tb_strategy_suggested_rules (
	strategy_id int4 NOT NULL,
	constraint_id int4 NOT NULL,
	min_value float4 NULL,
	max_value float4 NULL,
	applicable_value _float4 NULL DEFAULT ARRAY[]::real[],
	objective_improvement float4 NULL
);