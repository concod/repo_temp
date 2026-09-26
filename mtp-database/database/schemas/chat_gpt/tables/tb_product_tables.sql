--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_product_tables_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_product_tables table creation



CREATE TABLE chat_gpt.tb_product_tables (
	id bigserial NOT NULL,
	table_name varchar(50) NOT NULL,
	product_id int4 NOT NULL,
	created_by int4 NULL,
	is_active bool NULL DEFAULT true,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_product_tables_id_key UNIQUE (id),
	CONSTRAINT tb_product_tables_pkey PRIMARY KEY (table_name, product_id),
	CONSTRAINT product_id_fk FOREIGN KEY (product_id) REFERENCES chat_gpt.tb_products(id)
);
CREATE INDEX fki_product_id_fk ON chat_gpt.tb_product_tables USING btree (product_id);