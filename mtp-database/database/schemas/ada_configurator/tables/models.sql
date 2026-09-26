--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:models_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for models_update

CREATE TABLE IF NOT EXISTS ada_configurator.models (
	model_id serial4 NOT NULL,
	model_level_type ada_configurator."experiement_modelling_level" NULL,
	class_id int4 NULL,
	model_name varchar(255) NULL,
	model_key varchar(255) NULL,
	active bool DEFAULT true NULL,
	CONSTRAINT models_model_name_key UNIQUE (model_name),
	CONSTRAINT models_pkey PRIMARY KEY (model_id),
	CONSTRAINT models_class_id_fkey FOREIGN KEY (class_id) REFERENCES ada_configurator.model_classes(class_id) ON DELETE CASCADE
);

--changeset priyansh.gautam@impactanalytics.co:models constraint_drop_models_model_name_key stripComments:false splitStatements:false context:initial_release labels:constraint_drop_models_model_name_key
--comment: constraint_drop_models_model_name_key
ALTER TABLE ada_configurator.models DROP CONSTRAINT models_model_name_key;