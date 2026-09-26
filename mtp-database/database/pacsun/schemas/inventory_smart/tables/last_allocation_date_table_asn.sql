-- liquibase formatted sql
-- changeset sreevathsa.sp@impactanalytics.co:last_allocation_date_table_asn stripComments:false splitStatements:false context: db_sync labels:last_allocation_date_table_asn
-- comment: initial changeset for last_allocation_date_table_asn

CREATE TABLE if not exists inventory_smart.last_allocation_date_table_asn (
	asn_id varchar not null,
	article varchar NOT NULL,
	last_allocation_date date NULL,
	CONSTRAINT last_allocation_date_table_asn_un UNIQUE (asn_id, article)
);