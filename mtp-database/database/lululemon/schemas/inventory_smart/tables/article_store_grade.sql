--liquibase formatted sql
--changeset liquibase:article_store_grade stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_store_grade


CREATE TABLE IF NOT EXISTS inventory_smart.article_store_grade (
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	grade varchar NOT NULL,
	ph_code int4 NOT NULL,
	CONSTRAINT article_store_grade_un UNIQUE (article, store_code, grade, ph_code),
	CONSTRAINT article_store_grade_hierarchy_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT,
	CONSTRAINT article_store_grade_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
);
CREATE UNIQUE INDEX article_store_grade_ph_code_idx ON inventory_smart.article_store_grade USING btree (ph_code, store_code);
CREATE INDEX article_store_grade_store_code_idx ON inventory_smart.article_store_grade USING btree (store_code, article);

--changeset aniruddh.singh@impactanalytics.co:article_store_grade_add_priority stripComments:false splitStatements:false context:Release_1_0
--comment: Add priority column to article_store_grade
ALTER TABLE inventory_smart.article_store_grade
ADD COLUMN IF NOT EXISTS priority int4;
