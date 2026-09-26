--liquibase formatted sql
--changeset liquibase:dashboard_date_ticker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dashboard_date_ticker
CREATE TABLE inventory_smart.dashboard_date_ticker (
	refresh_date date NULL,
	transaction_date date NULL
);
