--liquibase formatted sql
--changeset liquibase:tb_notifications_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_notifications with if not exists
CREATE TABLE "global".tb_notifications (
	notification_id serial4 NOT NULL,
	"module" varchar(100) NOT NULL,
	application varchar(100) NOT NULL,
	message text NOT NULL,
	"action" varchar(100) NULL,
	read_at timestamp NULL,
	created_at timestamp DEFAULT (now() AT TIME ZONE 'utc'::text) NULL,
	user_id int4 NULL,
	status bool DEFAULT true NULL,
	identifier varchar NULL,
	header_text text DEFAULT NULL::character varying NULL,
	expiry int4 DEFAULT 4320 NULL,
	navigate_to varchar(400) DEFAULT '-1'::character varying NULL,
	promo_ids _int4 NULL,
	CONSTRAINT tb_notifications_pk PRIMARY KEY (notification_id)
);
