--liquibase formatted sql
--changeset liquibase:dc_transfer_recommendation_result runOnChange:true stripComments:false splitStatements:false context:MTP-88222 labels:MTP-88222
--comment: MTP-88222 dc name changes
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.dc_transfer_recommendation_article_view(input_cursor refcursor, text[]);
CREATE OR REPLACE FUNCTION inventory_smart.dc_transfer_recommendation_article_view(input_cursor refcursor, choice_timestamps text[])
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
/*
Fetch article-level data for dc transfer recommendation. Filter applied for choices and not choice_timestamps
------------------------------------------------
Sample Query: 
select * from inventory_smart.dc_transfer_recommendation_article_size_view(
	'123', 
	array['1080600903A9']
);
fetch all in "123";
------------------------------------------------
*/
DECLARE
	_timezone text;
    _query_combine text;
	_date_filter text;
BEGIN
	-- Fetch timezone
	SELECT attribute_value::json->'value'->>'time_zone'
    INTO _timezone
    FROM global.tenant_attribute_master
    WHERE name = 'tenant_time_config'
    LIMIT 1;

	_date_filter := format(' AND (tr.created_at::timestamptz AT TIME ZONE %L)::date = (now() at time zone %L)::date', _timezone, _timezone);

    _query_combine := '
    SELECT 
        tr.article,
		tr.article_date,
        paf.l7_name,
        paf.color,
        paf.l0_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.masterstyle_descr,
        paf.l6_name,
        paf.collection,
        paf.product_lifecycle,
        paf.subbrand_code_desc,
        paf.store_tiering,
        paf.flex_style,
        paf.generic,
        paf.sizes_mat,
        paf.form,
        paf.user_defined_1,
        paf.user_defined_2,
        paf.user_defined_3,
        paf.user_defined_4,
        paf.user_defined_5,
        tr.launch_date,
        tr.launch_floorset,
        tr.ship_date AS floorset_shipdate,
        tr.floorset_start_date,
        tr.floorset_end_date,
        dcs.name AS source,
        dcd.name AS destination,
        tr.dc_source,
        tr.dc_destination,
        COUNT(DISTINCT tr.size) AS num_sizes,
        SUM(tr.recommended_transfer_quantity) AS recommended_transfer_quantity,
        sum(COALESCE(tr.user_adjusted_transfer_quantity, tr.recommended_transfer_quantity)) AS user_adjusted_transfer_quantity,
        MAX(tr.destination_partner_count) AS destination_partner_count,
        SUM(tr.destination_promised_quantity) AS destination_promised_quantity,
        SUM(tr.destination_oh) AS destination_oh_inv,
        MAX(tr.source_partner_count) AS source_partner_count,
        SUM(tr.source_promised_quantity) AS source_promised_quantity,
        SUM(tr.source_oh) AS source_oh_inv,
        SUM(tr.source_oh) - SUM(COALESCE(tr.user_adjusted_transfer_quantity, tr.recommended_transfer_quantity)) AS source_remaining_oh_inv,
		GREATEST(sum(destination_promised_quantity - destination_oh)::integer, 0) as need
    FROM 
        inventory_smart.dc_transfer_recommendation_result tr
    LEFT JOIN 
        global.product_attributes_filter paf ON tr.article = paf.article AND tr.size = paf.size
    join 
        global.distribution_centres dcs on tr.dc_source = dcs.linked_store_code
    join 
        global.distribution_centres dcd on tr.dc_destination = dcd.linked_store_code
    WHERE 
        tr.article = ANY(%L)
		%s
    GROUP BY 
        tr.article,
		tr.article_date,
        paf.l7_name,
        paf.color,
        paf.l0_name,
        paf.l3_name,
        paf.l4_name,
        paf.l5_name,
        paf.masterstyle_descr,
        paf.l6_name,
        paf.collection,
        paf.product_lifecycle,
        paf.subbrand_code_desc,
        paf.store_tiering,
        paf.flex_style,
        paf.generic,
        paf.sizes_mat,
        paf.form,
        paf.user_defined_1,
        paf.user_defined_2,
        paf.user_defined_3,
        paf.user_defined_4,
        paf.user_defined_5,
        tr.launch_date,
        tr.launch_floorset,
        tr.ship_date,
        tr.floorset_start_date,
        tr.floorset_end_date,
        tr.dc_source,
        tr.dc_destination,
		dcs.name,
		dcd.name
    ORDER BY 
        tr.article,
        tr.dc_source,
        tr.dc_destination';

	_query_combine = format(_query_combine, $2, _date_filter);

	raise notice 'FORMATTED QUERY -->>%', _query_combine;

    OPEN $1 FOR execute _query_combine;  
	RETURN $1;
END;
$function$
;