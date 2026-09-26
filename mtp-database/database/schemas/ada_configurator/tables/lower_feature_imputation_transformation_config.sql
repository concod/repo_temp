--liquibase formatted sql
--changeset priyansh.gautam@impactanalytics.co:lower_feature_imputation_transformation_config6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for lower_feature_imputation_transformation_config

CREATE TABLE IF NOT EXISTS ada_configurator.lower_feature_imputation_transformation_config (
	id serial4 NOT NULL,
	feature_category varchar NULL,
	feature_type varchar NULL,
	feature_usage varchar NULL,
	feature_encoding varchar NULL,
	feature_transformation varchar NULL,
	feature_elasticity bool DEFAULT false NULL,
	CONSTRAINT lower_feature_imputation_transformation_config_pkey PRIMARY KEY (id)
);