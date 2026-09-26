--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_tabletype_mst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_tabletype_mst

CREATE TABLE meta_schema.tb_tabletype_mst (
	id serial4 NOT NULL,
	table_type varchar(50) NOT NULL,
	remarks varchar(200) NULL,
	is_deleted bool DEFAULT false NULL,
	CONSTRAINT tb_tabletype_mst_id_key UNIQUE (id),
	CONSTRAINT tb_tabletype_mst_pkey PRIMARY KEY (table_type)
);