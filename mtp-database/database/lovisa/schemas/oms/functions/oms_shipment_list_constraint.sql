--liquibase formatted sql
--changeset kailash.kangne@impactanalytics.co:Added_oms_shipment_list_constraint_update1_MTP-131864 runOnChange:true stripComments:false splitStatements:false context:MTP-101298 labels:oms_shipment_list_constraint_update1
--comment: MTP-101298

DROP FUNCTION IF EXISTS inventory_smart.oms_shipment_list_constraint(refcursor, jsonb, text[], jsonb);
DROP FUNCTION IF EXISTS oms.oms_shipment_list_constraint(refcursor, jsonb, text[], jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.oms_shipment_list_constraint(refcursor, jsonb, text[], jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_pa_query text := '';


begin
    
    _pa_query := global.form_main_table_filters('product_attributes_filter', $2);
    
    raise notice '_pa_query: %', _pa_query;

    -- Construct WHERE clause to join with `product_attributes_filter`
     _where := 'join (select distinct on (l4_name) l4_name, l1_name, l2_name, l3_name, range_usa, range_asia, range_au_nz, range_eu_uk, range_africa, style_name from global.product_attributes_filter ' || _pa_query || ' ) paf';

    -- Construct the main query part to fetch the desired fields
    _query_part := 'SELECT
		paf.*,
		ocs.channel,
        ocs.loc_code,
        dc.name AS name,
        ocs.min_replenishment_quantity,
        ocs.max_replenishment_quantity,
        ocs.order_multiple,
        ocs.product_code,
        ocs.id as shipment_id
    FROM inventory_smart.oms_constraints_shipment ocs
    ' || _where;

    -- Combine the query part with additional filters
    _query_combine := 'SELECT A.*
        FROM (' || _query_part || ' ON paf.l4_name = ocs.product_code
        INNER JOIN global.distribution_centres dc ON ocs.loc_code = dc.linked_store_code AND NOT dc.is_deleted) AS A
        ' || global.form_table_query($4);
    
    raise notice 'query_combine: %', _query_combine;

    -- Execute the combined query and open the cursor
    open $1 for execute _query_combine;
    return $1;

END
$function$
;