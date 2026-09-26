--liquibase formatted sql
--changeset sivaprasath.vadivel@impactanalytics.co:comparable_calendar stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for comparable_calendar

CREATE TABLE monday_smart.comparable_calendar (
	id serial4 NOT NULL,
	week_id int4 NOT NULL,
	event_name varchar NOT NULL,
	event_additional_info varchar NOT NULL,
	ly_comparable int4 NULL,
	lly_comparable int4 NULL,
	CONSTRAINT comparable_calendar_pk PRIMARY KEY (id)
);