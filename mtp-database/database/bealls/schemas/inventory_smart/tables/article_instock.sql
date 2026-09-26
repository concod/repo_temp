--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:article_instock_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_instock_01


CREATE TABLE IF NOT EXISTS inventory_smart.article_instock (
	article varchar NOT NULL,
	in_stock_count int4 NULL,
	total_count int4 NULL,
	dc_instock_count int4 NULL,
	dc_instock_total_count int4 NULL,
	CONSTRAINT article_instock_un UNIQUE (article)
);