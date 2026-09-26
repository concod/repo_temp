--liquibase formatted sql
--changeset liquibase:tb_notifications_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_notifications  - added serial 4
CREATE TABLE price_markdown.tb_notifications (
	notification_id serial4 NOT NULL,
	"module" varchar(100) NOT NULL,
	message varchar(250) NOT NULL,
	expiry int8 NULL DEFAULT 4320,
	"action" varchar(100) NULL,
	navigate_to varchar(400) NULL,
	read_at timestamp NULL,
	created_at timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
	user_id int4 NULL,
	status bool NULL DEFAULT true,
	identifier varchar NULL,
	header_text varchar(255) NULL DEFAULT NULL::character varying,
	CONSTRAINT markdown_tb_notification_pk_notification_id PRIMARY KEY (notification_id)
);