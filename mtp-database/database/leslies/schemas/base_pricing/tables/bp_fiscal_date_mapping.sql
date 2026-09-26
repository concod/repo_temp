--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:bp_fiscal_date_mapping_10 stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.bp_fiscal_date_mapping_10

CREATE TABLE base_pricing.bp_fiscal_date_mapping (
	"date" date NULL,
	week_start_date date NULL
);