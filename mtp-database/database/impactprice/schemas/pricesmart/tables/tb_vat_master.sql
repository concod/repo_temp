--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_vat_master_consolidated stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: consolidated changeset for tb_vat_master

CREATE TABLE IF NOT EXISTS "pricesmart".tb_vat_master (
	"Country" text NULL,
	vat_percentage float4 NULL,
	s0_id int4 NOT NULL,
	CONSTRAINT tb_vat_master_pk PRIMARY KEY (s0_id)
);
