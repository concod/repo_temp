--liquibase formatted sql
--changeset liquibase:tb_simulation_speed stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_simulation_speed
CREATE TABLE price_markdown.tb_simulation_speed (
	strategy_id int4 NOT NULL,
	validating_start timestamptz NULL DEFAULT now(),
	validating_end timestamptz NULL DEFAULT now(),
	discount_insertion_start timestamptz NULL DEFAULT now(),
	discount_insertion_end timestamptz NULL DEFAULT now(),
	user_id int4 NOT NULL,
	is_bulk_simulation bool NULL DEFAULT false,
	CONSTRAINT tb_simulation_speed_pk PRIMARY KEY (strategy_id)
);