--liquibase formatted sql
--changeset liquibase:budget_master_sku stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for budget_master_sku

CREATE TABLE price_promo.budget_master_sku (
	item_id int8 NOT NULL,
	store_id varchar(100) NOT NULL,
	dates date NOT NULL,
	actual_quantity float8 NULL,
	actual_margin float8 NULL,
	actual_revenue float8 NULL,
	budget float8 NULL,
	baseline_quantity float8 NULL,
	baseline_margin float8 NULL,
	baseline_revenue float8 NULL,
	CONSTRAINT budget_master_sku_pk PRIMARY KEY (item_id, store_id, dates)
);