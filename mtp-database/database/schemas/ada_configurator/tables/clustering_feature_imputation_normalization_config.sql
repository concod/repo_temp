--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:clustering_feature_imputation_normalization_config_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for clustering_feature_imputation_normalization_config_update

CREATE TABLE IF NOT EXISTS ada_configurator.clustering_feature_imputation_normalization_config (
	id serial4 NOT NULL,
	feature_type varchar NULL,
	feature_usage varchar NULL,
	feature_transformation _text NULL,
	feature_rounding_off _text NULL,
	imputation_method_type_based _text NULL,
	high_cardinality bool DEFAULT false NULL,
	hci_aggregattion_function _text NULL,
	feature_encoding _text NULL,
	CONSTRAINT clustering_feature_imputation_normalization_config_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS clustering_feature_imputation_normalization_config_feature_type_idx 
    ON ada_configurator.clustering_feature_imputation_normalization_config USING btree (feature_type);
