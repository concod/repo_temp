--liquibase formatted sql
--changeset liquibase:depth_multiplier stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for depth_multiplier
CREATE TABLE assort_smart.depth_multiplier (
	levels json NULL,
	attribute_value json NULL
);