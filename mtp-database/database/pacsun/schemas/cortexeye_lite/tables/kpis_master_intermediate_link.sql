--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:kpis_master_intermediate_link stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_intermediate_link

CREATE TABLE cortexeye_lite.kpis_master_intermediate_link (
	kpi_name varchar(255) NOT NULL,
	intermediate_column varchar(255) NOT NULL,
	CONSTRAINT kpis_master_intermediate_link_pkey PRIMARY KEY (kpi_name, intermediate_column)
);