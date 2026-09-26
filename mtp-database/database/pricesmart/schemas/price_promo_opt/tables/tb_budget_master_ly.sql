--liquibase formatted sql
--changeset liquibase:tb_budget_master_ly stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_budget_master_ly

CREATE TABLE price_promo_opt.tb_budget_master_ly (
	s0_id int8 NULL,
	s1_id int8 NULL,
	channel varchar NULL,
	product_id int8 NULL,
	store_id int8 NULL,
	dates date NULL,
	units float8 NULL,
	margin float8 NULL,
	revenue float8 NULL
)
PARTITION BY RANGE (dates);