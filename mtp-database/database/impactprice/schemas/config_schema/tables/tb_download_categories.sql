--liquibase formatted sql
--changeset liquibase:tb_download_categories_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_categories_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_categories_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_categories stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_categories

CREATE TABLE config_schema.tb_download_categories (
	id integer DEFAULT nextval('config_schema.tb_download_categories_id_seq'::regclass) NOT NULL,
	download_config_id integer NOT NULL,
	category_code varchar(100) NOT NULL,
	category_name varchar(255) NOT NULL,
	display_order integer DEFAULT 0,
	is_required boolean DEFAULT false,
	icon varchar(100),
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_download_categories_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_categories_download_config_id_fkey FOREIGN KEY (download_config_id) REFERENCES config_schema.tb_download_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_categories_config ON config_schema.tb_download_categories USING btree (download_config_id);
CREATE UNIQUE INDEX idx_download_categories_code ON config_schema.tb_download_categories USING btree (download_config_id, category_code);
