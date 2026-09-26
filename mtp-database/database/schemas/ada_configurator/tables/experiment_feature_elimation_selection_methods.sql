--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_feature_elimation_selection_methods_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_feature_elimation_selection_methods_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_feature_elimation_selection_methods (
	id serial4 NOT NULL,
	feature_id int4 NULL,
	elimation_id int4 NULL,
	threshold varchar NULL,
	experiment_id int4 NULL,
	CONSTRAINT experiment_feature_elimation_selection_methods_pkey PRIMARY KEY (id),
	CONSTRAINT experiment_feature_elimation_selection_metho_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE,
	CONSTRAINT experiment_feature_elimation_selection_method_elimation_id_fkey FOREIGN KEY (elimation_id) REFERENCES ada_configurator.experiment_model_selection_data(model_selection_data_id),
	CONSTRAINT experiment_feature_elimation_selection_methods_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES ada_configurator.experiment_feature_imputation_config(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS experiment_feature_elimation_selection_methods_experiment_id_idx ON ada_configurator.experiment_feature_elimation_selection_methods USING btree (experiment_id, feature_id);