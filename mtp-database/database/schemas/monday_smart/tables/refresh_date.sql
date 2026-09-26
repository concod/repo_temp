--liquibase formatted sql
--changeset sivaprasath.vadivel:refresh_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for refresh_date

CREATE TABLE monday_smart.refresh_date (
	last_refresh_date date NOT NULL,
	last_refresh_week int4 NULL,
	CONSTRAINT refresh_date_pk PRIMARY KEY (last_refresh_date)
);