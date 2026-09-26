--liquibase formatted sql
--changeset kailash.yadav@impactanalytics.co:mtp_audit_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for mtp_audit_log
CREATE TABLE global.mtp_audit_log (
    log_id SERIAL ,
    source_table VARCHAR(255) NOT NULL,
    operation CHAR(1) NOT NULL,  -- 'I' for INSERT, 'U' for UPDATE, 'D' for DELETE
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    user_id VARCHAR NOT NULL,
    old_data JSONB,  -- Store the old row data for UPDATE and DELETE operations
    new_data JSONB,  -- Store the new row data for INSERT and UPDATE operations
    CONSTRAINT mtp_audit_log_uk UNIQUE (created_at,log_id,source_table)
)
PARTITION BY RANGE (created_at);


--changeset kailash.yadav@impactanalytics.co:mtp_audit_log_alter stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for mtp_audit_log alter column created_at

ALTER TABLE "global".mtp_audit_log ALTER COLUMN created_at SET DEFAULT current_timestamp;

--changeset kailash.yadav@impactanalytics.co:mtp_audit_log_index stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for mtp_audit_log index

create index if not exists  mtp_audit_log_indx1 on global.mtp_audit_log(source_table) ;