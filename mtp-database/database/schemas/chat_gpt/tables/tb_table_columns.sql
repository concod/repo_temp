--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_table_columns_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_table_columns table creation
CREATE TABLE chat_gpt.tb_table_columns (
	id bigserial NOT NULL,
	column_name varchar(50) NOT NULL,
	table_id int4 NOT NULL,
	is_active bool NULL DEFAULT true,
	created_by int4 NULL,
	description_key int4 NULL,
	schema_or_dataset varchar NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	column_type varchar NULL,
	column_description varchar NULL,
	CONSTRAINT tb_table_columns_id_key UNIQUE (id),
	CONSTRAINT tb_table_columns_pkey PRIMARY KEY (column_name, table_id),
	CONSTRAINT fk_table_id FOREIGN KEY (table_id) REFERENCES chat_gpt.tb_product_tables(id),
	CONSTRAINT tb_table_columns_fk FOREIGN KEY (description_key) REFERENCES chat_gpt.tb_key_description(id)
);