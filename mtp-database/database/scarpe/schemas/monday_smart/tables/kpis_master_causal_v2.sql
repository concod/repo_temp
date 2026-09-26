--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:kpis_master_causal_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_causal_v2

CREATE TABLE monday_smart.kpis_master_causal_v2 (
	kpi_code serial4 NOT NULL,
	kc_code int4 NOT NULL,
	"name" varchar NOT NULL,
	description text NULL,
	formula text NOT NULL,
	variables _varchar DEFAULT ARRAY[]::character varying[] NOT NULL,
	"type" varchar DEFAULT 'simple'::character varying NOT NULL,
	formula_description varchar(50) NULL,
	identifier varchar(50) DEFAULT NULL::character varying NULL,
	display_name varchar(50) DEFAULT NULL::character varying NULL,
	sort_order int4 NULL,
	format varchar(50) DEFAULT NULL::character varying NULL,
	min_thres float8 NULL,
	max_thres float8 NULL,
	tablename varchar NULL,
	formulae_temp json NULL,
	agg_type varchar NULL,
	prompt varchar NULL,
	"version" varchar NULL,
	CONSTRAINT kpis_pk2_causal PRIMARY KEY (kpi_code)
);


-- monday_smart.kpis_master_causal_v2 foreign keys

ALTER TABLE monday_smart.kpis_master_causal_v2 ADD CONSTRAINT kpis_master_casusal_map_fk2 FOREIGN KEY (kc_code) REFERENCES monday_smart.kpi_categories_master_causal(kc_code) ON DELETE CASCADE;