--liquibase formatted sql
--changeset gauri.nair@impactanalytics.co:article_store_grade_version stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_starts
--comment: initial changeset for article_store_grade_version
CREATE TABLE if not exists inventory_smart.article_store_grade_version (
	version_code int4 NOT NULL,
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	grade varchar NOT NULL,
	ph_code int4 NOT NULL,
	CONSTRAINT article_store_grade_version_pk PRIMARY KEY (article, store_code, grade, ph_code, version_code),
	CONSTRAINT article_store_grade_version_fk FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE,
	CONSTRAINT article_store_grade_version_hierarchy_fk FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT,
	CONSTRAINT article_store_grade_version_store_fk FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code) ON DELETE CASCADE
)
PARTITION BY LIST (version_code);
CREATE UNIQUE INDEX article_store_grade_version_ph_code_idx ON inventory_smart.article_store_grade_version USING btree (ph_code, store_code, version_code);
CREATE INDEX article_store_grade_version_store_code_idx ON inventory_smart.article_store_grade_version USING btree (store_code, article, version_code);