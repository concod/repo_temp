--liquibase formatted sql
--changeset liquibase:promo_speed stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for promo_speed

CREATE TABLE price_promo.promo_speed (
	optimization_id varchar(100) DEFAULT NULL::character varying NULL,
	id serial4 NOT NULL,
	user_id int4 NULL,
	promo_id int4 NULL,
	scenario_id _float8 NULL,
	action_type varchar(100) DEFAULT NULL::character varying NULL,
	preprocessing_flag int4 DEFAULT 0 NULL,
	preprocessing_start_time timestamptz NULL,
	preprocessing_end_time timestamptz NULL,
	postprocessing_flag int4 DEFAULT 0 NULL,
	postprocessing_start_time timestamptz NULL,
	postprocessing_end_time timestamptz NULL,
	total_time int4 NULL,
	detailed json NULL,
	status bool DEFAULT false NULL,
	message varchar DEFAULT 'Not Finished'::character varying NULL,
	payload_input json NULL,
	payload_output json NULL
);