--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_app_modeltypemst stripComments:false splitStatements:false context:Release_1_0 labels:tb_app_modeltypemst1
--comment: initial changeset for tb_app_modeltypemst
CREATE TABLE datamodel.tb_app_modeltypemst (
	id serial4 NOT NULL,
	model_type varchar(30) NULL,
	is_active bool NULL DEFAULT true,
	description varchar(200) NULL,
	CONSTRAINT tb_app_modeltypemst_pkey PRIMARY KEY (id)
);