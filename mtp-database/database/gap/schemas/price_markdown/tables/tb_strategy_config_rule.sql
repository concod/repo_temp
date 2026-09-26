--liquibase formatted sql
--changeset liquibase:tb_strategy_config_rule_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_config_rule - Changed DDL to include trigger_config_id and removed strategy_config_id

CREATE TABLE price_markdown.tb_strategy_config_rule (
	strategy_config_rule_id serial4 NOT NULL,
	constraint_type int2 NOT NULL,
	constraint_id int4 NOT NULL,
	min_value float4 NULL,
	max_value float4 NULL,
	applicable_value _float4 DEFAULT ARRAY[]::real[] NULL,
	rule_flexibility_type_id int2 DEFAULT 1 NULL,
	priority int2 NOT NULL,
	status int2 DEFAULT 0 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 NULL,
	updated_by int4 NULL,
	trigger_config_id int4 NULL,
	CONSTRAINT tb_strategy_config_rule_unique UNIQUE (trigger_config_id, constraint_type, constraint_id),
	CONSTRAINT tb_strategy_config_rule_tb_clearance_trigger_info_master_fk FOREIGN KEY (trigger_config_id) REFERENCES price_markdown.tb_clearance_trigger_info_master(trigger_id)
);