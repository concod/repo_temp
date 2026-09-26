--liquibase formatted sql
--changeset pundarikaksha.mishra@impactanalytics.co:wp_report_upload_track_id_seq stripComments:false splitStatements:false context:Release_1_1 labels:master_plan_attributes_id_seq
--comment: wp_report_upload_track_id_seq
CREATE SEQUENCE if not exists item_smart.wp_report_upload_track_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

--changeset pundarikaksha.mishra@impactanalytics.co:wp_report_upload_track stripComments:false splitStatements:false context:Release_1_2 labels:itemsmart_initial_commit
--comment: wp_report_upload_track

-- Create tracking table for report run times
CREATE TABLE IF NOT EXISTS item_smart.wp_report_upload_track (
    id SERIAL PRIMARY KEY,
    last_script_run_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

--changeset pundarikaksha.mishra@impactanalytics.co:wp_report_upload_track_add_file_name stripComments:false splitStatements:false context:Release_1_2 labels:itemsmart_initial_commit
--comment: wp_report_upload_track_add_file_name
ALTER TABLE item_smart.wp_report_upload_track ADD COLUMN file_name TEXT;