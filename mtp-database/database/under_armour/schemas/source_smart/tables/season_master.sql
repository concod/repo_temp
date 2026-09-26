--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:season_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for season_master

CREATE TABLE source_smart.season_master (
	season_id varchar(255) NOT NULL,
	season_name varchar(255) NULL,
	start_date date NULL,
	end_date date NULL,
	CONSTRAINT sm_pk PRIMARY KEY (season_id)
);