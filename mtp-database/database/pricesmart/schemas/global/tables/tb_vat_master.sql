--liquibase formatted sql
--changeset anshika.mungiya@impactanalytics.co:tb_vat_master_June5 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_vat_master_June5



CREATE TABLE "global".tb_vat_master (
	l0_id int4 NULL,
	vat_percentage numeric(5, 2) NULL
);