--liquibase formatted sql
--changeset liquibase:tb_kpi_card_overrides_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_overrides_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_kpi_card_overrides_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_kpi_card_overrides stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_kpi_card_overrides

CREATE TABLE config_schema.tb_kpi_card_overrides (
	id integer DEFAULT nextval('config_schema.tb_kpi_card_overrides_id_seq'::regclass) NOT NULL,
	card_group_id integer NOT NULL,
	override_label varchar(255) NOT NULL,
	match_criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
	template_id integer,
	card_orientation varchar(20),
	card_size varchar(20),
	custom_styles jsonb,
	click_action jsonb,
	feature_config jsonb,
	measure_overrides jsonb DEFAULT '{}'::jsonb,
	placeholder_overrides jsonb DEFAULT '{}'::jsonb,
	display_order integer DEFAULT 0 NOT NULL,
	is_active boolean DEFAULT true NOT NULL,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	created_by varchar(100),
	updated_by varchar(100),
	CONSTRAINT tb_kpi_card_overrides_pkey PRIMARY KEY (id),
	CONSTRAINT tb_kpi_card_overrides_card_group_id_fkey FOREIGN KEY (card_group_id) REFERENCES config_schema.tb_kpi_card_groups(id) ON DELETE CASCADE,
	CONSTRAINT tb_kpi_card_overrides_template_id_fkey FOREIGN KEY (template_id) REFERENCES config_schema.tb_kpi_card_templates(id) ON DELETE SET NULL
);
CREATE INDEX idx_kpi_card_overrides_group ON config_schema.tb_kpi_card_overrides USING btree (card_group_id);
CREATE INDEX idx_kpi_card_overrides_match ON config_schema.tb_kpi_card_overrides USING gin (match_criteria);
