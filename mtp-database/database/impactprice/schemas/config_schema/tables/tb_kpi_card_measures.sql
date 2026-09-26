--liquibase formatted sql
--changeset liquibase:tb_kpi_card_measures_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_measures_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_card_measures_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_card_measures stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_measures

CREATE TABLE config_schema.tb_kpi_card_measures (
	id integer DEFAULT nextval('config_schema.tb_kpi_card_measures_id_seq'::regclass) NOT NULL,
	card_group_id integer NOT NULL,
	measure_name varchar(255) NOT NULL,
	measure_code varchar(100) NOT NULL,
	source_column varchar(255),
	aggregation_function varchar(30) DEFAULT 'SUM'::character varying,
	custom_formula text,
	formatter_type_id integer,
	formatter_options jsonb,
	conditional_styles jsonb,
	display_order integer DEFAULT 0,
	is_primary boolean DEFAULT false,
	is_visible boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT tb_kpi_card_measures_pkey PRIMARY KEY (id),
	CONSTRAINT tb_kpi_card_measures_card_group_id_fkey FOREIGN KEY (card_group_id) REFERENCES config_schema.tb_kpi_card_groups(id) ON DELETE CASCADE,
	CONSTRAINT tb_kpi_card_measures_formatter_type_id_fkey FOREIGN KEY (formatter_type_id) REFERENCES config_schema.tb_formatter_type_mst(formatter_type_id) ON DELETE SET NULL
);
CREATE INDEX idx_kpi_measure_formatter ON config_schema.tb_kpi_card_measures USING btree (formatter_type_id);
CREATE INDEX idx_kpi_measure_group ON config_schema.tb_kpi_card_measures USING btree (card_group_id);
CREATE INDEX idx_kpi_measure_order ON config_schema.tb_kpi_card_measures USING btree (card_group_id, display_order);
