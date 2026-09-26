--liquibase formatted sql
--changeset raja.duraisamy@impactanalytics.co:model_classes_update6 stripComments:false splitStatements:false context:Release_1_0 labels:MTP-42740
--comment: initial changeset for model_classes_update

CREATE TABLE IF NOT EXISTS ada_configurator.model_classes (
	class_id serial4 NOT NULL,
	class_name varchar(255) NULL,
	CONSTRAINT model_classes_pkey PRIMARY KEY (class_id)
);