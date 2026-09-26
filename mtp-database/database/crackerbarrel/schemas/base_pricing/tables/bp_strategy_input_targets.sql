--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_input_targets stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_input_targets

CREATE TABLE base_pricing.bp_strategy_input_targets (
	strategy varchar(50) NOT NULL,
	target varchar(50) NOT NULL,
	value numeric(10, 1) NOT NULL,
	priority int4 NOT NULL,
	maximization int4 NOT NULL,
	CONSTRAINT bp_strategy_input_targets_pkey PRIMARY KEY (strategy, target)
);