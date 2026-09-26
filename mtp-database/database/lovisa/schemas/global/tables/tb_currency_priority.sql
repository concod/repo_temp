--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:tb_currency_priority stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_priority

CREATE TABLE "global".tb_currency_priority (
	source_currency_id int4 NOT NULL,
	target_currency_id int4 NOT NULL,
	priority_number int4 NULL,
	CONSTRAINT tb_currency_priority_pk PRIMARY KEY (source_currency_id, target_currency_id)
);


--changeset anshika.mungiya@impactanalytics.co:tb_currency_priority_June6 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated schema for tb_currency_priority_June6


ALTER TABLE "global".tb_currency_priority
DROP CONSTRAINT tb_currency_priority_pk;

ALTER TABLE "global".tb_currency_priority
ALTER COLUMN source_currency_id DROP NOT NULL;


ALTER TABLE "global".tb_currency_priority
ALTER COLUMN target_currency_id DROP NOT NULL;