--liquibase formatted sql
--changeset abhishek.jha@impactanalytics.co:user_notification_settings stripComments:false splitStatements:false context:Release_1_0 labels:MTP-74252
--comment: initial changeset for user_notification_settings
CREATE TABLE IF NOT EXISTS global.user_notification_settings (
    user_code int PRIMARY KEY,
    settings JSONB default '{"active_minutes":5}',
    FOREIGN KEY (user_code) REFERENCES global.user_master(user_code) ON DELETE cascade
);
