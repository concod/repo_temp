--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:model_parameters_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for model_parameters_update

CREATE TABLE IF NOT EXISTS ada_configurator.model_parameters (
	param_id serial4 NOT NULL,
	model_id int4 NULL,
	label_name varchar(255) NULL,
	parameter_name varchar(255) NULL,
	parameter_type varchar(50) NULL,
	start_range numeric NULL,
	end_range numeric NULL,
	default_value varchar(255) NULL,
	display_flag bool NULL,
	input_type varchar(50) NULL,
	list_values _text NULL,
	CONSTRAINT model_parameters_pkey PRIMARY KEY (param_id),
	CONSTRAINT model_parameters_model_id_fkey FOREIGN KEY (model_id) REFERENCES ada_configurator.models(model_id) ON DELETE CASCADE
);