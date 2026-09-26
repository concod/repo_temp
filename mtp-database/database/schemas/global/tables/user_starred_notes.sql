--liquibase formatted sql
--changeset liquibase:user_starred_notes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for user_starred_notes
create table "global".user_starred_notes(
	note_code int,
	created_by int,
	starred boolean
);
ALTER TABLE "global".user_starred_notes ADD CONSTRAINT unique_note_user UNIQUE (note_code, created_by);

--changeset kamalesh.k@impactanalytics.co:user_starred_notes stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: primary key for user_starred_notes

ALTER TABLE "global".user_starred_notes
DROP CONSTRAINT IF EXISTS unique_note_user;

ALTER TABLE "global".user_starred_notes 
  ALTER COLUMN note_code SET NOT NULL,
  ALTER COLUMN created_by SET NOT NULL;

ALTER TABLE "global".user_starred_notes
ADD CONSTRAINT user_starred_notes_pkey PRIMARY KEY (note_code, created_by);

