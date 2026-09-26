--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:threads stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for threads

CREATE TABLE cortexeye_lite.threads (
	id text NOT NULL,
	user_id int4 NOT NULL,
	company_name text NULL,
	thread_title text DEFAULT 'New Chat'::text NOT NULL,
	is_bookmarked bool DEFAULT false NOT NULL,
	is_deleted bool DEFAULT false NOT NULL,
	modes _text DEFAULT '{}'::text[] NOT NULL,
	chat_summary text NULL,
	shared_users_list _int4 DEFAULT '{}'::integer[] NOT NULL,
	attachments jsonb DEFAULT '{}'::jsonb NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT threads_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_threads_bookmarked ON cortexeye_lite.threads USING btree (user_id, is_bookmarked, updated_at DESC, id DESC) WHERE (is_deleted = false);
CREATE INDEX idx_threads_company ON cortexeye_lite.threads USING btree (company_name, user_id, updated_at DESC, id DESC) WHERE ((is_deleted = false) AND (company_name IS NOT NULL));
CREATE INDEX idx_threads_modes ON cortexeye_lite.threads USING gin (modes) WHERE (is_deleted = false);
CREATE INDEX idx_threads_shared ON cortexeye_lite.threads USING gin (shared_users_list) WHERE (is_deleted = false);
CREATE INDEX idx_threads_user_listing ON cortexeye_lite.threads USING btree (user_id, is_deleted, updated_at DESC, id DESC);