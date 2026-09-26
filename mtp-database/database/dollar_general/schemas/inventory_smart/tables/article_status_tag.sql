--liquibase formatted sql
--changeset liquibase:article_status_tag stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_status_tag
CREATE TABLE inventory_smart.article_status_tag (
	product_code varchar NOT NULL,
	l0_code varchar NOT NULL,
    primary_sku varchar NOT NULL,
    channel varchar NOT NULL,
	article_status_tag varchar NOT NULL,
	"size" varchar NOT NULL,
	new_size varchar NOT NULL,
	"order" int2 NULL
    -- ,
	-- CONSTRAINT article_status_tag_un UNIQUE (product_code, channel)
);
ALTER TABLE inventory_smart.article_status_tag ADD CONSTRAINT article_status_tag_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;