--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:dashboards stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for dashboards

CREATE TABLE cortexeye_lite.dashboards (
	id bigserial NOT NULL,
	filter_id int8 NOT NULL,
	user_id int4 NULL,
	title varchar(50) NOT NULL,
	is_preconfigured bool DEFAULT false NULL,
	is_deleted bool DEFAULT false NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	is_bookmarked bool DEFAULT false NOT NULL,
	is_default bool DEFAULT false NOT NULL,
	CONSTRAINT dashboards_pkey PRIMARY KEY (id)
);

ALTER TABLE cortexeye_lite.dashboards ADD CONSTRAINT dashboards_filter_id_fkey FOREIGN KEY (filter_id) REFERENCES cortexeye_lite.dashboard_filters(id) ON DELETE CASCADE;