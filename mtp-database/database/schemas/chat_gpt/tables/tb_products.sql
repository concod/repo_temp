--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_products_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_products table creation



CREATE TABLE chat_gpt.tb_products (
	id bigserial NOT NULL,
	product_name text NOT NULL,
	client_id int4 NOT NULL,
	connection_id int4 NULL,
	created_by int4 NULL,
	is_active bool NULL DEFAULT true,
	default_prompt_id int8 NOT NULL DEFAULT 0,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_products_id_key UNIQUE (id),
	CONSTRAINT tb_products_pkey PRIMARY KEY (product_name, client_id),
	CONSTRAINT connection_id_fk FOREIGN KEY (connection_id) REFERENCES chat_gpt.tb_db_connections(id),
	CONSTRAINT fk_client_id FOREIGN KEY (client_id) REFERENCES chat_gpt.tb_clients(id)
);
CREATE INDEX fki_connection_id_fk ON chat_gpt.tb_products USING btree (connection_id);
CREATE INDEX fki_fk_client_id ON chat_gpt.tb_products USING btree (client_id);