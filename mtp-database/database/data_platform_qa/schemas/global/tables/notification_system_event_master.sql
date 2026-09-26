--liquibase formatted sql
--changeset liquibase:notification_system_event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_system_event_master
CREATE TABLE "global".notification_system_event_master (
	noe_code serial4 NOT NULL,
	special_classification varchar NOT NULL,
	subject text NOT NULL,
	description text NOT NULL,
	is_deleted bool NOT NULL DEFAULT false,
	created_at timestamptz NULL DEFAULT now(),
	updated_at timestamptz NULL DEFAULT now(),
	url text NULL,
	notification_channel _varchar NULL,
	tags_code _int4 NULL,
	CONSTRAINT notification_system_event_master_pk PRIMARY KEY (noe_code),
	CONSTRAINT special_classification_for_nem CHECK ((((special_classification)::text = ANY (ARRAY[('informational'::character varying)::text, ('actionable'::character varying)::text]))))
);
