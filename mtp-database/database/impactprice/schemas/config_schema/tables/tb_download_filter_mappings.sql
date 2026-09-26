--liquibase formatted sql
--changeset liquibase:tb_download_filter_mappings_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_filter_mappings_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_download_filter_mappings_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_download_filter_mappings stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_download_filter_mappings

CREATE TABLE config_schema.tb_download_filter_mappings (
	id integer DEFAULT nextval('config_schema.tb_download_filter_mappings_id_seq'::regclass) NOT NULL,
	download_config_id integer NOT NULL,
	filter_control_id integer NOT NULL,
	target_table_type varchar(10) NOT NULL,
	target_table_id integer NOT NULL,
	target_column varchar(255) NOT NULL,
	operator varchar(20) DEFAULT '='::character varying,
	is_required boolean DEFAULT false,
	display_order integer DEFAULT 0,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	target_scope varchar(20) DEFAULT 'where'::character varying,
	cte_command_id integer,
	cte_placeholder_key varchar(100),
	CONSTRAINT tb_download_filter_mappings_pkey PRIMARY KEY (id),
	CONSTRAINT tb_download_filter_mappings_cte_command_id_fkey FOREIGN KEY (cte_command_id) REFERENCES config_schema.tb_download_custom_commands(id) ON DELETE SET NULL,
	CONSTRAINT tb_download_filter_mappings_download_config_id_fkey FOREIGN KEY (download_config_id) REFERENCES config_schema.tb_download_configurations(id) ON DELETE CASCADE
);
CREATE INDEX idx_download_filter_mappings_config ON config_schema.tb_download_filter_mappings USING btree (download_config_id);
