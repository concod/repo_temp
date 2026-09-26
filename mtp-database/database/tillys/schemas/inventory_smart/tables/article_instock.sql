--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:article_instock stripComments:false splitStatements:false context:Release_1_0 labels:article_instock
--comment: initial changeset for article_instock

CREATE TABLE if not exists inventory_smart.article_instock (
	article varchar NOT NULL,
	in_stock_count int4 NULL,
	total_count int4 NULL,
	dc_instock_count int4 NULL,
	dc_instock_total_count int4 NULL,
	CONSTRAINT article_instock_un UNIQUE (article)
);