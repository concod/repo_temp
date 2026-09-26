--liquibase formatted sql
--changeset liquibase:tb_screen_filter_config_map_history_history_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_screen_filter_config_map_history_history_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_screen_filter_config_map_history_history_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_screen_filter_config_map_history stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_screen_filter_config_map_history

CREATE TABLE config_schema.tb_screen_filter_config_map_history (
	history_id bigint DEFAULT nextval('config_schema.tb_screen_filter_config_map_history_history_id_seq'::regclass) NOT NULL,
	original_id integer,
	operation text,
	changed_at timestamp with time zone DEFAULT now(),
	changed_by text DEFAULT CURRENT_USER,
	old_data jsonb,
	new_data jsonb,
	CONSTRAINT tb_screen_filter_config_map_history_pkey PRIMARY KEY (history_id)
);
