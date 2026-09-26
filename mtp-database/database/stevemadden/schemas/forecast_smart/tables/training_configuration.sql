--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:training_configuration stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36836
--comment: initial changeset for training_configuration

CREATE TABLE forecast_smart.training_configuration (
	experiment_name varchar(20) NOT NULL,
	client varchar(50) NOT NULL,
	brand varchar(50) NOT NULL,
	geography varchar(50) NOT NULL,
	stores varchar(50) NOT NULL,
	channel varchar(50) NOT NULL,
	modelling_level varchar(50) NOT NULL,
	training_start timestamptz NULL,
	status int4 DEFAULT 0 NOT NULL,
	forecast_level varchar(50) NOT NULL,
	priority int4 DEFAULT 0 NOT NULL,
	accuracy_report varchar(50) NULL,
	last_trained_at timestamptz NULL,
	training_end timestamptz NULL,
	created_on timestamptz DEFAULT NOW() NOT NULL,
	created_by varchar(50) null,
	model_summary_url varchar(2083) NULL,
	forecast_daterange varchar(50) NULL,
	forecast_horizon varchar(20) NULL,
	simulation_status int4 DEFAULT 0 NOT NULL,
	last_simulation_exp_name varchar(20) null,
	simulation_start timestamptz NULL,
	simulation_end timestamptz NULL,
	simulation_flag boolean DEFAULT FALSE,
	CONSTRAINT training_config_experiment_name_pk PRIMARY KEY (experiment_name))