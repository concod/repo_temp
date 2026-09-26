--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_optimization_metrics stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.bp_optimization_metrics

CREATE TABLE base_pricing_restaurant.bp_optimization_metrics (
	id serial4 NOT NULL,
	parameter_name varchar(100) NOT NULL,
	parameter_key varchar(50) NOT NULL,
	description text NULL,
	is_maximization bool DEFAULT false NULL,
	is_objective bool DEFAULT false NULL,
	created_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT bp_optimization_metrics_parameter_key_key UNIQUE (parameter_key),
	CONSTRAINT bp_optimization_metrics_pkey PRIMARY KEY (id)
);