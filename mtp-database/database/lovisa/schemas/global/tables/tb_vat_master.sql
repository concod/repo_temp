--liquibase formatted sql
--changeset  keerthana.reddy@impactanalytics.co:tb_vat_master_15092025 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_vat_master

CREATE TABLE "global".tb_vat_master (
	s1_id int4 not NULL,
	vat_percentage float4 not null,
	CONSTRAINT tb_vat_master_pk PRIMARY KEY (s1_id)
);