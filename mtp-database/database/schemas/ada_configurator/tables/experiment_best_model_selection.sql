--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_best_model_selection_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_best_model_selection_update

CREATE TABLE  IF NOT EXISTS ada_configurator.experiment_best_model_selection (
	experiment_id int4 NULL,
	model_id int4 NULL,
	value float4 NULL,
	selection_type varchar NULL,
	is_user_locked bool DEFAULT false NULL,
	CONSTRAINT experiment_best_model_selection_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE,
	CONSTRAINT experiment_best_model_selection_model_id_fkey FOREIGN KEY (model_id) REFERENCES ada_configurator.experiment_model_selection_data(model_selection_data_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS experiment_best_model_selection_experiment_id_model_id_idx 
ON ada_configurator.experiment_best_model_selection 
USING btree (experiment_id, model_id);