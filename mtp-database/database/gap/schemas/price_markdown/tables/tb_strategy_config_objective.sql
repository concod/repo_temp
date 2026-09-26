--liquibase formatted sql
--changeset liquibase:tb_strategy_config_objective_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_config_objective - Changed DDL to include trigger_config_id and removed strategy_config_id

CREATE TABLE price_markdown.tb_strategy_config_objective (
	strategy_config_objective_id serial4 NOT NULL,
	strategy_config_id int4 NULL,
	objective_type_id int2 NOT NULL,
	objective_value float4 NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	updated_by int4 DEFAULT 0 NULL,
	trigger_config_id int4 NULL,
	CONSTRAINT tb_strategy_config_objective_unique UNIQUE (trigger_config_id, objective_type_id),
	CONSTRAINT tb_strategy_config_objective_tb_clearance_trigger_info_master_f FOREIGN KEY (trigger_config_id) REFERENCES price_markdown.tb_clearance_trigger_info_master(trigger_id)
);