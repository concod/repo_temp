--liquibase formatted sql
--changeset liquibase:tb_kpi_placeholder_mappings_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_placeholder_mappings_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_placeholder_mappings_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_placeholder_mappings stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_placeholder_mappings

CREATE TABLE config_schema.tb_kpi_placeholder_mappings (
	id integer DEFAULT nextval('config_schema.tb_kpi_placeholder_mappings_id_seq'::regclass) NOT NULL,
	card_group_id integer NOT NULL,
	placeholder_key varchar(100) NOT NULL,
	source_type varchar(30) DEFAULT 'column'::character varying,
	source_column varchar(255),
	measure_id integer,
	static_value text,
	formula_expression text,
	formatter_type_id integer,
	formatter_options jsonb,
	conditional_styles jsonb,
	icon_config jsonb,
	display_order integer DEFAULT 0,
	is_visible boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	display_label varchar(255),
	aggregation_function varchar(30),
	placeholder_group_by text[],
	object_value_path varchar(500) DEFAULT NULL::character varying,
	CONSTRAINT tb_kpi_placeholder_mappings_pkey PRIMARY KEY (id),
	CONSTRAINT tb_kpi_placeholder_mappings_card_group_id_fkey FOREIGN KEY (card_group_id) REFERENCES config_schema.tb_kpi_card_groups(id) ON DELETE CASCADE,
	CONSTRAINT tb_kpi_placeholder_mappings_formatter_type_id_fkey FOREIGN KEY (formatter_type_id) REFERENCES config_schema.tb_formatter_type_mst(formatter_type_id) ON DELETE SET NULL,
	CONSTRAINT tb_kpi_placeholder_mappings_measure_id_fkey FOREIGN KEY (measure_id) REFERENCES config_schema.tb_kpi_card_measures(id) ON DELETE SET NULL
);
CREATE INDEX idx_kpi_placeholder_formatter ON config_schema.tb_kpi_placeholder_mappings USING btree (formatter_type_id);
CREATE INDEX idx_kpi_placeholder_group ON config_schema.tb_kpi_placeholder_mappings USING btree (card_group_id);
CREATE INDEX idx_kpi_placeholder_measure ON config_schema.tb_kpi_placeholder_mappings USING btree (measure_id);
CREATE INDEX idx_kpi_placeholder_order ON config_schema.tb_kpi_placeholder_mappings USING btree (card_group_id, display_order);
