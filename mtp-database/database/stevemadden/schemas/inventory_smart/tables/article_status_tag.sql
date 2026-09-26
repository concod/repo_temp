--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:article_status_tag stripComments:false splitStatements:false context:Release_1_0 labels:sm_article_status_tag
--comment: initial changeset for article_status_tag
CREATE TABLE if NOT exists  inventory_smart.article_status_tag (
	product_code varchar NOT NULL,
	channel varchar NOT NULL,
	article_status_tag varchar NOT NULL,
	"size" varchar NOT NULL,
	new_size varchar NOT NULL,
	"order" int2 NULL,
	CONSTRAINT article_status_tag_un UNIQUE (product_code, channel),
	CONSTRAINT article_status_tag_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);
CREATE INDEX article_status_tag_combine_idx ON inventory_smart.article_status_tag USING btree (product_code, channel, article_status_tag);