--liquibase formatted sql
--changeset swapnil.bhange:default_constraints_v1 stripComments:false splitStatements:false context:Release_1_0 labels:0001
--comment: initial changeset for default_constraints_v1
CREATE TABLE inventory_smart.default_constraints (
	psa_name varchar NULL,
	min float4 NULL,
	max float4 NULL,
	st float4 NULL,
	wos float4 NULL
);


