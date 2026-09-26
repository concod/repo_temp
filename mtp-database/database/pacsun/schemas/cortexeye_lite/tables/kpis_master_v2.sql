--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:kpis_master_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_v2

CREATE TABLE cortexeye_lite.kpis_master_v2 (
	kpi_code int4 NULL,
	kc_code int4 NULL,
	"name" varchar(255) NOT NULL,
	description varchar(500) NULL,
	formula varchar(1000) NULL,
	table_name varchar(255) NULL,
	variables _text NULL,
	"type" varchar(100) NULL,
	formula_description text NULL,
	identifier varchar(255) NULL,
	display_name varchar(255) NULL,
	sort_order int4 NULL,
	format varchar(50) NULL,
	min_thres float4 NULL,
	max_thres float4 NULL,
	CONSTRAINT kpis_master_v2_pkey PRIMARY KEY (name)
);