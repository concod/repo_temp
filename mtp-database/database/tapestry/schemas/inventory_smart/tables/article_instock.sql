-- liquibase formatted sql
-- changeset nibeel.yunus@impactanalytics.co:article_instock stripComments:false splitStatements:false context:MTP-64270 labels:article_instock
-- comment: initial changeset for article_instock

CREATE TABLE inventory_smart.article_instock (
	article varchar NOT NULL,
	in_stock_count int4 NULL,
	total_count int4 NULL,
	dc_instock_count int4 NULL,
	dc_instock_total_count int4 NULL,
	CONSTRAINT article_instock_un UNIQUE (article)
) 