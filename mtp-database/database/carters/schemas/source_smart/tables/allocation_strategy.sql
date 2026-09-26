--liquibase formatted sql
--changeset liquibase:allocation_strategy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_strategy
CREATE TABLE source_smart.allocation_strategy (
	strategy_id uuid NOT NULL,
	strategy_name text NULL,
	description text NULL,
	weighing_method varchar(255) NULL,
	factors jsonb NULL,
	status text NULL,
	last_updated timestamptz DEFAULT CURRENT_TIMESTAMP NULL,
	last_updated_by text NULL,
	facility_group_id varchar(255) NULL,
	facility_group_name varchar(255) NULL,
	CONSTRAINT allocation_strategy_pkey PRIMARY KEY (strategy_id)
);