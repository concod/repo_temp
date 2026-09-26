--liquibase formatted sql
--changeset liquibase:delivery_date stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for delivery_date

-- DROP TABLE IF EXISTS inventory_smart.delivery_date;
CREATE TABLE inventory_smart.delivery_date (
	planning_group_name varchar NOT NULL,
	delivery_date date NULL,
	CONSTRAINT delivery_date_pk PRIMARY KEY (planning_group_name)
);