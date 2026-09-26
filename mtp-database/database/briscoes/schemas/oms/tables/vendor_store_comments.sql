--liquibase formatted sql
--changeset abhimanyu.sheoran@impactanalytics.co:oms_kpi_master_store stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:vendor_store_comments
--comment: schema changeset for vendor_store_comments

CREATE TABLE IF NOT EXISTS inventory_smart.vendor_store_comments (
	product_code text NULL,
	store_code text NULL,
	"style" text NULL,
	color text NULL,
	"size" text NULL,
	"comment" text NULL,
	order_placement_date date NULL,
	updated_at timestamp NULL,
	updated_by int4 NULL,
	comment_type varchar NULL,
	channel varchar(50) NULL
);

--changeset abhimanyu.sheoran@impactanalytics.co:vendor_store_comments_col_add stripComments:false splitStatements:false context:Release_1_0 ignore:false labels:vendor_store_comments_col_add
--comment: schema changeset adding columns for vendor_store_comments
ALTER TABLE inventory_smart.vendor_store_comments ALTER COLUMN product_code TYPE varchar USING product_code::varchar;
ALTER TABLE inventory_smart.vendor_store_comments ALTER COLUMN store_code TYPE varchar USING store_code::varchar;
ALTER TABLE inventory_smart.vendor_store_comments RENAME COLUMN "style" TO article;
ALTER TABLE inventory_smart.vendor_store_comments ALTER COLUMN article TYPE varchar USING article::varchar;
ALTER TABLE inventory_smart.vendor_store_comments ALTER COLUMN color TYPE varchar USING color::varchar;
ALTER TABLE inventory_smart.vendor_store_comments ALTER COLUMN "size" TYPE varchar USING "size"::varchar;
ALTER TABLE inventory_smart.vendor_store_comments ADD projected_delivery_date date NULL;
