--liquibase formatted sql
--changeset liquibase:process_execution_tracker stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for process_execution_tracker

CREATE TABLE price_promo_opt.process_execution_tracker (
	id serial4 NOT NULL,
	process_name varchar(50) NULL,
	flag_description varchar(255) NULL,
	frequency text NOT NULL,
	start_flag int4 NULL,
	end_flag int4 NULL,
	updated_date date NULL,
	CONSTRAINT process_execution_tracker_frequency_check CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text])))
);

--changeset harshith.mandli@impactanalytics.co:process_execution_tracker_v2 stripComments:false splitStatements:false context:Release_1_0 labels:mtp-38202
--comment: addded new column under_processing
ALTER TABLE price_promo_opt.process_execution_tracker ADD COLUMN under_processing int4 NULL;