--liquibase formatted sql

--changeset osho.sharma@impactanalytics.co:create_new_store_change_log stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Creating table to track changes in new store attributes

-- Drop table if rollback is executed manually
-- DROP TABLE global.new_store_change_log;

CREATE TABLE "global".new_store_change_log (
    id UUID DEFAULT uuid_generate_v4(),
    store_code VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    ref_key VARCHAR(50) NOT NULL,
    edit_details JSONB NOT NULL,
    changed_by INT4 DEFAULT NULL,
    changed_at TIMESTAMPTZ NOT NULL,
    approved_at TIMESTAMPTZ DEFAULT NULL,
    approved_by INT4 DEFAULT NULL
);



CREATE INDEX IF NOT EXISTS idx_new_store_change_log_store_code ON global.new_store_change_log(store_code);
CREATE INDEX IF NOT EXISTS idx_new_store_change_log_data_type ON global.new_store_change_log(data_type);

--rollback DROP TABLE global.new_store_change_log;

ALTER TABLE global.new_store_change_log
ADD CONSTRAINT new_store_change_log_pkey PRIMARY KEY (id);

ALTER TABLE global.new_store_change_log
ADD CONSTRAINT new_store_change_log_changed_by_fk 
FOREIGN KEY (changed_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;

ALTER TABLE global.new_store_change_log
ADD CONSTRAINT new_store_change_log_approved_by_fk 
FOREIGN KEY (approved_by) REFERENCES global.user_master(user_code) ON DELETE SET NULL;