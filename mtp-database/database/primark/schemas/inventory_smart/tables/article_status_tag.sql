--liquibase formatted sql
--changeset liquibase:article_status_tag stripComments:false splitStatements:false context:pipeline fix labels:pipeline fix
--comment: pipeline fix
CREATE TABLE if not exists inventory_smart.article_status_tag (
	product_code varchar NOT NULL,
	channel varchar NOT NULL,
	article_status_tag varchar NOT NULL,
	"size" varchar NOT NULL,
	new_size varchar NOT NULL,
	"order" int2 NULL,
	product_image_link varchar NULL,
	CONSTRAINT article_status_tag_un UNIQUE (product_code, channel),
	CONSTRAINT article_status_tag_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE
);
CREATE INDEX if not exists article_status_tag_combine_idx ON inventory_smart.article_status_tag USING btree (product_code, channel, article_status_tag);