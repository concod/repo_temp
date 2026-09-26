--liquibase formatted sql
--changeset liquibase:tb_chart_groups_id_seq stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_groups_id_seq

CREATE SEQUENCE IF NOT EXISTS config_schema.tb_chart_groups_id_seq
    INCREMENT BY 1
    MINVALUE 1
    MAXVALUE 2147483647
    START WITH 1
    NO CYCLE;

--changeset liquibase:tb_chart_groups stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_chart_groups

CREATE TABLE config_schema.tb_chart_groups (
	id integer DEFAULT nextval('config_schema.tb_chart_groups_id_seq'::regclass) NOT NULL,
	dashboard_id integer NOT NULL,
	parent_group_id integer,
	group_name varchar(255) NOT NULL,
	group_code varchar(100) NOT NULL,
	layout_config jsonb DEFAULT '{}'::jsonb,
	propagate_filters_in boolean DEFAULT false,
	bubble_filters_out boolean DEFAULT false,
	custom_styles jsonb DEFAULT '{}'::jsonb,
	display_order integer DEFAULT 0,
	is_active boolean DEFAULT true,
	created_at timestamp without time zone DEFAULT now(),
	updated_at timestamp without time zone DEFAULT now(),
	CONSTRAINT tb_chart_groups_pkey PRIMARY KEY (id),
	CONSTRAINT tb_chart_groups_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES config_schema.tb_chart_dashboards(id) ON DELETE CASCADE,
	CONSTRAINT tb_chart_groups_parent_group_id_fkey FOREIGN KEY (parent_group_id) REFERENCES config_schema.tb_chart_groups(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX idx_chart_groups_code ON config_schema.tb_chart_groups USING btree (dashboard_id, group_code);
CREATE INDEX idx_chart_groups_dashboard ON config_schema.tb_chart_groups USING btree (dashboard_id);
CREATE INDEX idx_chart_groups_parent ON config_schema.tb_chart_groups USING btree (parent_group_id);
