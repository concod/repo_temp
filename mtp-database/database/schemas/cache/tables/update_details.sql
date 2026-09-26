--liquibase formatted sql
--changeset liquibase:update_details stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for update_details
CREATE TABLE "cache".update_details (
	update_code int4 NOT NULL,
	update_seq int4 NOT NULL,
	col varchar NOT NULL,
	val text NULL,
	CONSTRAINT update_details_un UNIQUE (update_code, update_seq, col),
	CONSTRAINT update_details_fk FOREIGN KEY (update_code) REFERENCES "cache".update_tracker(update_code) ON DELETE RESTRICT ON UPDATE RESTRICT
);


--changeset ashish@impactanalytics.co:update_details_gbq_compatiable stripComments:false splitStatements:false context:Release_2 labels:Cold_Updates
--comment: Cold Updates Ada Visual Changes
ALTER TABLE IF EXISTS cache.update_details DROP COLUMN IF EXISTS update_seq;
ALTER TABLE IF EXISTS cache.update_details ALTER COLUMN val SET NOT NULL;
ALTER TABLE IF EXISTS cache.update_details ADD CONSTRAINT update_details_un UNIQUE (update_code, col);
