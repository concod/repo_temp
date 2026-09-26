--liquibase formatted sql
--changeset aman.pareek:pack_config_valid_fiscal_weeks_5 runOnChange:true stripComments:false splitStatements:false context:MTP-57372 labels:MTP-70112_4
--comment: exclude manual orders


DROP FUNCTION IF EXISTS oms.oms_get_scheduler_frequency_mapping();
CREATE OR REPLACE FUNCTION oms.oms_get_scheduler_frequency_mapping()
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
DECLARE
    result JSONB;
BEGIN
    WITH scheduler_frequency AS (
        SELECT 
            sh_name,
            sh_frequency,
            CASE 
                -- Weekly frequency: e.g., "weekly&Tuesday,Wednesday"
                WHEN sh_frequency LIKE 'weekly%' THEN 
                    53 * ARRAY_LENGTH(STRING_TO_ARRAY(SPLIT_PART(sh_frequency, '&', 2), ','), 1)
                -- Monthly frequency: e.g., "monthly&1" or "monthly&Monday&1"
                WHEN sh_frequency LIKE 'monthly%' THEN 
                    12 * CASE 
                        WHEN SPLIT_PART(sh_frequency, '&', 3) IS NOT NULL THEN 1  -- e.g., "monthly&Monday&1"
                        ELSE 1  -- e.g., "monthly&1"
                    END
                -- Daily frequency: e.g., "daily&week_days"
                WHEN sh_frequency LIKE 'daily%' THEN 365  -- Weekdays in a year
                -- Yearly frequency: e.g., "yearly&March&12"
                WHEN sh_frequency LIKE 'yearly%' THEN 1
                -- Quarterly frequency: e.g., "quarterly&2&12"
                WHEN sh_frequency LIKE 'quarterly%' THEN 4  -- Quarters in a year
                ELSE 0  -- Unsupported frequency
            END AS runs
        FROM inventory_smart.auto_allocation_scheduler
        where not is_deleted
    ),
    scheduler_mapping AS (
        SELECT 
            s1.sh_name AS key_scheduler,
            ARRAY_AGG(s2.sh_name) AS higher_frequency_schedulers
        FROM scheduler_frequency s1
        JOIN scheduler_frequency s2 ON s1.runs <= s2.runs
        GROUP BY s1.sh_name
    )
    SELECT JSONB_OBJECT_AGG(key_scheduler, higher_frequency_schedulers)
    INTO result
    FROM scheduler_mapping;

    RETURN result;
END;
$function$
;
