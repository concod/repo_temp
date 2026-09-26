--liquibase formatted sql
--changeset ananya.gupta@impactanalytics.co:inventory_smart.intermediate_constraint_upload stripComments:false splitStatements:false context:Release_2_0 labels:inventory_smart.intermediate_constraint_upload
--comment: create table statment for inventory_smart.intermediate_constraint_upload

CREATE TABLE inventory_smart.intermediate_constraint_upload (
	product_code text NULL,
	store_code text NULL,
	channel text NULL,
	week text NULL,
	min_stock text NULL,
	max_stock text NULL,
	wos text NULL,
	"delete" numeric NULL,
	child_id text NULL,
	file_id text NULL,
	updated_at timestamptz NULL,
	created_by text NULL
);