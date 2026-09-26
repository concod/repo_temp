--liquibase formatted sql
--changeset liquibase:qc_results stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for qc_results

CREATE TABLE price_promo_opt.qc_results (
	check_date date NOT NULL,
	table_type varchar NOT NULL,
	table_name varchar NOT NULL,
	check_name varchar NOT NULL,
	errors int8 NOT NULL
)
;
