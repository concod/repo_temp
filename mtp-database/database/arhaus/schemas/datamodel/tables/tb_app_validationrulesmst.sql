--liquibase formatted sql
--changeset archa.prakash@impactanalytics.co:tb_app_validationrulesmst stripComments:false splitStatements:false context:Release_1_0 labels:tb_app_validationrulesmst
--comment: initial changeset for tb_app_validationrulesmst
CREATE TABLE datamodel.tb_app_validationrulesmst (
	id serial4 NOT NULL,
	"expression" text NOT NULL,
	message text NULL,
	CONSTRAINT validation_id_uk UNIQUE (id)
);