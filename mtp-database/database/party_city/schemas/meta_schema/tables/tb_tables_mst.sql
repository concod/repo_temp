--liquibase formatted sql
--changeset arvindar.prasad@impactanalytics.co:tb_tables_mst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-39134
--comment: initial changeset for tb_tables_mst
CREATE TABLE meta_schema.tb_tables_mst (
	id serial4 NOT NULL,
	table_name varchar(50) NOT NULL,
	schema_id int4 NOT NULL,
	table_type_id int4 NULL,
	sql_text text NULL,
	remarks varchar(200) NULL,
	is_active bool NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_tables_mst_id_key UNIQUE (id),
	CONSTRAINT tb_tables_mst_pkey PRIMARY KEY (table_name, schema_id),
	CONSTRAINT db_schemamst_fk FOREIGN KEY (schema_id) REFERENCES meta_schema.tb_db_schemamst(id),
	CONSTRAINT tabletype_mst_fk FOREIGN KEY (table_type_id) REFERENCES meta_schema.tb_tables_mst(id)
);
