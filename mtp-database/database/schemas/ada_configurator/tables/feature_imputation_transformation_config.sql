--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:feature_imputation_transformation_config_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for feature_imputation_transformation_config_update

CREATE TABLE IF NOT EXISTS ada_configurator.feature_imputation_transformation_config (
	id serial4 NOT NULL,
	feature_category varchar NULL,
	feature_type varchar NULL,
	feature_usage varchar NULL,
	feature_encoding varchar NULL,
	feature_transformation varchar NULL,
	feature_elasticity bool DEFAULT false NULL,
	CONSTRAINT feature_imputation_transformation_config_pkey PRIMARY KEY (id)
);