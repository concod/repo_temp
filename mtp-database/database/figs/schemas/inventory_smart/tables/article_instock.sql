-- liquibase formatted sql
-- changeset keerthi.vardhani@impactanalytics.co:article_instock_figs11 stripComments:false splitStatements:false context:MTP-MTP-64365 labels:MTP-64365
-- comment: initial changeset for article_instock

CREATE TABLE if not exists inventory_smart.article_instock (
	article varchar NOT NULL,
	in_stock_count int4 NULL,
	total_count int4 NULL,
	dc_instock_count int4 NULL,
	dc_instock_total_count int4 NULL,
	CONSTRAINT article_instock_un UNIQUE (article)
);