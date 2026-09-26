--liquibase formatted sql
--changeset liquibase:notification_event_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notification_event_master
CREATE TABLE global.notification_event_master (
    noe_code serial4 NOT NULL,
    special_classification varchar NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    channels _varchar DEFAULT '{}'::varchar[] NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by integer,
    updated_by integer,
    departments _varchar DEFAULT '{}'::varchar[] NOT NULL,
    url text,
    notification_channel _varchar,
    tags_code _int4,
    CONSTRAINT special_classification_for_nem CHECK (((special_classification)::text = ANY (ARRAY[('informational'::varchar)::text, ('actionable'::varchar)::text])))
);
ALTER TABLE global.notification_event_master
    ADD CONSTRAINT notification_event_master_pk PRIMARY KEY (noe_code);
ALTER TABLE global.notification_event_master
    ADD CONSTRAINT notification_event_master_created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
ALTER TABLE global.notification_event_master
    ADD CONSTRAINT notification_event_master_updated_by_fk FOREIGN KEY (updated_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;
