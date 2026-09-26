--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_supported_controls stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_supported_controls
CREATE TABLE meta_schema.tb_supported_controls (
	id serial4 NOT NULL,
	contol_name varchar(100) NOT NULL,
	default_options json NULL,
	remarks text NULL,
	CONSTRAINT pk_contol_type PRIMARY KEY (contol_name)
);