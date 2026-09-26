--liquibase formatted sql
--changeset kakumanu.abhishek@impactanalytics.co:article_store_grade stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start_2
--comment: changed create statement for article_store_grade
CREATE TABLE IF NOT EXISTS inventory_smart.article_store_grade (
    article varchar NOT NULL,
    store_code varchar NOT NULL,
    grade varchar NOT NULL,
    ph_code int4 NOT NULL,
    CONSTRAINT article_store_grade_un UNIQUE (article, store_code, grade, ph_code)
);
CREATE UNIQUE INDEX article_store_grade_ph_code_idx ON inventory_smart.article_store_grade USING btree (ph_code, store_code);
CREATE INDEX article_store_grade_store_code_idx ON inventory_smart.article_store_grade USING btree (store_code, article);
ALTER TABLE inventory_smart.article_store_grade ADD CONSTRAINT article_store_grade_hierarchy_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT;
ALTER TABLE inventory_smart.article_store_grade ADD CONSTRAINT article_store_grade_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE;
--liquibase formatted sql
--changeset kakumanu.abhishek@impactanalytics.co:article_store_grade_4 stripComments:false splitStatements:false context:Release_1_0 labels:SAP-166
--comment: ADDED COLUMN store_channel in article_store_grade
ALTER TABLE inventory_smart.article_store_grade ADD COLUMN store_channel varchar NULL;