--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:fn_v3_get_alert_metric_info_in_text-1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: Function to fetch single alert metric info

DROP FUNCTION if exists price_markdown.fn_v3_get_alert_metric_info_in_text;

CREATE OR REPLACE FUNCTION price_markdown.fn_v3_get_alert_metric_info_in_text(_alert_id integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    alert_metric_info TEXT := '';
    condition_row RECORD;
    short_metric_name TEXT;
    short_operator TEXT;
    formatted_threshold TEXT;
    first_condition BOOLEAN := TRUE;
BEGIN
	if _alert_id is null then 
		return alert_metric_info;
	end if;

	-- loop through each condition associated with the given alert_id
	for condition_row in 
	    select 
	        m.short_name as short_metric_name,
	        o.short_name as short_operator,
	        am.threshold_value,
	        lower(coalesce(am.logical_operator, '')) as logical_operator
	    from price_markdown.tb_custom_alerts_metrics am
	    join price_markdown.tb_custom_alerts_metric_config m 
	        on am.metric_id = m.metric_id
	    join price_markdown.tb_custom_alerts_operator_config o 
	        on am.operator_id = o.operator_id
	    where am.alert_id = _alert_id
	    order by am.metric_id
	loop
	    -- format threshold value based on metric type
	    if right(condition_row.short_metric_name, 1) = '%' then 
	        formatted_threshold := condition_row.threshold_value || '%';
	    elsif right(condition_row.short_metric_name, 1) = '$' then 
	        formatted_threshold := condition_row.threshold_value || '$';
	    else
	        formatted_threshold := condition_row.threshold_value;
	    end if;
	
	    -- append logical operator if it's not the first condition
	    if not first_condition then
	        alert_metric_info := alert_metric_info || ' ' || condition_row.logical_operator || ' ';
	    end if;
	
	    -- append condition to the text
	    alert_metric_info := 
	        alert_metric_info || 
	        format('%s is %s %s', 
	            condition_row.short_metric_name, 
	            condition_row.short_operator, 
	            formatted_threshold
	        );
	
	    -- set first_condition to false after first iteration
	    first_condition := false;
	end loop;
	
	return alert_metric_info;
END;
$function$
;
