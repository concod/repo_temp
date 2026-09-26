--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:article_status_tag_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_product_channel_v1
--comment: article_status_tag_v1
CREATE TABLE IF NOT EXISTS inventory_smart.article_status_tag (
	product_code varchar NOT NULL,
	channel varchar NOT NULL,
	article_status_tag varchar NOT NULL,
	"size" varchar NOT NULL,
	"order" int2 NULL,
	new_size varchar NOT NULL,
	CONSTRAINT article_status_tag_un UNIQUE (product_code, channel),
	CONSTRAINT article_status_tag_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS article_status_tag_combine_idx ON inventory_smart.article_status_tag USING btree (product_code, channel, article_status_tag);