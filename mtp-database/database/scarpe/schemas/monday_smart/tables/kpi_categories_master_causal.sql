--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:dimension_attributes_internal stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dimension_attribute_mapping


CREATE TABLE monday_smart.kpi_categories_master_causal (
	kc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	CONSTRAINT dimentions_category_causal_pk PRIMARY KEY (kc_code)
);