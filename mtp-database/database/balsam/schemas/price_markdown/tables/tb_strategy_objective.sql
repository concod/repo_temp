--liquibase formatted sql
--changeset liquibase:tb_strategy_objective_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_objective - added serial 4
CREATE TABLE price_markdown.tb_strategy_objective (
	strategy_objective_id serial4 NOT NULL,
	strategy_id int4 NOT NULL,
	objective_type_id int2 NOT NULL,
	objective_value float4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT 0,
	updated_by int4 NULL DEFAULT 0,
	CONSTRAINT tb_strategy_objective_un UNIQUE (strategy_id, objective_type_id)
);
CREATE INDEX strategy_objective_strategy_idx ON price_markdown.tb_strategy_objective USING btree (strategy_id);