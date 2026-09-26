--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_model_type_selection_configs_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_model_type_selection_configs_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_model_type_selection_configs (
	experiment_id int4 NULL,
	model_type_id int4 NULL,
	model_typeparameter_id int4 NULL,
	parameter_value varchar NULL,
	CONSTRAINT experiment_model_type_selection_con_model_typeparameter_id_fkey FOREIGN KEY (model_typeparameter_id) REFERENCES ada_configurator.model_type_selection_parameter(model_type_parameter_id) ON DELETE CASCADE,
	CONSTRAINT experiment_model_type_selection_configs_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE,
	CONSTRAINT experiment_model_type_selection_configs_model_type_id_fkey FOREIGN KEY (model_type_id) REFERENCES ada_configurator.experiment_model_selection_data(model_selection_data_id)
);

CREATE INDEX IF NOT EXISTS experiment_model_type_selection_configs_experiment_id_idx ON ada_configurator.experiment_model_type_selection_configs USING btree (experiment_id);
