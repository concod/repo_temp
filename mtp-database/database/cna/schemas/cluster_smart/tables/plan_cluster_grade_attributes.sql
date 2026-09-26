--liquibase formatted sql
--changeset chaitanyaprasad.reddy@impactanalytics.co:cna_plan_cluster_grade_attributes_bootstrap stripComments:false splitStatements:false context:cna labels:cluster_smart_cna_bootstrap
--comment: CNA bootstrap: table + plan FK if missing; drop legacy store_fk; base indexes match core (IF NOT EXISTS on those two avoids duplicate-name errors when core already ran).
CREATE TABLE IF NOT EXISTS cluster_smart.plan_cluster_grade_attributes (
	cluster_plan_code int4 NOT NULL,
	store_code varchar NOT NULL,
	special_classification varchar NOT NULL,
	attribute_name varchar NOT NULL,
	attribute_value varchar NOT NULL,
	CONSTRAINT plan_cluster_grade_attributes_plan_fk FOREIGN KEY (cluster_plan_code) REFERENCES cluster_smart.cluster_plan_master(cluster_plan_code) ON DELETE CASCADE
);
ALTER TABLE cluster_smart.plan_cluster_grade_attributes DROP CONSTRAINT IF EXISTS plan_cluster_grade_attributes_store_fk;
CREATE INDEX IF NOT EXISTS index_cluster_plan_code ON cluster_smart.plan_cluster_grade_attributes USING btree (cluster_plan_code);
CREATE INDEX IF NOT EXISTS index_special_classification ON cluster_smart.plan_cluster_grade_attributes USING btree (special_classification);

--changeset chaitanyaprasad.reddy@impactanalytics.co:cna_plan_cluster_grade_attributes_idx_1 stripComments:false splitStatements:false context:cna labels:cluster_smart_cna_indexes
--comment: CNA-specific indexes (after bootstrap changeset).
CREATE INDEX idx_pcga_full ON cluster_smart.plan_cluster_grade_attributes (cluster_plan_code, special_classification, attribute_name, store_code) INCLUDE (attribute_value);
CREATE INDEX idx_pcga_store_first ON cluster_smart.plan_cluster_grade_attributes (store_code, cluster_plan_code, special_classification, attribute_name);
