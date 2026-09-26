--liquibase formatted sql
--changeset liquibase:tb_strategy_qc_record stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_strategy_qc_record

CREATE TABLE price_markdown_opt.tb_strategy_qc_record (
	qc_date date NULL,
	strategy_id int4 NULL,
	ia_duplicate_dates int4 NULL,
	ia_duplicate_promo int4 NULL,
	ia_no_of_dates int4 NULL,
	ia_missing_sku_store int4 NULL,
	fin_duplicate_dates int4 NULL,
	fin_duplicate_promo int4 NULL,
	fin_no_of_dates int4 NULL,
	actual_duplicate_dates int4 NULL,
	actual_duplicate_promo int4 NULL
);

