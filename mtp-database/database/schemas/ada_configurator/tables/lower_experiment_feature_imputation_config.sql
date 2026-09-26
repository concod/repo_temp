--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:lower_experiment_feature_imputation_config7 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for lower_experiment_feature_imputation_config

CREATE TABLE IF NOT EXISTS ada_configurator.lower_experiment_feature_imputation_config (
	id serial4 NOT NULL,
	experiment_id int4 NOT NULL,
	feature_name varchar NULL,
	feature_category varchar NULL,
	feature_type varchar NULL,
	feature_usage varchar NULL,
	"encoding" varchar NULL,
	elasticity_required bool DEFAULT false NULL,
	selection_criteria varchar NULL,
	transformation varchar NULL,
	feature_id int4 NULL,
	CONSTRAINT lower_experiment_feature_imputation_config_pkey PRIMARY KEY (id),
	CONSTRAINT lower_experiment_feature_imputation_config_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS lower_experiment_feature_imputation_config_experiment_id_idx ON ada_configurator.lower_experiment_feature_imputation_config USING btree (experiment_id, feature_id);
