--liquibase formatted sql
--changeset liquibase:tb_download_sub_grains_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_sub_grains_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_sub_grains_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_sub_grains stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_sub_grains

CREATE TABLE config_schema.tb_download_sub_grains (
	id integer DEFAULT nextval('config_schema.tb_download_sub_grains_id_seq'::regclass) NOT NULL,
	grain_id integer NOT NULL,
	column_name varchar(255) NOT NULL,
	column_label varchar(255) NOT NULL,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	output_position integer,
	CONSTRAINT tb_download_sub_grains_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_sub_grains_grain_id_fkey FOREIGN KEY (grain_id) REFERENCES config_schema.tb_download_grains(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_sub_grains_grain ON config_schema.tb_download_sub_grains USING btree (grain_id);
