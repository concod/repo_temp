--liquibase formatted sql
--changeset liquibase:tb_screen_filter_config_map_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_screen_filter_config_map_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_screen_filter_config_map_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_screen_filter_config_map stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_screen_filter_config_map

CREATE TABLE config_schema.tb_screen_filter_config_map (
	id integer DEFAULT nextval('config_schema.tb_screen_filter_config_map_id_seq'::regclass) NOT NULL,
	screen_config_id integer NOT NULL,
	config_key varchar(100) NOT NULL,
	config_name varchar(255) NOT NULL,
	display_order integer DEFAULT 0 NOT NULL,
	is_active boolean DEFAULT true NOT NULL,
	created_at timestamp without time zone DEFAULT now() NOT NULL,
	updated_at timestamp without time zone DEFAULT now() NOT NULL,
	CONSTRAINT uq_screen_filter_config_key UNIQUE (screen_config_id, config_key),
	CONSTRAINT tb_screen_filter_config_map_pkey PRIMARY KEY (id),
	CONSTRAINT tb_screen_filter_config_map_screen_config_id_fkey FOREIGN KEY (screen_config_id) REFERENCES config_schema.tb_screen_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_screen_filter_config_map_screen ON config_schema.tb_screen_filter_config_map USING btree (screen_config_id);
