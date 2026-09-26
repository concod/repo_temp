--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_strategy_objectives_mapping stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_strategy_objectives_mapping

CREATE TABLE base_pricing.bp_strategy_objectives_mapping (
	strategy_id int4 NOT NULL,
	metric varchar(200) NOT NULL,
	priority int4 NULL,
	ly numeric(10, 2) NULL,
	baseline numeric(10, 2) NULL,
	lift numeric(10, 2) NULL,
	target numeric(10, 2) NULL,
	CONSTRAINT bp_strategy_objectives_pkey PRIMARY KEY (strategy_id, metric)
)
PARTITION BY LIST (strategy_id);

CREATE INDEX idx_strategy_id ON  base_pricing.bp_strategy_objectives_mapping USING btree (strategy_id);