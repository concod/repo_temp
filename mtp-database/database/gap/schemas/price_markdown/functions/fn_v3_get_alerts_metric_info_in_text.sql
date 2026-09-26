--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_v3_get_alerts_metric_info_in_text-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Helper function to get alerts metric info

DROP FUNCTION if exists price_markdown.fn_v3_get_alerts_metric_info_in_text;

CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_alerts_metric_info_in_text(_alert_ids integer[] DEFAULT NULL::integer[], _filtered_alert_ids integer[] DEFAULT NULL::integer[], _fetch_type integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    alerts_metric_info text;
    selected_alert_id integer;
BEGIN
    if array_length(_alert_ids, 1) > 0 then 
        case _fetch_type
            when 1 then 
                selected_alert_id := _alert_ids[1];
            when 2 then 
                if _filtered_alert_ids is not null then
                    SELECT a INTO selected_alert_id
                    FROM unnest(_alert_ids) a 
                    WHERE a = ANY(_filtered_alert_ids)
                    LIMIT 1;
                else
                    selected_alert_id := _alert_ids[1];
                end if;
        end case;

        select * into alerts_metric_info 
        from price_markdown.fn_v3_get_alert_metric_info_in_text(selected_alert_id);
    end if;
    
    return alerts_metric_info;
END;
$function$
;
