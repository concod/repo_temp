--liquibase formatted sql
--changeset adesh:user_reserve_and_instock_list runOnChange:true stripComments:false splitStatements:false context:MTP-130114 labels:MTP-130114
--comment: MTP-130114 fix channel NULL mismatch in user reserve join
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.user_reserve_and_instock_list(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
DECLARE
	_query_combine text:= '';
	_channel text := inventory_smart.get_channel_from_input($2);
	_query_pa text:= global.form_main_table_filters('product_attributes_filter', $2);
	_query_table_filters text := '';
	_unique_key jsonb;
	_product_attr jsonb;
	_unique_clause text := '';
	_filter_having text;
    _filter_where text;
    _ph_sort text ;
    _ph_search text;
    _overall_search text;
    _limit int := 0;
    _offset int;
	begin
	SELECT $2 - 'unique_key' INTO _product_attr;
	SELECT $2->'unique_key' INTO _unique_key;

    _unique_key := json_build_object('unique_key', _unique_key);

    _query_pa := global.form_main_table_filters('product_attributes_filter', _product_attr);
    _unique_clause := global.form_main_table_filters('product_attributes_filter', _unique_key);
    _unique_clause := replace(_unique_clause, 'unique_key', 'CONCAT(article::text, ''|'', dc_code::text, ''|'', pack_type_id::text)');
    SELECT * FROM inventory_smart.form_search_sort_clause($4, 'product_attributes_filter', 'global') INTO _ph_sort, _ph_search, _overall_search, _limit, _offset;

     IF _limit != 0 THEN
        _query_table_filters =  _overall_search || replace(global.form_table_query($4), 'WHERE', 'AND');
     END IF;
     IF _unique_clause != '' THEN
        _unique_clause := replace(_unique_clause, 'WHERE', 'AND');
     END IF;
    _query_combine := '
    WITH product_attributes_filter AS (
      SELECT 
        product_code,
        product_description,
        article,
        l0_name,
        l2_name,
        l3_name,
        l5_name
      FROM "global".product_attributes_filter
      ' || _query_pa || _ph_search || '
    ),
    results AS (
      SELECT
        paf.product_code,
        sdav.dc_code,
        dc.dc_code_display,
        sdav.channel,
        COALESCE(drq.inventory_source, ''DC'') AS inventory_source,
        sdav.type,
        CONCAT(paf.article, ''|'', sdav.dc_code, ''|'', sdav.pack_type_id) AS unique_key,
        paf.product_description,
        paf.article,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        paf.l3_name,
        paf.l5_name,
        sdav.pack_type_id,
        CASE WHEN sdav.pack_type = ''packs'' THEN ''MIX'' ELSE sdav.size END AS size,
        COALESCE(drq.incoming_po_30, 0) AS incoming_po_30,
        COALESCE(drq.incoming_po_31_60, 0) AS incoming_po_31_60,
        COALESCE(drq.incoming_po_61_90, 0) AS incoming_po_61_90,
        sdav.oh_packs AS dc_oh,
        COALESCE(ur.quantity, 0) AS user_reserve,
        COALESCE(sdau.packs_allocated, 0) AS allocated_reserve,
        COALESCE(ur.quantity, 0) + COALESCE(sdau.packs_allocated, 0) AS total_units_reserved,
        sdav.oh_packs - COALESCE(sdau.packs_allocated, 0) AS dc_available,
        sdav.oh_packs - COALESCE(sdau.packs_allocated, 0) - COALESCE(ur.quantity, 0) AS net_dc_available,
        ROUND(
          (
            (COALESCE(ur.quantity, 0)::numeric
             / NULLIF(
                 sdav.oh_packs - COALESCE(sdau.packs_allocated, 0) - COALESCE(ur.quantity, 0),
               0)
            ) * 100
          )::numeric, 2
        ) AS user_reserve_percentage,
        ur.reservation_till_date,
        um.user_name AS updated_by,
        TO_CHAR(ur.created_at AT TIME ZONE ''' || inventory_smart.get_tenant_timezone() || ''', ''YYYY-MM-DD HH12:MI:SS'') AS updated_at,
        ur.comment,
        SUM(sdav.units_in_pack) AS units_in_pack
      FROM product_attributes_filter paf
      LEFT JOIN inventory_smart.sku_dc_available_units sdav
        ON paf.product_code = sdav.product_code
      LEFT JOIN inventory_smart.sku_dc_allocated_units sdau
        ON sdav.article = sdau.article
       AND sdav.size = sdau.size
       AND sdav.dc_code = sdau.dc_code
       AND sdav.channel = sdau.channel
      LEFT JOIN (
        SELECT 
          dc_code,
          REPLACE(linked_store_code, ''_dc'', '''') AS dc_code_display
        FROM "global".distribution_centres
      ) dc ON sdav.dc_code = dc.dc_code
      LEFT JOIN inventory_smart.dc_reserve_quantity drq
        ON sdav.dc_code = drq.dc_code
       AND sdav.product_code = drq.product_code
       AND sdav.channel = drq.channel
      LEFT JOIN inventory_smart.dc_pack_reserve_quantity ur
        ON sdav.pack_type_id = ur.pack_type_id
       AND sdav.dc_code = ur.dc_code
      LEFT JOIN "global".user_master um
        ON um.user_code = ur.updated_by::int
      WHERE COALESCE(ur.quantity, 0) > 0 OR sdav.oh > 0
      GROUP BY
        paf.product_code,
        sdav.dc_code,
        dc.dc_code_display,
        sdav.channel,
        COALESCE(drq.inventory_source, ''DC''),
        sdav.type,
        paf.article,
        paf.product_description,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        sdav.pack_type_id,
        sdav.pack_type,
        sdav.size,
        COALESCE(drq.incoming_po_30, 0),
        COALESCE(drq.incoming_po_31_60, 0),
        COALESCE(drq.incoming_po_61_90, 0),
        sdav.oh_packs,
        ur.quantity,
        sdau.packs_allocated,
        ur.reservation_till_date,
        um.user_name,
        ur.created_at,
        ur.comment
    )
    SELECT 
      product_code,
      dc_code,
      dc_code_display,
      channel,
      inventory_source,
      type,
      unique_key,
      product_description,
      article,
      l0_name,
      l1_name,
      l2_name,
      l3_name,
      l5_name,
      pack_type_id,
      size,
      incoming_po_30,
      incoming_po_31_60,
      incoming_po_61_90,
      dc_oh,
      user_reserve,
      allocated_reserve,
      total_units_reserved,
      dc_available,
      net_dc_available,
      user_reserve_percentage,
      reservation_till_date,
      updated_by,
      updated_at,
      comment,
      units_in_pack
    FROM results WHERE TRUE '
        || _unique_clause || _query_table_filters;
    RAISE NOTICE '%', _query_combine;
    OPEN $1 FOR EXECUTE _query_combine;
    RETURN $1;
END;
$function$;
