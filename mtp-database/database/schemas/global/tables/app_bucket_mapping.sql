--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:app_bucket_mapping stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74252
--comment: initial changeset for app_bucket_mapping
CREATE TABLE IF NOT EXISTS global.app_bucket_mapping (
    application_code int NOT NULL,
    bucket_name TEXT NOT NULL,
    remove_bookmark BOOLEAN DEFAULT FALSE,
    threshold INT DEFAULT NULL,  -- Max number of notifications
    special_classification VARCHAR(50) CHECK (special_classification IN ('informational', 'actionable')) not NULL,
    PRIMARY KEY (application_code, bucket_name, special_classification),
    foreign key (application_code) references global.application_master (application_code) on delete cascade
);

ALTER TABLE global.app_bucket_mapping ADD COLUMN extra_attibutes jsonb default '{}'::jsonb;

alter table global.app_bucket_mapping drop column threshold;
ALTER TABLE global.app_bucket_mapping ADD COLUMN bucket_order INT DEFAULT NULL;


--changeset abhishek.jha:remove_col_remove_bookmark stripComments:false splitStatements:false context:Release_1_1 labels:MTP-74252
--comment: removing the remove_bookmark column
ALTER TABLE global.app_bucket_mapping DROP COLUMN remove_bookmark;