-- liquibase formatted sql
-- changeset aiyush.prasad@impactanalytics.co:article_inventory_dashboard_size stripComments:false splitStatements:false context: db_sync labels:article_inventory_dashboard_size
-- comment: initial changeset for article_inventory_dashboard_size
CREATE TABLE inventory_smart.article_inventory_dashboard_size (
	article varchar NULL,
	article_orig varchar NULL,
	product_code varchar NULL,
	store_code varchar NULL,
	"size" varchar NULL,
	channel varchar NULL,
	lw_sales_units int4 NULL,
	wtd_sales_units int4 NULL
);

--changeset surendra.babu@impactanalytics.co:article_inventory_dashboard_size_article_idx_v1 stripComments:false splitStatements:false context:Release_1_0 labels:aid_article_idx
--comment: create index on article

CREATE INDEX IF NOT EXISTS article_inventory_dashboard_size_article_idx ON inventory_smart.article_inventory_dashboard_size USING btree (article);