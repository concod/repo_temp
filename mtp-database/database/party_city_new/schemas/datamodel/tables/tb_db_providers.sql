--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_db_providers stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_db_providers

CREATE TABLE datamodel.tb_db_providers (
	id serial4 NOT NULL,
	provider_name varchar(100) NOT NULL,
	remarks varchar(200) NULL,
	CONSTRAINT tb_db_providers_id_key UNIQUE (id),
	CONSTRAINT tb_db_providers_pkey PRIMARY KEY (provider_name)
);