--liquibase formatted sql
--changeset liquibase:tb_currency_priority stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_currency_priority

CREATE TABLE "global".tb_currency_priority (
	source_currency_id int4 NULL,
	target_currency_id int4 NULL,
	priority_number int4 NULL
);