-- liquibase formatted sql
-- changeset pradeep.nayak@impactanalytics.co:tb_api_requests stripComments:false splitStatements:false context: db_sync labels:tb_api_requests
-- comment: initial changeset for API cache table

CREATE TABLE IF not exists app_cache.tb_api_requests (
	"key" varchar(500) NOT NULL,
	endpoint varchar(500) NOT NULL,
	"method" varchar(200) NULL,
	payload json NULL,
	"header" json NULL,
	identifier varchar(200) NULL,
	priority int8 NULL,
	status varchar(200) NULL,
	"time_stamp" timestamp DEFAULT CURRENT_TIMESTAMP NULL,
	CONSTRAINT tb_api_requests_pkey PRIMARY KEY (key, endpoint)
);