--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:tb_custom_alerts_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for tb_custom_alerts_master

CREATE TABLE price_markdown.tb_custom_alerts_master (
	alert_id serial4 NOT NULL,
	"name" text NOT NULL,
	description text NULL,
	severity price_markdown."custom_alerts_severity_level" NOT NULL,
	subscribers _int4 NULL,
	created_by int4 DEFAULT 0 NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_by int4 NULL,
	updated_at timestamptz NULL,
	is_deleted bool DEFAULT false NULL,
	status bool DEFAULT true NULL,
	CONSTRAINT tb_custom_alerts_master_pkey PRIMARY KEY (alert_id)
);