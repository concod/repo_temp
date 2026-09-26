--liquibase formatted sql
--changeset liquibase:tb_strategy_rule stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_rule
CREATE TABLE price_markdown.tb_strategy_rule (
	strategy_rule_id serial4 NOT NULL,
	strategy_id int4 NOT NULL,
	constraint_type int2 NOT NULL,
	constraint_id int4 NOT NULL,
	min_value float4 NULL,
	max_value float4 NULL,
	applicable_value _float4 NULL DEFAULT ARRAY[]::real[],
	rule_flexibility_type_id int2 NULL DEFAULT 1,
	priority int2 NOT NULL,
	status int2 NULL DEFAULT 0,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	CONSTRAINT tb_strategy_rule_un PRIMARY KEY (strategy_id, constraint_type, constraint_id)
);
CREATE INDEX strategy_rule_strategy_idx ON price_markdown.tb_strategy_rule USING btree (strategy_id);