--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:train_test_parameters_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for train_test_parameters_update

CREATE TABLE IF NOT EXISTS ada_configurator.train_test_parameters (
	train_test_id serial4 NOT NULL,
	model_id int4 NULL,
	label_name varchar(255) NULL,
	parameter_name varchar(255) NULL,
	parameter_type varchar(50) NULL,
	default_value varchar(255) NULL,
	display_flag bool NULL,
	input_type varchar(50) NULL,
	CONSTRAINT train_test_parameters_pkey PRIMARY KEY (train_test_id),
	CONSTRAINT train_test_parameters_model_id_fkey FOREIGN KEY (model_id) REFERENCES ada_configurator.experiment_model_selection_data(model_selection_data_id)
);