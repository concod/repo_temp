--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co liquibase:filter_category stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: initial changeset for filter_category
CREATE TABLE source_smart.filter_category (
	criteria varchar(255) NULL,
	subcategories _text NULL
);