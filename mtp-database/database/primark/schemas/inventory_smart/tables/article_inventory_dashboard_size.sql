-- liquibase formatted sql
-- changeset aman.lakkoju:article_inventory_dashboard_size stripComments:false splitStatements:false context: db_sync labels:article_inventory_dashboard_size
-- comment: initial changeset for article_inventory_dashboard_size
CREATE TABLE inventory_smart.article_inventory_dashboard_size (
	article varchar NULL,
	product_code varchar NULL,
	store_code varchar NULL,
	"size" varchar NULL,
	channel varchar NULL,
	lw_units int4 NULL,
	wtd_units int4 NULL
);
CREATE INDEX IF NOT EXISTS article_inventory_dashboard_size_article_idx ON inventory_smart.article_inventory_dashboard_size USING btree (article);

