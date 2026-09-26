--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_app_validationrulesmst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_app_validationrulesmst

CREATE TABLE datamodel.tb_app_validationrulesmst (
	id serial4 NOT NULL,
	"expression" text NOT NULL,
	message text NULL,
	CONSTRAINT validation_id_uk UNIQUE (id)
);