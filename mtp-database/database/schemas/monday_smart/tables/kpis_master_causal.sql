--liquibase formatted sql
--changeset liquibase:kpis_master_causal_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_causal_create
CREATE TABLE monday_smart.kpis_master_causal (
	kpi_code serial4 NOT NULL,
	kc_code int4 NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	formula text NOT NULL,
	variables _varchar NOT NULL DEFAULT ARRAY[]::character varying[],
	"type" varchar NOT NULL DEFAULT 'simple'::character varying,
	formula_description varchar(50) NULL,
	identifier varchar(50) NULL DEFAULT NULL::character varying,
	display_name varchar(50) NULL DEFAULT NULL::character varying,
	sort_order int4 NULL,
	format varchar(50) NULL DEFAULT NULL::character varying,
	min_thres float8 NULL,
	max_thres float8 NULL,
	CONSTRAINT kpis_pk_causal PRIMARY KEY (kpi_code),
	CONSTRAINT kpis_master_casusal_map_fk FOREIGN KEY (kc_code) REFERENCES monday_smart.kpi_categories_master_causal(kc_code) ON DELETE CASCADE
);