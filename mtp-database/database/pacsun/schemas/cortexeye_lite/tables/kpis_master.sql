--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:kpis_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master

CREATE TABLE cortexeye_lite.kpis_master (
	kpi_code int4 NULL,
	kc_code int4 NULL,
	"name" varchar NULL,
	description text NULL,
	formula text NULL,
	variables _varchar NULL,
	"type" varchar NULL,
	formula_description varchar(50) NULL,
	identifier varchar(50) NULL,
	display_name varchar(50) NULL,
	sort_order int4 NULL,
	format varchar(50) NULL,
	min_thres float8 NULL,
	max_thres float8 NULL
);