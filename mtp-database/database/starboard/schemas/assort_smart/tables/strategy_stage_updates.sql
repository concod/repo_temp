--liquibase formatted sql
--changeset mayank.bhardwaj@impactanalytics.co :assort_smart.strategy_stage_updates stripComments:false splitStatements:false context:MTP-70241 labels:create_table
--comment: initial changeset for strategy_stage_updates


CREATE TABLE IF NOT EXISTS assort_smart.strategy_stage_updates (
	sub_class text NULL,
	original_depth int4 NULL,
	updated_depth int4 NULL,
	delta_depth int4 NULL,
	original_choice int4 NULL,
	updated_choice int4 NULL,
	plan_code int4 NULL,
	id serial4 NOT NULL,
	hierarchy_code text NULL,
	CONSTRAINT strategy_stage_updates_pkey PRIMARY KEY (id)
);
