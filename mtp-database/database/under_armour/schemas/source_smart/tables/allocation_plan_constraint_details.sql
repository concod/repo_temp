--liquibase formatted sql
--changeset mayank.mukundam@impactanalytics.co:allocation_plan_constraint_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for allocation_plan_constraint_details

CREATE TABLE source_smart.allocation_plan_constraint_details (
	allocation_id uuid NOT NULL,
	operation_id uuid NOT NULL,
	upper_bound numeric NULL,
	lower_bound numeric NULL,
	ideal_value numeric NULL,
	region varchar(255) NULL,
	partnership_type varchar(255) NULL,
	vendor_id int4 NULL,
	country_of_origin varchar(255) NULL,
	toggle_type varchar(255) NULL,
	constraint_id uuid NULL,
	constraint_type varchar(255) NULL,
	CONSTRAINT allocation_plan_constraint_details_unique UNIQUE (allocation_id, operation_id, region, partnership_type, vendor_id, country_of_origin),
	CONSTRAINT fk_allocation_plan FOREIGN KEY (allocation_id,operation_id) REFERENCES source_smart.allocation_plans(allocation_id,operation_id) ON DELETE CASCADE
);