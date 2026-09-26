--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:article_store_grade_v1 stripComments:false splitStatements:false context:VS_inv_smart labels:alerts_product_channel_v1
--comment: article_store_grade_v1
CREATE TABLE IF NOT EXISTS inventory_smart.article_store_grade (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	grade varchar NOT NULL,
	ph_code int4 NOT NULL,
	CONSTRAINT article_store_grade_un UNIQUE (article, store_code, grade, ph_code),
	CONSTRAINT article_store_grade_hierarchy_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT,
	CONSTRAINT article_store_grade_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS article_store_grade_ph_code_idx ON inventory_smart.article_store_grade USING btree (ph_code, store_code);
CREATE INDEX IF NOT EXISTS article_store_grade_store_code_idx ON inventory_smart.article_store_grade USING btree (store_code, article);