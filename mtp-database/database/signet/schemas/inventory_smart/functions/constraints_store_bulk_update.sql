--liquibase formatted sql
--changeset shubham.singh@impactanalytics.co:constraints_store_bulk_update_by_filters_1 runOnChange:true stripComments:false splitStatements:false context:Release 2_3_3 labels:MTP-27698
--comment: MTP-27698
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update(input text, jsonb, jsonb, text, text, text, text, integer, jsonb);
DROP FUNCTION IF EXISTS inventory_smart.constraints_store_bulk_update(input text, jsonb, jsonb, text, text, text, text, integer, jsonb, text);
CREATE OR REPLACE FUNCTION inventory_smart.constraints_store_bulk_update(input text, jsonb, jsonb, text, text, text, text, integer, jsonb, text)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
    declare
    _query_pa text := '';
    _query_sa text := '';
    _client_columns text;
    _channel text[] := inventory_smart.get_channel_from_input_new($3);
    _l0_name text[] := inventory_smart.get_l0_name_from_input($2);
    _channel_where_condition text := '';
    _channel_and_conditions text := '';
    _channel_max_invalid_conditions text := '';
    _query_table_filters text := '';
    _query_combine text := '';
    _store_invalid_max_query text := '';
    _cache_payload jsonb := jsonb_build_object('product_attributes', $2, 'store_attributes', $3, 'client_columns',$4, 'min_value', $5,'max_value', $6,'wos_value', $7, 'user_id', $8);
    _tq jsonb := (($9 - 'sort') - 'limit');
    _update_column text := ' ';
   	_statement_cte_1 text := '';
   	_where_clause_cte_1 text := '';
   	_select_1 text := 'select 1 as success';
   	_result jsonb;
   	_final_select_cte text := '';
   
    _store_query text := ' where pmps.store_code =saf.store_code';
-- _cache_dependencies text[] := '{inventory_smart.constraint_master}';
begin
    _query_pa := inventory_smart.form_main_table_filters(
    'ph_master',
    $2
    );
    _query_sa := global.form_main_table_filters(
    'store_attributes_filter',
    $3
    );
    raise notice '_l0_name %', _l0_name;
    if cardinality(_channel) = 0 then
    raise notice 'no channel passs %,',_channel;
    _channel_where_condition = ' ';
    _channel_and_conditions = ' ';
    _channel_max_invalid_conditions = ' where cm.min_stock > cm.max_stock and cm.l0_name = any('''|| concat(_l0_name) ||'''::varchar[])';
    else
    _channel_where_condition = ' where c.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
    _channel_and_conditions = ' and t1.channel in (''' || array_to_string(_channel, ''',''', '') || ''')';
    _channel_max_invalid_conditions = ' where cm.min_stock > cm.max_stock and cm.channel in (''' || array_to_string(_channel, ''',''', '') || ''') and cm.l0_name = any('''|| concat(_l0_name) ||'''::varchar[])';
    end if;
    raise notice '_channel_max_invalid_conditions %', _channel_max_invalid_conditions;
    if length ($4)> 0 then
    _client_columns := ','||$4;
    else
    _client_columns := '';
    end if;
    if length($5)>0 then
    _update_column := _update_column || ' min_stock = '||$5::int || ',';
    end if;
    if length($6)>0 then
    _update_column := _update_column || ' max_stock = '||$6::int || ',';
    end if;
    if length($7)>0 then
    _update_column := _update_column || ' wos = '||$7::int || ',';
    end if;
    _update_column := _update_column || ' updated_at = now(), updated_by = ' || $8;
    raise notice '_update_column %', _update_column;
    _query_table_filters := global.form_table_query(_tq);

    if length($3::text) - 2>0 then
        _store_query := _query_sa || ' and pmps.store_code =saf.store_code';
    end if;
   
   		if $10 ilike 'record_count' then 
			_statement_cte_1 := 'with count as (select count(distinct t1.mapping_code) as record_count, count(distinct article) as sku_count';
			_where_clause_cte_1 := 'join  inventory_smart.constraint_validity_master t1 on  b.mapping_code = t1.mapping_code and b.l0_name = t1.l0_name';
			_final_select_cte := ') select jsonb_build_object(''record_count'', record_count, ''sku_count'', sku_count) from count';
		
		else
			_statement_cte_1 := 'update inventory_smart.constraint_validity_master t1 set ' || _update_column;
			_where_clause_cte_1 := 'where b.mapping_code = t1.mapping_code and b.l0_name = t1.l0_name';
			_final_select_cte := '';
		end if;

        _query_combine := 
        _statement_cte_1||'
        
        from (
        with product_master_filters_data
        as (
        SELECT
        pmps.mapping_code,
        paf.l0_name,
		article
        FROM
        (
        select
        l0_name,
        l1_name,
        l2_name,
        article,
        unnest(product_code_size_map)->> ''product_code'' as product
        FROM
        inventory_smart.ph_master
        ' || _query_pa || '
        ) paf
        join global.product_mapping_product_store pmps on paf.product = pmps.product_code and paf.l0_name = pmps.l0_name
        and pmps.l0_name = any('''|| concat(_l0_name) ||'''::varchar[])
        and exists
            (select 1 from global.store_attributes_filter saf	
            '|| _store_query ||'	 
            )
        ) select distinct * from product_master_filters_data) b '|| _where_clause_cte_1||'
		'||_final_select_cte||' ';
		
        _store_invalid_max_query := '
        update inventory_smart.constraint_validity_master t1
        set max_stock = t1.min_stock
        from (
        select
        mapping_code,
        channel,
        l0_name
        from inventory_smart.constraint_validity_master cm
        '||_channel_max_invalid_conditions||'
        ) t2 where t1.l0_name = any('''|| concat(_l0_name) ||'''::varchar[]) and t1.mapping_code = t2.mapping_code and t1.l0_name = t2.l0_name';
        raise notice '_store_invalid_max_query %', _store_invalid_max_query;
        raise notice '%', _query_combine;
       
       if $10 ilike 'record_count' then
			EXECUTE _query_combine into _result;
			return _result;
		else 
			execute _query_combine;
			execute _store_invalid_max_query;
			EXECUTE _select_1 into _result;
			return _result;
		end if;
end

$function$
;