--liquibase formatted sql
--changeset sidhartha.c@impactanalytics.co:uom stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for priority_code_description
CREATE TABLE inventory_smart.priority_code_description (
	priority_code varchar NULL,
    description varchar NULL
);