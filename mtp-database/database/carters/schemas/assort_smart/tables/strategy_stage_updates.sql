--liquibase formatted sql
--changeset ezhil.kannan@impactanalytics.co :assort_smart.strategy_stage_updates stripComments:false splitStatements:false context:MTP-66708 labels:liquibase_project_start
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
	CONSTRAINT strategy_stage_updates_pkey PRIMARY KEY (id)
);


--changeset ezhil.kannan@impactanalytics.co liquibase:strategy_stage_updates stripComments:false splitStatements:false context:MTP-68491 labels:liquibase_project_start
--comment: Add new columns
ALTER TABLE assort_smart.strategy_stage_updates
ADD COLUMN hierarchy_code TEXT;
