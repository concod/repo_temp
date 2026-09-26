--liquibase formatted sql
--changeset liquibase:tb_vat_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_vat_master

CREATE TABLE "global".tb_vat_master (
	"Country" text NULL,
	vat_percentage float4 NULL,
	l0_cid int4 NULL,
	CONSTRAINT tb_vat_master_pk PRIMARY KEY (l0_cid)
);