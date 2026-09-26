-- liquibase formatted sql
-- changeset akashkumar.rana@impactanalytics.co:tb_style_mapping stripComments:false splitStatements:false context:tb_style_mapping labels:tb_style_mapping 
-- comment: added tb_style_mapping table



CREATE TABLE size_smart.tb_style_mapping (
	"style" varchar(255) NOT NULL,
	mapped_style varchar(255) NOT NULL,
	exit_logic varchar(255) NOT NULL,
	start_date date NOT NULL,
	end_date date NULL,
	trigger_kpi varchar(255) NULL,
	evaluation_week int4 NULL,
	target_threshold int8 NULL,
	is_active bool DEFAULT true NOT NULL,
	created_at timestamp NULL,
	updated_at timestamp NULL,
	CONSTRAINT tb_style_mapping_style_unique UNIQUE (style),
	CONSTRAINT tb_style_mapping_trigger_kpi_check CHECK ((((trigger_kpi)::text = ANY ((ARRAY['sales'::character varying, 'revenue'::character varying, 'margin'::character varying])::text[])) OR (trigger_kpi IS NULL)))
);