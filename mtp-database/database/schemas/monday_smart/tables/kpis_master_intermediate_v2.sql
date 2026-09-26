--liquibase formatted sql
--changeset sivaprasath.vadivel:kpis_master_intermediate_v2_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpis_master_intermediate_v2

CREATE TABLE monday_smart.kpis_master_intermediate_v2 (
	ic_code int4 NULL,
	intermediate_column varchar NOT NULL,
	formula varchar NULL,
	table_name varchar NULL,
	"template" text NULL,
	CONSTRAINT ic_code_pk PRIMARY KEY (intermediate_column)
);