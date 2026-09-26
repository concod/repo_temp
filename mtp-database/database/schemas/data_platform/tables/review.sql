--liquibase formatted sql
--changeset himani.sharma@impactanalytics.co:review stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for review
CREATE TABLE data_platform.review (
	review_code serial4 NOT NULL,
	module_code int4 NOT NULL,
	pull_request_id int4 NOT NULL,
	branch varchar NOT NULL,
	status varchar NOT NULL,
	"key" varchar NOT NULL,
	reviewers _int4 NULL,
	created_by int4 NULL,
	reviewed_by _int4 NULL,
	merged_by int4 NULL,
    declined_by int4 NULL,
	CONSTRAINT review_pk PRIMARY KEY (status, review_code)
)
PARTITION BY LIST (status);
CREATE TABLE data_platform.review_to_be_approved PARTITION OF data_platform.review
  FOR VALUES IN ('TO BE APPROVED');
CREATE TABLE data_platform.unapproved_pr_review PARTITION OF data_platform.review
  FOR VALUES IN ('UNAPPROVED');
CREATE TABLE data_platform.approved_pr_review PARTITION OF data_platform.review
    FOR VALUES IN ('APPROVED');
CREATE TABLE data_platform.merged_pr_review PARTITION OF data_platform.review
    FOR VALUES IN ('MERGED');
CREATE TABLE data_platform.declined_pr_review PARTITION OF data_platform.review
    FOR VALUES IN ('DECLINED');
ALTER TABLE data_platform.review ADD CONSTRAINT created_by_fk FOREIGN KEY (created_by) REFERENCES global.user_master (user_code); 
ALTER TABLE data_platform.review ADD CONSTRAINT merged_by_fk FOREIGN KEY (merged_by) REFERENCES global.user_master (user_code);
ALTER TABLE data_platform.review ADD CONSTRAINT declined_by_fk FOREIGN KEY (merged_by) REFERENCES global.user_master (user_code);
--changeset himani.sharma@impactanalytics.co:review_2 stripComments:false splitStatements:false context:Release_1_1 labels:table_modification
--comment: table_modification
ALTER TABLE data_platform.review  RENAME COLUMN "key" TO "file_name";
ALTER TABLE data_platform.review  ADD COLUMN IF NOT EXISTS created_at timestamptz;
ALTER TABLE  data_platform.review  ADD COLUMN IF NOT EXISTS pr_title varchar NULL;
ALTER TABLE data_platform.review  drop column IF EXISTS module_code;
ALTER TABLE  data_platform.review  ADD COLUMN IF NOT EXISTS module varchar NULL;
--changeset himani.sharma@impactanalytics.co:review_3 stripComments:false splitStatements:false context:Release_1_2 labels:table_modification_2
--comment: adding updated_at
ALTER TABLE  data_platform.review  ADD COLUMN IF NOT EXISTS updated_at timestamptz NULL;