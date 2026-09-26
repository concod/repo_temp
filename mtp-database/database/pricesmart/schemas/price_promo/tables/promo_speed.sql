--liquibase formatted sql
--changeset liquibase:promo_speed_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_speed - added serial 4
CREATE TABLE price_promo.promo_speed (
	optimization_id varchar(100) NULL DEFAULT NULL::character varying,
	id serial4 NOT NULL,
	user_id int4 NULL,
	promo_id int4 NULL,
	scenario_id _float8 NULL,
	action_type varchar(100) NULL DEFAULT NULL::character varying,
	preprocessing_flag int4 NULL DEFAULT 0,
	preprocessing_start_time timestamptz NULL,
	preprocessing_end_time timestamptz NULL,
	postprocessing_flag int4 NULL DEFAULT 0,
	postprocessing_start_time timestamptz NULL,
	postprocessing_end_time timestamptz NULL,
	total_time int4 NULL,
	detailed json NULL,
	status bool NULL DEFAULT false,
	message varchar NULL DEFAULT 'Not Finished'::character varying,
	payload_input json NULL,
	payload_output json NULL
);