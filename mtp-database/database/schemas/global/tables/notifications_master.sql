--liquibase formatted sql
--changeset liquibase:notifications_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notifications_master
CREATE TABLE global.notifications_master (
    no_code serial4 NOT NULL,
    noe_code integer NOT NULL,
    special_classification varchar NOT NULL,
    subject text NOT NULL,
    description text NOT NULL,
    status integer DEFAULT 0 NOT NULL,
    channels _varchar DEFAULT '{}'::varchar[] NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by integer,
    updated_by integer,
    created_for integer NOT NULL,
    url text,
    CONSTRAINT special_classification_for_nm CHECK (((special_classification)::text = ANY (ARRAY[('informational'::varchar)::text, ('actionable'::varchar)::text])))
);
ALTER TABLE global.notifications_master
    ADD CONSTRAINT notification_pk PRIMARY KEY (no_code);
ALTER TABLE global.notifications_master
    ADD CONSTRAINT notification_master_created_for_fk FOREIGN KEY (created_for) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

--changeset arnab.nandy@impactanalytics.co:adding_column_event_id_in_test stripComments:false splitStatements:false context:Release_1_1 labels:MTP-23194
--comment: adding column event_id
ALTER TABLE global.notifications_master ADD column event_id TEXT;
--changeset ashish@impactanalytics.co:adding_column_event_id_again stripComments:false splitStatements:false context:Release_1_1 labels:MTP-23194
--comment: adding column event_id
ALTER TABLE "global".notifications_master DROP COLUMN event_id;
ALTER TABLE "global".notifications_master ADD event_id text NOT NULL DEFAULT uuid_generate_v4();
ALTER TABLE "global".notifications_master ADD CONSTRAINT notifications_master_un UNIQUE (created_for,event_id);

--changeset anoop.madamsetty@impactanalytics.co:adding_extra_attributes stripComments:false splitStatements:false context:Release_1_1 labels:MTP-41743
--comment: adding column extra_attributes
ALTER TABLE "global".notifications_master ADD extra_attributes jsonb NULL;

--changeset abhishek.jha@impactanalytics.co:adding_extra_columns_for_v3 stripComments:false splitStatements:false context:Release_1_1 labels:MTP-74252
--comment: adding columns screen_code, application_code, bucket_name, filter_tags
ALTER TABLE global.notifications_master ADD COLUMN screen_code INT DEFAULT NULL,
ADD CONSTRAINT fk_screen_code FOREIGN KEY (screen_code) 
REFERENCES global.screen_master (screen_code) ON DELETE SET NULL;

ALTER TABLE global.notifications_master ADD COLUMN application_code INT DEFAULT NULL,
ADD CONSTRAINT fk_application_code FOREIGN KEY (application_code) 
REFERENCES global.application_master (application_code) ON DELETE SET NULL;

ALTER TABLE global.notifications_master ADD COLUMN bucket_name Text DEFAULT 'New';

ALTER TABLE global.notifications_master ADD COLUMN filter_tags jsonb DEFAULT '[]'::jsonb;

ALTER TABLE global.notifications_master ALTER COLUMN application_code SET DEFAULT 1;

--changeset abhishek.jha@impactanalytics.co:adding_bookmarked_column stripComments:false splitStatements:false context:Release_1_2 labels:MTP-74252
--comment: adding column bookmarked
alter table global.notifications_master add column bookmarked boolean default false;

--changeset abhishek.jha@impactanalytics.co:modified_default_app_code_value stripComments:false splitStatements:false context:Release_1_3 labels:MTP-74252
--comment: modified_default_app_code_value
ALTER TABLE global.notifications_master ALTER COLUMN application_code SET DEFAULT 3;