
--liquibase formatted sql
--changeset genuine.basil@impactanalytics.co:ua.allocation_constraint_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for ua.allocation_constraint_details
CREATE TABLE source_smart.allocation_constraint_details (
	constraint_id uuid NOT NULL,
	constraint_type varchar(255) NULL,
	upper_bound numeric NULL,
	lower_bound numeric NULL,
	ideal_value numeric NULL,
	region varchar(255) NULL,
	partnership_type varchar(255) NULL,
	vendor_id int4 NULL,
	country_of_origin varchar(255) NULL,
	toggle_type varchar(255) NULL,
	CONSTRAINT fk_allocation_constraint_details_constraint_id FOREIGN KEY (constraint_id) REFERENCES source_smart.allocation_constraints(constraint_id) ON DELETE CASCADE
);
CREATE INDEX idx_allocation_constraint_details_constraint_id ON source_smart.allocation_constraint_details USING btree (constraint_id);