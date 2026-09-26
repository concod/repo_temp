--liquibase formatted sql
--changeset liquibase:last_allocation_date_table_vs_intl stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for last_allocation_date_table
CREATE TABLE IF NOT EXISTS inventory_smart.last_allocation_date_table (
    article VARCHAR NOT NULL,  
    last_allocation_date DATE NOT NULL,
	CONSTRAINT last_allocation_date_table_un UNIQUE (article)
);