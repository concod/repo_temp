--liquibase formatted sql
--changeset liquibase:update_product_life_cycle_bulk runOnChange:true stripComments:false splitStatements:false context:MTP-59520 labels:MTP-59520.
--comment: MTP-59520 upload_flag added, porting changes from NA for set all
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.update_product_life_cycle_bulk(jsonb, jsonb, jsonb, jsonb, integer,text);
CREATE OR REPLACE FUNCTION inventory_smart.update_product_life_cycle_bulk(jsonb, jsonb, jsonb, jsonb, integer, text, text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
/*
 * Product Life Cycle Screen SP
 * -------------------
 * Inputs:
 *   $1 - product details
 *   $2 - store details
 *   $3 - table metadata
 *   $4 - values JSON array
 *   $5 - updated by
 *   %6 - excluded rows
 */
DECLARE
    _query_ph text := '';
    _query_sa text := '';
    _query_table_filters text := '';
    _query text := '';
    _excluded_rows_filter  text := '';
   	query_combine text;
    _rows_count int;
   	_count_query text := '';
   _select_1 text := 'select 1 as success';
  	_result jsonb;
   
BEGIN
    _query_ph := inventory_smart.form_main_table_filters('ph_master', $1);
    _query_sa := inventory_smart.form_main_table_filters('store_attributes', $2);
    _query_table_filters := global.form_table_query($3);
	_excluded_rows_filter := $6;
	
    IF POSITION('store_code' IN _query_table_filters) > 0 THEN
        -- Replace 'store_code' with 'sd.store_code'
        _query_table_filters := REPLACE(_query_table_filters, 'store_code', 'sd.store_code');
    END IF;
	
   	if _query_table_filters <> '' and _excluded_rows_filter <> '' then
		_query_table_filters = _query_table_filters  || ' and ' ||  _excluded_rows_filter;	
	elseif  _excluded_rows_filter <> '' then
		_query_table_filters = ' where ' ||  _excluded_rows_filter;
	end if;

	if $7 ilike 'record_count' then 
		_count_query = 
            'with count as  (SELECT count(plc.article) as record_count, count(distinct plc.article) as sku_count
            FROM inventory_smart.product_life_cycle plc
            JOIN (
                SELECT * FROM inventory_smart.ph_master ph  '|| _query_ph ||'
            ) pd USING (article)
            JOIN (
                SELECT * FROM global.store_attributes_filter '|| _query_sa ||'
            ) sd ON sd.store_code = plc.store_code AND pd.channel = sd.channel
            '|| _query_table_filters ||') select jsonb_build_object(''record_count'', record_count, ''sku_count'', sku_count) from count';
            --limit 1
        RAISE NOTICE '_query %', _count_query;
	end if;
		
    
	_query :=
        $$
        WITH t2 AS (
            SELECT
                STRING_TO_ARRAY(TRIM(BOTH '{}' FROM data->'values'->>'markdown_date'), '], [') AS markdown_date,
                STRING_TO_ARRAY(TRIM(BOTH '{}' FROM data->'values'->>'clearance_date'), '], [') AS clearance_date,
                (data->'values'->>'next_markdown_start_date') AS next_markdown_start_date,
                (data->'values'->>'next_clearance_start_date') AS next_clearance_start_date,
                (data->'values'->>'next_markdown_end_date') AS next_markdown_end_date,
                (data->'values'->>'next_clearance_end_date') AS next_clearance_end_date,
                (data->'values'->>'current_status') AS current_status,
                case when (data->'values'->>'launch_date') = '' then null else (data->'values'->>'launch_date')::date end  launch_date
            FROM (
                SELECT jsonb_array_elements('%1$s') data
            ) inp
        ),
        b AS (
            SELECT plc.article, plc.store_code, plc.l0_name
            FROM inventory_smart.product_life_cycle plc
            JOIN (
                SELECT * FROM inventory_smart.ph_master ph %2$s
            ) pd USING (article)
            JOIN (
                SELECT * FROM global.store_attributes_filter %3$s
            ) sd ON sd.store_code = plc.store_code AND pd.channel = sd.channel
            %4$s
            --limit 1
        )
       	update
			inventory_smart.product_life_cycle plc
		set
			markdown_date = coalesce(NULLIF(t2.markdown_date, '{}'),
	plc.markdown_date),
		    clearance_date = coalesce(NULLIF(t2.clearance_date, '{}'),
	plc.clearance_date),
		    next_markdown_start_date = coalesce(t2.next_markdown_start_date,
	plc.next_markdown_start_date::text)::date,
		    next_markdown_end_date = coalesce(t2.next_markdown_end_date,
	plc.next_markdown_end_date::text)::date,
		    next_clearance_start_date = coalesce(t2.next_clearance_start_date,
	plc.next_clearance_start_date::text)::date,
		    next_clearance_end_date = coalesce(t2.next_clearance_end_date,
	plc.next_clearance_end_date::text)::date,
		    launch_date = coalesce(t2.launch_date,
	plc.launch_date),
		    current_status = coalesce(nullif(t2.current_status,''),
	plc.current_status),
            upload_flag = 'false',
			updated_at = now(),
			updated_by = %5$s  
		from t2,b 
		where plc.article = b.article and plc.store_code = b.store_code and plc.l0_name = b.l0_name;
        $$;
       	query_combine := format(_query, $4,_query_ph,_query_sa,_query_table_filters,$5);
    RAISE NOTICE '_query %', query_combine;

   
   	if $7 ilike 'record_count' then
		EXECUTE _count_query into  _result;
		return _result;
	else 
		execute query_combine;
		EXECUTE _select_1 into _result;
		return _result;
	end if;
END
$function$
;
