--liquibase formatted sql
--changeset bhargav.polavarapu@impactanalytics.co:kpi_categories_master_causal_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpi_categories_master_causal_create
CREATE TABLE monday_smart.kpi_categories_master_causal (
	kc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	CONSTRAINT dimentions_category_causal_pk PRIMARY KEY (kc_code)
);