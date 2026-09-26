--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_app_actiontypemst stripComments:false splitStatements:false context:Release_1_0 labels:tb_app_actiontypemst1
--comment: initial changeset for tb_app_actiontypemst
CREATE TABLE datamodel.tb_app_actiontypemst (
	id serial4 NOT NULL,
	action_type varchar(30) NOT NULL,
	is_active bool NULL DEFAULT true,
	description varchar(200) NULL,
	CONSTRAINT tb_app_actiontypemst_pkey PRIMARY KEY (id)
);