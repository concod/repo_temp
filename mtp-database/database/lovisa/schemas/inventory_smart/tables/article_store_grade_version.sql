--liquibase formatted sql
--changeset swapnil.bhange:article_store_grade_version_v2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_store_grade_version_v2


CREATE TABLE IF NOT EXISTS inventory_smart.article_store_grade_version (
	version_code int4 NOT NULL,
	article varchar NOT NULL,
	store_code varchar NOT NULL,
	grade varchar NOT NULL,
	ph_code int4 NOT NULL,
	priority int4 NOT NULL DEFAULT 5,
	display_article varchar NULL,
	CONSTRAINT article_store_grade_un_1 UNIQUE (version_code, article, store_code, grade, ph_code)
)
PARTITION BY LIST (version_code);
CREATE INDEX IF NOT EXISTS article_store_grade_ph_code_idx_3 ON inventory_smart.article_store_grade_version USING btree (version_code, ph_code, store_code);
CREATE INDEX IF NOT EXISTS article_store_grade_store_code_idx_3 ON inventory_smart.article_store_grade_version USING btree (version_code, store_code, article);

--changeset swapnil.bhange:article_store_grade_version_v3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for article_store_grade_version_v3
ALTER TABLE inventory_smart.article_store_grade_version DROP CONSTRAINT IF EXISTS alerts_product_level_version_code_fk_1; 
ALTER TABLE inventory_smart.article_store_grade_version DROP CONSTRAINT IF EXISTS article_store_grade_hierarchy_fk_1; 
ALTER TABLE inventory_smart.article_store_grade_version DROP CONSTRAINT IF EXISTS article_store_grade_store_fk_1; 

ALTER TABLE inventory_smart.article_store_grade_version ADD CONSTRAINT alerts_product_level_version_code_fk_1 FOREIGN KEY (version_code) REFERENCES "global"."versioning"(version_code) ON DELETE CASCADE;
ALTER TABLE inventory_smart.article_store_grade_version ADD CONSTRAINT article_store_grade_hierarchy_fk_1 FOREIGN KEY (ph_code) REFERENCES "global".product_hierarchies_filter(hierarchy_code) ON DELETE RESTRICT;
ALTER TABLE inventory_smart.article_store_grade_version ADD CONSTRAINT article_store_grade_store_fk_1 FOREIGN KEY (store_code) REFERENCES "global".store_attributes_filter(store_code) ON DELETE CASCADE;