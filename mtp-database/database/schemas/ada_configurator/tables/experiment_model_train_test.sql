--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_model_train_test_update7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_model_train_test_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_model_train_test (
	experiment_id int4 NULL,
	train_test_param_id int4 NULL,
	parameter_value varchar NULL,
	CONSTRAINT experiment_model_train_test_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE,
	CONSTRAINT experiment_model_train_test_train_test_param_id_fkey FOREIGN KEY (train_test_param_id) REFERENCES ada_configurator.train_test_parameters(train_test_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS experiment_model_train_test_experiment_id_train_test_type_i_idx ON ada_configurator.experiment_model_train_test USING btree (experiment_id, train_test_param_id);
