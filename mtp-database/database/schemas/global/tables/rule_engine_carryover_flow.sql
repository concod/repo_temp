--liquibase formatted sql
--changeset liquibase:"global".rule_engine_carryover_flow  stripComments:false splitStatements:false context:MTP-24255 labels:liquibase_project_start
--comment: initial changeset for rule_engine_carryover_flow
CREATE TABLE "global".rule_engine_carryover_flow (
	rule_id serial4 NOT NULL,
	rule_level jsonb NOT NULL,
	priority jsonb NOT NULL,
	rule_type varchar NOT NULL,
	column_name varchar NOT NULL,
	column_value jsonb NOT NULL,
	is_active bool NOT NULL DEFAULT false,
	created_by int4 NULL,
	updated_by int4 NULL,
	created_at timestamp NOT NULL DEFAULT now(),
	updated_at timestamp NOT NULL DEFAULT now(),
	CONSTRAINT rule_engine_carryover_flow_pk PRIMARY KEY (rule_id)
);