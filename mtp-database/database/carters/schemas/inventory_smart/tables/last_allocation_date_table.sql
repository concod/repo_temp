-- liquibase formatted sql
-- changeset shameel.zeeeshan@impactanalytics.co:last_allocation_date_table_1 stripComments:false splitStatements:false context: db_sync labels:last_allocation_date_table
-- comment: initial changeset for last_allocation_date_table

CREATE TABLE inventory_smart.last_allocation_date_table (
	article varchar NOT NULL,
	last_allocation_date date NOT NULL,
	CONSTRAINT last_allocation_date_table_un UNIQUE (article)
);