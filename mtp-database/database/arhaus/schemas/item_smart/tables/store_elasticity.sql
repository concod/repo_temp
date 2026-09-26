--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:store_elasticity stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for store_elasticity



-- DROP TABLE item_smart.store_elasticity;

CREATE TABLE item_smart.store_elasticity (
	channel text NULL,
	hierarchy_code int4 NULL,
	store_elasticity float4 NULL
);