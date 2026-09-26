--liquibase formatted sql
--changeset liquibase:notes_event_metadata stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notes_event_metadata
CREATE TABLE "global".notes_event_metadata (
	event_id serial primary key,
	event_name varchar(255),
	is_resolved boolean,
	created_by int,
	is_deleted boolean,
	created_at TIMESTAMPTZ,
	updated_at TIMESTAMPTZ
);

alter table "global".notes_event_metadata add column is_pinned boolean default false;
alter table "global".notes_event_metadata add column request_url text NULL;
alter table "global".notes_event_metadata add column request_method text NULL;
alter table "global".notes_event_metadata add column request_headers jsonb DEFAULT '{}'::jsonb NULL;
alter table "global".notes_event_metadata add column request_payload jsonb NULL;
alter table "global".notes_event_metadata add column redirect_url text NULL;


--changeset abhishek.jha@impactanalytics.co:notes_event_metadata stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added column user_clear_times
alter table "global".notes_event_metadata add column user_clear_times jsonb default '{}';
