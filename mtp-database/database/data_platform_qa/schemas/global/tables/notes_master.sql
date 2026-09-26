--liquibase formatted sql
--changeset liquibase:notes_master stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for notes_master
CREATE TABLE "global".notes_master (
	note_code serial4 NOT NULL,
	application_code int4 NOT NULL,
	screen_code int4 NOT NULL,
	search_context jsonb NOT NULL DEFAULT '{}'::jsonb,
	created_by int4 NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	is_deleted bool NOT NULL DEFAULT false,
	special_classification varchar NOT NULL DEFAULT 'comment'::character varying,
	parent_code int4 NULL,
	html_msg text NULL,
	updated_at timestamptz NOT NULL DEFAULT now(),
	updated_by int4 NULL,
	CONSTRAINT notes_pk PRIMARY KEY (note_code),
	CONSTRAINT notes_application_fk FOREIGN KEY (application_code) REFERENCES "global".application_master(application_code) ON DELETE CASCADE,
	CONSTRAINT notes_created_by_fk FOREIGN KEY (created_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL,
	CONSTRAINT notes_fk FOREIGN KEY (note_code) REFERENCES "global".notes_master(note_code) ON DELETE RESTRICT,
	CONSTRAINT notes_master_fk FOREIGN KEY (parent_code) REFERENCES "global".notes_master(note_code) ON DELETE CASCADE ON UPDATE CASCADE,
	CONSTRAINT notes_screen_fk FOREIGN KEY (screen_code) REFERENCES "global".screen_master(screen_code) ON DELETE CASCADE,
	CONSTRAINT product_groups_updated_by_fk FOREIGN KEY (updated_by) REFERENCES "global".user_master(user_code) ON DELETE SET NULL
);

--changeset shreyas.sankpal@impactanalytics.co:notes_master_users_mentioned stripComments:false splitStatements:false context:Release_1_0 labels:edit_comment_notification
--comment: added users_mentioned column to notes_master
ALTER TABLE "global".notes_master ADD users_mentioned int4[] NULL DEFAULT NULL;