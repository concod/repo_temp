--liquibase formatted sql
--changeset arshad.k@impactanalytics.co:tb_table_columns_mst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-49552
--comment: initial changeset for tb_table_columns_mst

CREATE TABLE meta_schema.tb_table_columns_mst (
	id serial4 NOT NULL,
	column_display_name varchar(50) NOT NULL,
	column_actual_name varchar(50) NOT NULL,
	table_id int4 NOT NULL,
	remarks varchar(200) NULL,
	is_active bool NULL,
	is_deleted bool DEFAULT false NULL,
	is_primary bool DEFAULT false NOT NULL,
	is_unique bool DEFAULT false NOT NULL,
	default_value varchar NULL,
	data_type varchar DEFAULT 'double precision'::character varying NOT NULL,
	partition_level int4 NULL,
	CONSTRAINT tb_table_columns_mst_id_key UNIQUE (id),
	CONSTRAINT tb_table_columns_mst_pkey PRIMARY KEY (column_actual_name, table_id)
);


-- meta_schema.tb_table_columns_mst foreign keys

ALTER TABLE meta_schema.tb_table_columns_mst ADD CONSTRAINT tables_mst_fk FOREIGN KEY (table_id) REFERENCES meta_schema.tb_tables_mst(id);