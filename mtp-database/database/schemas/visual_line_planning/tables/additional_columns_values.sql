--liquibase formatted sql
--changeset shannonnelson.d@impactanalytics.co:additional_columns_values stripComments:false splitStatements:false context:Release_1_0 labels:schema_alignment
--comment: initial changeset for additional_columns_values
CREATE TABLE visual_line_planning.additional_columns_values (
	lpp_id uuid NULL,
	additional_values jsonb NULL,
	CONSTRAINT additional_columns_values_unique UNIQUE (lpp_id)
);