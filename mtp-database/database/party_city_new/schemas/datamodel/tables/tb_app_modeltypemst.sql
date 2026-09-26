--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_app_modeltypemst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_app_modeltypemst

CREATE TABLE datamodel.tb_app_modeltypemst (
	id serial4 NOT NULL,
	model_type varchar(30) NULL,
	is_active bool DEFAULT true NULL,
	description varchar(200) NULL,
	CONSTRAINT tb_app_modeltypemst_pkey PRIMARY KEY (id)
);