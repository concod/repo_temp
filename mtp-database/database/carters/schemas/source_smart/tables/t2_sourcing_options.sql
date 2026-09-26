--liquibase formatted sql
--changeset liquibase:t2_sourcing_options stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for t2_sourcing_options
CREATE TABLE source_smart.t2_sourcing_options (
	sourcing_option_id varchar(20) NOT NULL,
	style_color_id varchar(50) NOT NULL,
	facility_id varchar(20) NOT NULL,
	tier2_facility_id varchar(20) NOT NULL,
	t2_source varchar(50) NULL,
	lead_time_days int4 NULL,
	cost_per_unit numeric(10, 2) NULL,
	CONSTRAINT t2_sourcing_options_pkey PRIMARY KEY (sourcing_option_id)
);
