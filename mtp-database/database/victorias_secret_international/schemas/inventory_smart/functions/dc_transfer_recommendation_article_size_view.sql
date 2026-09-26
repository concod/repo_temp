--liquibase formatted sql
--changeset liquibase:dc_transfer_recommendation_result runOnChange:true stripComments:false splitStatements:false context:MTP-88222 labels:MTP-88222
--comment: MTP-88222 changes
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_transfer_recommendation_article_size_view(input_cursor refcursor, text);
CREATE OR REPLACE FUNCTION inventory_smart.dc_transfer_recommendation_article_size_view(input_cursor refcursor, choice text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
Fetch size-level data for dc transfer recommendation for a specific choice
------------------------------------------------
Sample Query: 
select * from inventory_smart.dc_transfer_recommendation_size_view(
    '123', 
    array['choice_testtime'],
    'VS12345'
);
fetch all in "123";
------------------------------------------------
*/
DECLARE
    _timezone text;
    _query_combine text;
	_date_filter text;
BEGIN

	SELECT attribute_value::json->'value'->>'time_zone'
    INTO _timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

	_date_filter := format(' AND (tr.created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', _timezone, _timezone);

    _query_combine := '
    SELECT 
        tr.size,
        tr.dc_source AS dc_source,
        tr.dc_destination AS dc_destination,
        dcs.name as source,
		dcd.name as destination,
        tr.recommended_transfer_quantity AS recommended_transfer_quantity,
        COALESCE(tr.user_adjusted_transfer_quantity, tr.recommended_transfer_quantity) as user_adjusted_transfer_quantity,
        tr.destination_partner_count,
        tr.destination_promised_quantity,
        tr.destination_oh AS destination_oh_inv,
        tr.source_partner_count,
        tr.source_promised_quantity,
        tr.source_oh AS source_oh_inv,
        tr.source_oh - COALESCE(tr.user_adjusted_transfer_quantity, tr.recommended_transfer_quantity) AS source_remaining_oh_inv,
		GREATEST((destination_promised_quantity - destination_oh)::integer, 0) as need
    FROM 
        inventory_smart.dc_transfer_recommendation_result tr
        join global.distribution_centres dcs on tr.dc_source = dcs.linked_store_code
        join global.distribution_centres dcd on tr.dc_destination = dcd.linked_store_code
    WHERE 
        tr.article = ''%s''
        %s
    ORDER BY 
        tr.size,
        tr.dc_source,
        tr.dc_destination';

    _query_combine := format(_query_combine, $2, _date_filter);

    raise notice 'FORMATTED QUERY -->>%', _query_combine;

    OPEN $1 FOR execute _query_combine;  
    RETURN $1;
END;
$function$
;