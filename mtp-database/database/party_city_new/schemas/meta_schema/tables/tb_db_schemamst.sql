--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_db_schemamst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_db_schemamst

CREATE TABLE meta_schema.tb_db_schemamst (
	id serial4 NOT NULL,
	schema_name varchar(30) NOT NULL,
	is_active bool DEFAULT true NULL,
	remarks varchar(200) NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT tb_db_schemamst_id_key UNIQUE (id),
	CONSTRAINT tb_db_schemamst_pkey PRIMARY KEY (schema_name)
);