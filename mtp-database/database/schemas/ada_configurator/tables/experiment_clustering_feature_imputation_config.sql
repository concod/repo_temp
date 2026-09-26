--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:experiment_clustering_feature_imputation_config_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for experiment_clustering_feature_imputation_config_update

CREATE TABLE IF NOT EXISTS ada_configurator.experiment_clustering_feature_imputation_config (
	id serial4 NOT NULL,
	experiment_id int4 NOT NULL,
	feature_id int4 NOT NULL,
	feature_name varchar NULL,
	feature_usage varchar NULL,
	feature_type varchar NULL,
	transformation varchar NULL,
	rounding_off varchar NULL,
	imputation_method_type_based varchar NULL,
	features_for_imputation_method_based int4 NULL,
	high_cardinality bool DEFAULT false NULL,
	hci_aggregattion_function varchar NULL,
	hci_other_feature_based int4 NULL,
	hci_thresold_cutoff varchar NULL,
	hci_renamed_column varchar NULL,
	feature_encoding varchar NULL,
	CONSTRAINT experiment_clustering_feature_imputation_config_pkey PRIMARY KEY (id),
	CONSTRAINT experiment_clustering_feature_features_for_imputation_meth_fkey FOREIGN KEY (features_for_imputation_method_based) REFERENCES ada_configurator.fmd_experimental_features(feature_id),
	CONSTRAINT experiment_clustering_feature_impu_hci_other_feature_based_fkey FOREIGN KEY (hci_other_feature_based) REFERENCES ada_configurator.fmd_experimental_features(feature_id),
	CONSTRAINT experiment_clustering_feature_imputation_con_experiment_id_fkey FOREIGN KEY (experiment_id) REFERENCES ada_configurator.experiment_master(experiment_id) ON DELETE CASCADE,
	CONSTRAINT experiment_clustering_feature_imputation_config_feature_id_fkey FOREIGN KEY (feature_id) REFERENCES ada_configurator.fmd_experimental_features(feature_id)
);

CREATE INDEX IF NOT EXISTS experiment_clustering_feature_imputation_config_experiment_id_idx 
    ON ada_configurator.experiment_clustering_feature_imputation_config USING btree (experiment_id);