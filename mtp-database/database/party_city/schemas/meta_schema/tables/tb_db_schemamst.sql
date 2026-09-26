--liquibase formatted sql
--changeset arvindar.prasad@impactanalytics.co:tb_db_schemamst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39134
--comment: initial changeset for tb_db_schemamst
CREATE TABLE meta_schema.tb_db_schemamst (
	id serial4 NOT NULL,
	schema_name varchar(30) NOT NULL,
	is_active bool NULL DEFAULT true,
	remarks varchar(200) NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_db_schemamst_id_key UNIQUE (id),
	CONSTRAINT tb_db_schemamst_pkey PRIMARY KEY (schema_name)
);
