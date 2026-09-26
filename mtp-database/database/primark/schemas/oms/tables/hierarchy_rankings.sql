--liquibase formatted sql
--changeset bhavya.visaria@impactanalytics.co:hierarchy_rankings stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial version of hierarchy_rankings


CREATE TABLE IF NOT EXISTS oms.hierarchy_rankings (
	hier_level varchar NOT NULL,
	ranking int2 NOT NULL
);