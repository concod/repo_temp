--liquibase formatted sql
--changeset pranavkumar.singh@impactanalytics.co:query_stats_daily stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for query_stats_daily

CREATE TABLE cortexeye_lite.query_stats_daily (
	user_id int4 NOT NULL,
	stat_date date NOT NULL,
	query_count int4 DEFAULT 0 NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT query_stats_daily_pkey PRIMARY KEY (user_id, stat_date)
);
CREATE INDEX idx_query_stats_daily_stat_date ON cortexeye_lite.query_stats_daily USING btree (stat_date);