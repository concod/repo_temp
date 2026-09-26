--liquibase formatted sql
--changeset disha.a:v1 runOnChange:true stripComments:false splitStatements:false context:MTP-111933 labels:MTP-111933
--comment: MTP-111933
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.delete_reviewed_articles();

CREATE OR REPLACE FUNCTION inventory_smart.delete_reviewed_articles()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_alert RECORD;
    v_deleted_count INTEGER;
    v_current_time TIMESTAMP;
    v_buffer_interval INTERVAL := '30 minutes'::INTERVAL;
    v_current_date DATE;
    v_last_refresh_date DATE;
    v_days_since_last_refresh INTEGER;
    v_tenant_timezone TEXT;
BEGIN
    -- Get tenant timezone
    v_tenant_timezone := inventory_smart.get_tenant_timezone();
    
    -- Set current time based on tenant timezone, but keep date logic intact
    v_current_time := CURRENT_TIMESTAMP AT TIME ZONE v_tenant_timezone;
    v_current_date := CURRENT_DATE;

    -- Process each alert type based on its configuration
    FOR v_alert IN 
        SELECT 
            arc.alert_key,
            arc.refresh_frequency_hours,
            arc.last_refresh_time
        FROM inventory_smart.alert_refresh_configuration arc
    LOOP
        -- Set last_refresh_date to NULL if last_refresh_time is NULL
        v_last_refresh_date := CASE WHEN v_alert.last_refresh_time IS NULL THEN NULL 
                                   ELSE (v_alert.last_refresh_time)::DATE 
                              END;
        
        -- Calculate days since last refresh
        v_days_since_last_refresh := CASE WHEN v_last_refresh_date IS NULL THEN NULL 
                                         ELSE v_current_date - v_last_refresh_date 
                                    END;

        IF v_alert.last_refresh_time IS NULL OR
           v_alert.last_refresh_time + (v_alert.refresh_frequency_hours || ' hours')::INTERVAL <= v_current_time OR
           --Only allow buffer if we're close to the next scheduled refresh
           (v_alert.last_refresh_time + (v_alert.refresh_frequency_hours || ' hours')::INTERVAL - v_current_time <= v_buffer_interval AND 
            v_alert.last_refresh_time + (v_alert.refresh_frequency_hours || ' hours')::INTERVAL - v_current_time > '0 minutes'::INTERVAL) OR
           -- Case for date-based refreshes
           (
             -- For daily (24 hours): refresh if date has changed
             (v_alert.refresh_frequency_hours = 24 AND 
              v_days_since_last_refresh > 0) OR
             -- For alternate days (48 hours): refresh if at least 2 days have passed
             (v_alert.refresh_frequency_hours = 48 AND 
              v_days_since_last_refresh >= 2)
           ) THEN
            
            -- Delete records for this alert type
            DELETE FROM inventory_smart.alerts_reviewed_articles ara
            WHERE ara.alert_key = v_alert.alert_key;

            -- Update last refresh time
            UPDATE inventory_smart.alert_refresh_configuration
            SET last_refresh_time = v_current_time
            WHERE alert_key = v_alert.alert_key;
        END IF;
    END LOOP;
END;
$function$
;
