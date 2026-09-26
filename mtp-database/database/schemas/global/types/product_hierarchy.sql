--liquibase formatted sql
--changeset liquibase:product_hierarchy stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for product_hierarchy
CREATE TYPE "global".product_hierarchy AS (
	l0_name varchar,
	l1_name varchar,
	l2_name varchar,
	l3_name varchar,
	l4_name varchar,
	"style" varchar,
	product_code varchar);
