--liquibase formatted sql
--changeset arvindar.prasad@impactanalytics.co:tb_supported_datatypes stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39134
--comment: initial changeset for tb_supported_datatypes
CREATE TABLE meta_schema.tb_supported_datatypes (
	id serial4 NOT NULL,
	data_type varchar(100) NOT NULL,
	remarks text NULL,
	CONSTRAINT pk_datatype PRIMARY KEY (data_type)
);
