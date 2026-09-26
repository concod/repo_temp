--liquibase formatted sql
--changeset liquibase:qc_results_pivot stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for qc_results_pivot

CREATE TABLE price_promo_opt.qc_results_pivot (
	check_date date NOT NULL,
	table_type varchar NOT NULL,
	table_name varchar NOT NULL,
	total_errors int8 NOT NULL,
	null_chk int8 NOT NULL,
	data_range_chk int8 NOT NULL,
	missing_data_chk int8 NOT NULL,
	integrity_chk int8 NOT NULL,
	data_chk int8 NOT NULL
)
;
