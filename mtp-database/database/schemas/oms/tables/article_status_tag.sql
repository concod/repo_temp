--liquibase formatted sql
--changeset liquibase:article_status_tag stripComments:false splitStatements:false context:pipeline fix labels:pipeline fix
--comment: pipeline fix
CREATE TABLE if not exists oms.article_status_tag (
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

--changeset raja.duraisamy@impactanalytics.co:article_status_tag_performance_indexes_1 stripComments:false splitStatements:false context:performance_optimization labels:OMS_PERFORMANCE_INDEXES
--comment: Performance indexes for article_status_tag based on query analysis
CREATE INDEX if not exists article_status_tag_combine_idx ON oms.article_status_tag USING btree (product_code, channel, article_status_tag);
CREATE INDEX if not exists article_status_tag_article_status_tag_idx ON oms.article_status_tag USING btree (article_status_tag);

--changeset raja.duraisamy@impactanalytics.co:index_article_status_tag_drop_indexes stripComments:false splitStatements:false context:generic_schema_update labels:GENERIC_SCHEMA_UPDATE
--comment: Index for article_status_tag
DROP INDEX IF EXISTS oms.article_status_tag_article_status_tag_idx;