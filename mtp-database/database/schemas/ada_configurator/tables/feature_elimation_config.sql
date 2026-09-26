--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experimental_fmt_mapping_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experimental_fmt_mapping_update

CREATE TABLE IF NOT EXISTS ada_configurator.feature_elimation_config (
	id serial4 NOT NULL,
	model_id int4 NULL,
	"start" numeric NULL,
	"end" numeric NULL,
	step numeric NULL,
	"default" numeric NULL,
	CONSTRAINT feature_elimation_config_pkey PRIMARY KEY (id),
	CONSTRAINT feature_elimation_config_model_id_fkey FOREIGN KEY (model_id) REFERENCES ada_configurator.experiment_model_selection_data(model_selection_data_id)
);