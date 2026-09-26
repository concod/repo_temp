
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:sp_insert_notification_events_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: sp_insert_notification_events_v1


DROP PROCEDURE IF EXISTS base_pricing.sp_insert_notification_events();


CREATE OR REPLACE PROCEDURE base_pricing.sp_insert_notification_events()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
BEGIN
    -- Insert notification events directly
    INSERT INTO "global".notification_system_event_master 
        (noe_code, special_classification, subject, description, is_deleted, 
         created_at, updated_at, url, notification_channel, tags_code) 
    VALUES
        (1, 'informational', '{subject}', '{description}', false, 
         '2025-01-23 14:26:17.488', '2025-01-23 14:26:17.488', '{url}', '{"in app"}', '{1,14}'),
        
        (2, 'actionable', 'Upload Template is now ready for {screen_name}', 'Click to download', false, 
         '2023-03-23 14:25:26.459', '2023-03-23 14:25:26.459', '{download_url}', '{"in app"}', '{}'),
        
        (3, 'informational', '{username} mentioned you in {screen_name}.', '{description}.. Click to be redirected', false, 
         '2022-07-15 10:18:33.851', '2022-07-15 10:18:33.851', '{url}', '{"in app"}', '{1,14}'),
        
        (4, 'actionable', 'Download Successful for {screen_name}', 'Click to download', false, 
         '2023-03-23 14:25:26.459', '2023-03-23 14:25:26.459', '{download_url}', '{"in app"}', '{}'),
        
        (5, 'actionable', '{subject}', '{description}', false, 
         '2025-01-23 14:26:17.488', '2025-01-23 14:26:17.488', '{url}', '{"in app"}', '{1,14}'),
        
        (6, 'actionable', '{subject}', 'Click to download', false, 
         '2025-03-18 13:02:28.993', '2025-03-18 13:02:28.993', '{download_url}', '{"in app"}', NULL)
    ON CONFLICT (noe_code) DO NOTHING;
END;
$procedure$;