--liquibase formatted sql
--changeset liquibase:tb_user_table_preferences_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_user_table_preferences_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_user_table_preferences_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_user_table_preferences stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_user_table_preferences

CREATE TABLE config_schema.tb_user_table_preferences (
	id integer DEFAULT nextval('config_schema.tb_user_table_preferences_id_seq'::regclass) NOT NULL,
	user_id varchar(100) NOT NULL,
	table_config_id integer NOT NULL,
	column_overrides jsonb DEFAULT '[]'::jsonb NOT NULL,
	collapsed_groups jsonb DEFAULT '[]'::jsonb,
	sort_model jsonb DEFAULT '[]'::jsonb,
	filter_model jsonb DEFAULT '{}'::jsonb,
	action_states jsonb DEFAULT '{}'::jsonb,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_user_table_preferences_user_id_table_config_id_key UNIQUE (user_id, table_config_id),
	CONSTRAINT tb_user_table_preferences_pkey PRIMARY KEY (id),
	CONSTRAINT tb_user_table_preferences_table_config_id_fkey FOREIGN KEY (table_config_id) REFERENCES config_schema.tb_table_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_user_prefs_table ON config_schema.tb_user_table_preferences USING btree (table_config_id);
CREATE INDEX idx_user_prefs_user ON config_schema.tb_user_table_preferences USING btree (user_id);
