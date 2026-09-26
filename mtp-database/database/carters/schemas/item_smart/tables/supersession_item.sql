--liquibase formatted sql
--changeset sonika.baheti@impactanalytics.co:op_master_1 stripComments:false splitStatements:false context:Release_1_0 labels:itemsmart_initial_commit
--comment: initial changeset for op_master

CREATE TABLE IF NOT EXISTS item_smart.supersession_item (
	old_style text NULL,
	new_style text NULL,
	hierarchy_code int8 NULL,
	new_hierarchy_code int8 NULL
);