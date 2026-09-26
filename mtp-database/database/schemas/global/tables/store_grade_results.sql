--liquibase formatted sql
--changeset liquibase:store_grade_results stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_grade_results
CREATE TABLE "global".store_grade_results (
	grade_id int4 NOT NULL,
	store_code varchar NOT NULL,
	grading varchar NULL,
	product_hierarchy_level varchar NULL
);
--ALTER TABLE "global".store_grade_results ADD CONSTRAINT store_grade_results_fk_grade_id FOREIGN KEY (grade_id) REFERENCES "global".store_grade_master(grade_id);
ALTER TABLE "global".store_grade_results ADD CONSTRAINT store_grade_results_fk_store_code FOREIGN KEY (store_code) REFERENCES "global".store_master(store_code);

--changeset kamalesh.k:store_grade_results stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: adding primary key to store_grade_results table

ALTER TABLE global.store_grade_results
Add column store_grade_results_code serial4,
ADD CONSTRAINT store_grade_results_pkey PRIMARY KEY (store_grade_results_code);
