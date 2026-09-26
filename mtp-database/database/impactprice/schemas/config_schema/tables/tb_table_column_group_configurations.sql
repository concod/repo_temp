--liquibase formatted sql
--changeset liquibase:tb_column_group_configurations_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_column_group_configurations_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_column_group_configurations_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_table_column_group_configurations stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_table_column_group_configurations

CREATE TABLE config_schema.tb_table_column_group_configurations (
	id integer DEFAULT nextval('config_schema.tb_column_group_configurations_id_seq'::regclass) NOT NULL,
	table_config_id integer NOT NULL,
	group_id varchar(100) NOT NULL,
	group_name varchar(255) NOT NULL,
	display_order integer DEFAULT 0,
	is_collapsible boolean DEFAULT false,
	collapsed_visible_columns jsonb DEFAULT '[]'::jsonb,
	is_default_collapsed boolean DEFAULT false,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	group_code varchar(100),
	parent_group_id integer,
	is_open_by_default boolean DEFAULT true,
	marry_children boolean DEFAULT false,
	header_class varchar(100),
	header_tooltip varchar(255),
	custom_config jsonb,
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_column_group_configurations_table_config_id_group_id_key UNIQUE (table_config_id, group_id),
	CONSTRAINT tb_column_group_configurations_pkey PRIMARY KEY (id),
	CONSTRAINT tb_column_group_configurations_parent_group_id_fkey FOREIGN KEY (parent_group_id) REFERENCES config_schema.tb_table_column_group_configurations(id) ON DELETE SET NULL,
	CONSTRAINT tb_column_group_configurations_table_config_id_fkey FOREIGN KEY (table_config_id) REFERENCES config_schema.tb_table_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_col_group_order ON config_schema.tb_table_column_group_configurations USING btree (table_config_id, display_order);
CREATE INDEX idx_col_group_table ON config_schema.tb_table_column_group_configurations USING btree (table_config_id);
CREATE INDEX idx_column_group_table ON config_schema.tb_table_column_group_configurations USING btree (table_config_id);
