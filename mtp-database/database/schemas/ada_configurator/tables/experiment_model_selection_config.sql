--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_model_selection_config_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_model_selection_config_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_model_selection_config (
	experiment_id int4 NULL,
	model_parameter_id int4 NULL,
	parameter_value varchar NULL,
	CONSTRAINT experiment_model_selection_config_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE,
	CONSTRAINT experiment_model_selection_config_model_parameter_id_fkey FOREIGN KEY (model_parameter_id) REFERENCES ada_configurator.model_parameters(param_id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS experiment_model_selection_config_experiment_id_idx ON ada_configurator.experiment_model_selection_config USING btree (experiment_id, model_parameter_id);