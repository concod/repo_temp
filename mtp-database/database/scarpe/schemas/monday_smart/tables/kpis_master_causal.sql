--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:dimension_attributes_internal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attribute_mapping

CREATE TABLE monday_smart.kpis_master_causal (
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
	CONSTRAINT kpis_pk_causal PRIMARY KEY (kpi_code)
);


-- monday_smart.kpis_master_causal foreign keys

ALTER TABLE monday_smart.kpis_master_causal ADD CONSTRAINT kpis_master_casusal_map_fk FOREIGN KEY (kc_code) REFERENCES monday_smart.kpi_categories_master_causal(kc_code) ON DELETE CASCADE;