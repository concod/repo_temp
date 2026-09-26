--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:model_type_selection_parameter_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for model_type_selection_parameter_update

CREATE TABLE IF NOT EXISTS ada_configurator.model_type_selection_parameter (
	model_type_parameter_id serial4 NOT NULL,
	model_selection_id int4 NULL,
	label_name varchar(255) NULL,
	parameter_name varchar(255) NULL,
	start_range int4 NULL,
	end_range int4 NULL,
	list_value _text NULL,
	default_value varchar(255) NULL,
	display_flag bool DEFAULT true NULL,
	input_type varchar(50) NULL,
	CONSTRAINT model_type_selection_parameter_pkey PRIMARY KEY (model_type_parameter_id),
	CONSTRAINT model_type_selection_parameter_model_selection_id_fkey FOREIGN KEY (model_selection_id) REFERENCES ada_configurator.experiment_model_selection_data(model_selection_data_id)
);