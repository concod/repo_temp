--liquibase formatted sql
--changeset liquibase:kpi_categories_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for kpi_categories_master
CREATE TABLE monday_smart.kpi_categories_master (
	kc_code serial4 NOT NULL,
	"name" varchar NOT NULL,
	CONSTRAINT dimentions_category_pk PRIMARY KEY (kc_code)
);
