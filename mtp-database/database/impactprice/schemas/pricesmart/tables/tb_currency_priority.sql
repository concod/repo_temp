--liquibase formatted sql
--changeset pranshu.pandey@impactanalytics.co:tb_currency_priority  stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_priority

CREATE TABLE IF NOT EXISTS "pricesmart".tb_currency_priority (
	source_currency_id int4 NOT NULL,
	target_currency_id int4 NOT NULL,
	priority_number int4 NULL,
	CONSTRAINT pk_currency_priority PRIMARY KEY (source_currency_id, target_currency_id)
);