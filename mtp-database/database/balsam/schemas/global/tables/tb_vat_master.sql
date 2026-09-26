--liquibase formatted sql
--changeset liquibase:tb_vat_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_vat_master

CREATE TABLE "global".tb_vat_master (
	"Country" text NULL,
	var_percent float4 NULL,
	l0_id int4 NOT NULL,
	CONSTRAINT tb_vat_master_pk PRIMARY KEY (l0_id)
);


--changeset anshika.mungiya@impactanalytics.co:tb_vat_master_June6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_vat_master_June6

ALTER TABLE "global".tb_vat_master
DROP CONSTRAINT tb_vat_master_pk;

ALTER TABLE "global".tb_vat_master
ALTER COLUMN l0_id DROP NOT NULL;
