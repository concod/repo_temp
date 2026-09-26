--liquibase formatted sql
--changeset swapnil.bhange:article_level_default_constraints stripComments:false splitStatements:false context:Release_1_0 labels:0001
--comment: initial changeset for article_level_default_constraints
CREATE TABLE inventory_smart.article_level_default_constraints (
	article varchar NULL,
	psa_name varchar NULL,
	min int4 NULL,
	max int4 NULL,
	wos float4 NULL,
	st float4 NULL
);
