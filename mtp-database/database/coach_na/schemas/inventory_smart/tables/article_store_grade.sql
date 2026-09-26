--liquibase formatted sql
--changeset manas.malik@impactanalytics.co:article_store_grade_1 stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_article_store_grade
--comment: initial changeset for article_store_grade
-- inventory_smart.article_store_grade definition
-- Drop table
CREATE   TABLE    inventory_smart.article_store_grade (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	grade varchar NOT NULL,
	ph_code int4 NOT NULL,
	priority int4 NULL,
	CONSTRAINT article_store_grade_un UNIQUE (article, store_code, grade, ph_code),
	CONSTRAINT article_store_grade_hierarchy_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT,
	CONSTRAINT article_store_grade_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE UNIQUE INDEX article_store_grade_ph_code_idx ON inventory_smart.article_store_grade USING btree (ph_code, store_code);
CREATE INDEX article_store_grade_store_code_idx ON inventory_smart.article_store_grade USING btree (store_code, article);