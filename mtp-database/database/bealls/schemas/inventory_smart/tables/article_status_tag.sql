--liquibase formatted sql
--changeset praharsh.snehi@impactanalytics.co:article_status_tag_change stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_status_tag
CREATE TABLE IF NOT EXISTS inventory_smart.article_status_tag (
	product_code varchar NOT NULL,
	channel varchar NOT NULL,
	article_status_tag varchar NOT NULL,
	"size" varchar NOT NULL,
	new_size varchar NOT NULL,
	"order" int4 NULL,
    size_order int4,
    size_mapping_classification varchar NULL,
    product_description varchar NULL,
    article varchar NULL,
	CONSTRAINT article_status_tag_un UNIQUE (product_code, channel)
);
CREATE INDEX IF NOT EXISTS article_status_tag_combine_idx ON inventory_smart.article_status_tag USING btree (product_code, channel, article_status_tag);
ALTER TABLE inventory_smart.article_status_tag DROP CONSTRAINT IF EXISTS article_status_tag_product_fk;
ALTER TABLE inventory_smart.article_status_tag ADD CONSTRAINT article_status_tag_product_fk FOREIGN KEY (product_code) REFERENCES "global".product_master(product_code) ON DELETE CASCADE;


