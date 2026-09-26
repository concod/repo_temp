--liquibase formatted sql
--changeset sivaprasath.vadivel:comparable_calendar_dl_create stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for comparable_calendar_dl

CREATE TABLE monday_smart.comparable_calendar_dl (
	week_id int4 NULL,
	date_id date NOT NULL,
	geo varchar NOT NULL,
	event_name varchar NULL,
	event_additional_info varchar NULL,
	ly_comparable int4 NULL,
	lly_comparable int4 NULL,
	ly_comparable_dt date NULL,
	lly_comparable_dt date NULL,
	number_of_days int4 NULL,
	CONSTRAINT comparable_calendar_dl_pk PRIMARY KEY (geo, date_id)
);