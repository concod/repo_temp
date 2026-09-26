-- liquibase formatted sql
-- changeset shameel.zeshan@impactanalytics.co:backsync_latest_dates stripComments:false splitStatements:false context: db_sync labels:backsync_latest_dates
-- comment: initial changeset for backsync_latest_dates
CREATE TABLE inventory_smart.backsync_latest_dates (
	gurobi_date date NULL,
	analytics_report_date date NULL
);