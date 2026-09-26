--liquibase formatted sql
--changeset liquibase:tb_filter_control_data_source_link_link_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_control_data_source_link_link_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_filter_control_data_source_link_link_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_filter_control_data_source_link stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_filter_control_data_source_link

CREATE TABLE config_schema.tb_filter_control_data_source_link (
	link_id integer DEFAULT nextval('config_schema.tb_filter_control_data_source_link_link_id_seq'::regclass) NOT NULL,
	control_config_id integer NOT NULL,
	data_source_id integer NOT NULL,
	param_mappings jsonb,
	static_params jsonb,
	override_filter_conditions text,
	override_cache_ttl integer,
	override_max_records integer,
	link_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_filter_control_data_source_control_config_id_data_source_key UNIQUE (control_config_id, data_source_id, link_order),
	CONSTRAINT tb_filter_control_data_source_link_pkey PRIMARY KEY (link_id),
	CONSTRAINT tb_filter_control_data_source_link_control_config_id_fkey FOREIGN KEY (control_config_id) REFERENCES config_schema.tb_filter_control_configurations(id) ON DELETE CASCADE,
	CONSTRAINT tb_filter_control_data_source_link_data_source_id_fkey FOREIGN KEY (data_source_id) REFERENCES config_schema.tb_filter_data_source_mst(data_source_id) ON DELETE RESTRICT
);
CREATE INDEX idx_filter_control_ds_link_active ON config_schema.tb_filter_control_data_source_link USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_filter_control_ds_link_control ON config_schema.tb_filter_control_data_source_link USING btree (control_config_id);
CREATE INDEX idx_filter_control_ds_link_ds ON config_schema.tb_filter_control_data_source_link USING btree (data_source_id);
