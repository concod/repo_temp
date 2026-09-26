--liquibase formatted sql
--changeset jaya.khandelwal@impactanalytics.co:tb_table_columns_mst stripComments:false splitStatements:false context:Release_1_0 labels:MTP-36859
--comment: initial changeset for tb_table_columns_mst
CREATE TABLE meta_schema.tb_table_columns_mst (
	id serial4 NOT NULL,
	column_display_name varchar(50) NOT NULL,
	column_actual_name varchar(50) NOT NULL,
	table_id int4 NOT NULL,
	remarks varchar(200) NULL,
	is_active bool NULL,
	is_deleted bool NULL DEFAULT false,
	CONSTRAINT tb_table_columns_mst_id_key UNIQUE (id),
	CONSTRAINT tb_table_columns_mst_pkey PRIMARY KEY (column_actual_name, table_id),
	CONSTRAINT tables_mst_fk FOREIGN KEY (table_id) REFERENCES meta_schema.tb_tables_mst(id)
);



--changeset saran.srirama@impactanalytics.co:tb_table_columns_mst_alter_1 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: added column in table tb_table_columns_mst

ALTER TABLE meta_schema.tb_table_columns_mst DROP COLUMN  is_deleted;
ALTER TABLE meta_schema.tb_table_columns_mst
ADD COLUMN is_primary bool NOT NULL DEFAULT false,
ADD COLUMN is_deleted bool NULL DEFAULT false,
ADD COLUMN is_unique bool NOT NULL DEFAULT false,
ADD COLUMN default_value varchar NULL,
ADD COLUMN data_type varchar NOT NULL DEFAULT 'double precision'::character varying,
ADD COLUMN partition_level int4 NULL;

ALTER TABLE meta_schema.tb_tables_mst DROP CONSTRAINT IF EXISTS tables_mst_fk;