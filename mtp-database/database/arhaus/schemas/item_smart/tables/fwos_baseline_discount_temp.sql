--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:ItemFact stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for fwos_baseline_discount_temp table

CREATE TABLE item_smart.fwos_baseline_discount_temp (
	"DIVISION" varchar(50) NULL,
	"DEPARTMENT_DESCRIPTION" varchar(50) NULL,
	"CLASS DESCRIPTION" varchar(50) NULL,
	"AOH Flag Y/N" varchar(50) NULL,
	"FWOS Target" int4 NULL,
	"Base Discount%" varchar(50) NULL
);