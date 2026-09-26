--liquibase formatted sql
--changeset liquibase:store_grade_nomenclature stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for store_grade_nomenclature
CREATE TABLE "global".store_grade_nomenclature (
	nomenclature_id serial4 NOT NULL,
	nomenclature_name varchar NULL,
	labels json NULL,
	CONSTRAINT store_grade_nomenclature_pk PRIMARY KEY (nomenclature_id)
);