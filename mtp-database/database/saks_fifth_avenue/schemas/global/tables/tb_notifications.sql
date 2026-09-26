--liquibase formatted sql
--changeset liquibase:tb_notifications_1 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_notifications with if not exists
CREATE TABLE "global".tb_notifications (
	notification_id serial4 NOT NULL,
	"module" varchar(100) NOT NULL,
	application varchar(100) NOT NULL,
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
	CONSTRAINT tb_notifications_unique UNIQUE (notification_id)
);


--changeset durgaprasad.tulugu@impactanalytics.co:tb_notifications_2 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment:changed expiry type and added navigate_to default value, default set to false.
ALTER TABLE "global".tb_notifications DROP COLUMN IF EXISTS expiry, DROP COLUMN IF EXISTS navigate_to;
ALTER TABLE "global".tb_notifications ADD COLUMN expiry int4 DEFAULT 4320 NULL, ADD COLUMN navigate_to varchar(400) DEFAULT '-1'::varchar NULL;
--changeset vamsi.balaga@impactanalytics.co:tb_notifications_23081118 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changed varchar(255) type to text
ALTER TABLE "global".tb_notifications ALTER COLUMN message TYPE text USING message::text;
ALTER TABLE "global".tb_notifications ALTER COLUMN header_text TYPE text USING header_text::text;
--changeset hareeshwar.c@impactanalytics.co:tb_notifications_3 stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added promo_ids column type array of int
ALTER TABLE "global".tb_notifications
ADD COLUMN promo_ids INT[];
