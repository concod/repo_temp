--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:training_configuration stripComments:false splitStatements:false context:Release_1_0 labels:MTP-38338
--comment: initial changeset for training_configuration

CREATE TABLE forecast_smart.training_configuration (
	experiment_name varchar(20) NOT NULL,
	client varchar NOT NULL,
	brand varchar NOT NULL,
	geography varchar NOT NULL,
	stores varchar NOT NULL,
	channel varchar NOT NULL,
	modelling_level varchar NOT NULL,
	training_start timestamptz NULL,
	status int4 DEFAULT 0 NOT NULL,
	forecast_level varchar NOT NULL,
	priority int4 DEFAULT 0 NOT NULL,
	accuracy_report varchar NULL,
	workstream varchar(100) NULL,
	last_trained_at timestamptz NULL,
	training_end timestamptz NULL,
	created_on timestamptz DEFAULT NOW() NOT NULL,
	created_by varchar null,
	model_summary_url varchar(2083) NULL,
	forecast_daterange varchar NULL,
	forecast_horizon varchar(20) NULL,
	simulation_status int4 DEFAULT 0 NOT NULL,
	last_simulation_exp_name varchar(20) null,
	simulation_start timestamptz NULL,
	simulation_end timestamptz NULL,
	simulation_flag boolean DEFAULT FALSE,
	CONSTRAINT training_config_experiment_name_pk PRIMARY KEY (experiment_name));