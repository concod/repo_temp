--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:kpis_master_intermediate_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_intermediate_v2

CREATE TABLE cortexeye_lite.kpis_master_intermediate_v2 (
	ic_code int4 NULL,
	intermediate_column varchar(255) NOT NULL,
	formula text NULL,
	table_name varchar(255) NULL,
	"template" text NULL,
	CONSTRAINT kpis_master_intermediate_v2_pkey PRIMARY KEY (intermediate_column)
);