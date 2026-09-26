--liquibase formatted sql
--changeset liquibase:unique_review_screen_info stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for unique_review_screen_info
CREATE TABLE "global".unique_review_screen_info (
	user_code int4 NOT NULL,
	status varchar NULL,
	"data" jsonb NULL,
	unique_id varchar NOT NULL,
	usecase varchar NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL
);