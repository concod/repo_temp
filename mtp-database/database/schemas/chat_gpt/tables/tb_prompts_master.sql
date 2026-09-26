--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:tb_prompts_master_questions_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: tb_prompts_master table creation


CREATE TABLE chat_gpt.tb_prompts_master (
	id serial4 NOT NULL,
	prompt text NOT NULL,
	client_id int4 NOT NULL,
	product_id int4 NOT NULL,
	remarks varchar NULL,
	provider_id int8 NULL,
	no_ans_message varchar(200) NULL,
	created_on timestamp NOT NULL DEFAULT now(),
	updated_on timestamp NOT NULL DEFAULT now(),
	created_by int4 NOT NULL DEFAULT '-1'::integer,
	updated_by int4 NOT NULL DEFAULT '-1'::integer,
	CONSTRAINT tb_propmts_master_pk PRIMARY KEY (prompt, client_id, product_id),
	CONSTRAINT tb_propmts_master_fk FOREIGN KEY (client_id) REFERENCES chat_gpt.tb_clients(id),
	CONSTRAINT tb_propmts_master_fk_1 FOREIGN KEY (product_id) REFERENCES chat_gpt.tb_products(id)
);

CREATE INDEX fki_fk_table_id ON chat_gpt.tb_table_columns USING btree (table_id);
