--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_model_selection_data_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_model_selection_data_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_model_selection_data (
	model_selection_data_id serial4 NOT NULL,
	data_type ada_configurator."experiment_model_data_type" NULL,
	ui_label varchar NULL,
	method_key varchar NULL,
	display_flag bool DEFAULT true,
	model_type varchar DEFAULT 'High',
	default_flag bool DEFAULT false NOT NULL,
	CONSTRAINT experiment_model_selection_data_pkey PRIMARY KEY (model_selection_data_id)
);