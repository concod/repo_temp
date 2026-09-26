--liquibase formatted sql
--changeset rajesh:rcl_po_store_policy_rule_partial_update runOnChange:true stripComments:false splitStatements:false context:MTP-112857-po-store-strategy labels:MTP-112857-po-store-strategy
--comment: MTP-112857-po-store-strategy
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.rcl_dc_store_policy_rule_partial_update(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb);
DROP FUNCTION IF EXISTS inventory_smart.rcl_dc_store_policy_rule_partial_update(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb, _is_store_level_configuration boolean);
DROP FUNCTION IF EXISTS inventory_smart.rcl_dc_store_policy_rule_partial_update(_selections jsonb, _product_filters jsonb, _values text, _meta_filters jsonb, _updated_by integer, _is_all_records_selected boolean, _excluded_rows jsonb, _is_store_level_configuration boolean, _config jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_dc_store_policy_rule_partial_update(
	_selections jsonb, 
	_product_filters jsonb, 
	_values text, 
	_meta_filters jsonb, 
	_updated_by integer, 
	_is_all_records_selected boolean, 
	_excluded_rows jsonb,
	_is_store_level_configuration boolean default false,
    _config jsonb default '{}'::jsonb
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_where text := '';
_final varchar[];
_query_meta_filters text;
_query_sa text;
_pa_query text;
_hash_cols text;
_rcl_codes integer[];
_dimension text[];
_item jsonb;
_key text;
_value text;
_con text[];
_key_cols text;
_dt_sql text;
_dt text;
_set jsonb;
_sets text;
_temp_sql text;
_temp_table text := gen_random_uuid();
_temp_table_2 text := gen_random_uuid();
_auto_allocation_schedular_value text;
_rule_name text;
_module_code int4;
_rcl_store_policy_table text;
_rcl_store_policy_rule_table text;
/*s
Description: Inputs: $1 = set all/ selections values, $2 = product filters, $3 = store filters, $4 = new values for the filters, $5 = meta filters, $6 = created by.
This sp is used to update the base table directly. 
Sample calls: 

Type 1 - 
select * from inventory_smart.rcl_dc_store_policy_rule_partial_update('[{"rule_code": 62814}, {"rule_code": 62815}, {"rule_code": 62816}]',
'{}',
'set default_store_groups = {504} ',
'{"search": [], "range": [], "query_type": "AND"}',
251);

Type 2 - 
select * from inventory_smart.rcl_dc_store_policy_rule_partial_update('[]',
'{"l0_name": [{"type": "list", "operator": "in", "values": ["USA"]}], "l1_name": [{"type": "list", "operator": "in", "values": ["Brick __ia_char_13 Mortar"]}], "l2_name": [{"type": "list", "operator": "in", "values": ["CARTERS", "CHILD OF MINE", "JUST ONE YOU", "LITTLE PLANET", "OSHKOSH", "SIMPLE JOYS", "SKIP HOP"]}], "l3_name": [{"type": "list", "operator": "in", "values": ["ACCESSORIES", "BABY", "BLANK", "BOYS PLAYWEAR", "GIRLS PLAYWEAR", "LITTLE PLANET", "MARKETING PROMOTIONS", "OUTERWEAR", "SHOES", "SKIP HOP", "SLEEPWEAR", "SWIMWEAR"]}]}',
'set auto_allocation_rule = 122 , dc_store_rule = 122 , default_store_groups = {501}, rule_name = test ',
'{"search": [], "range": [], "query_type": "AND"}',
251);

*/
begin
	-- Extract values from _config
	_module_code := COALESCE(_config->>'module_code', '10003');
	_rcl_store_policy_table := COALESCE(_config->>'rcl_store_policy_table', 'inventory_smart.rcl_dc_store_policy');
	_rcl_store_policy_rule_table := COALESCE(_config->>'rcl_store_policy_rule_table', 'inventory_smart.rcl_dc_store_policy_rule');
    _query_meta_filters := inventory_smart.form_rcl_table_query($4);
   raise notice '1';
	_pa_query := global.form_main_table_filters('product_attributes_filter', $2);
	select
		array_agg(rcl_code),
		'array[' || string_agg('rcl_hash->>' || quote_literal(rcl_code), ', ') || ']::text[] as rcl_hash' into _rcl_codes, _hash_cols 
	from global.rcl_master 
	where not is_deleted
	and module_code = _module_code
	and not is_default
	group by is_deleted;
--    _query_pa := replace(REPLACE(_query_pa, '(rcl_dimension->>''', ''), ''')', '');
   
   raise notice '2';

	if jsonb_array_length($1) > 0 then
	        FOR _set IN SELECT * FROM jsonb_array_elements($1) LOOP
	            FOR _key, _value IN SELECT * FROM jsonb_each_text(_set) LOOP 
	                IF _key in ('rule_code', 'rcl_code') THEN 
	                    _con := array_append(_con,  _key || ' = ' || quote_literal(_value));
	                ELSE
	                    _con := array_append(_con,  _key || ' = ' || _value);
	                    RAISE NOTICE '_con: %', _con;
	                END IF;
	            END LOOP;
	            _final := array_append(_final, '(' || array_to_string(_con, ' AND ') ||')');
	           	RAISE NOTICE '_final: %', _final;
	            _con := '{}';
	        END LOOP;
	       
	        IF cardinality(_final) > 0 THEN
	            _where := ' WHERE ' || array_to_string(_final, ' OR ');
	        END IF;
	        RAISE NOTICE 'where: %', _where;
	        
        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT rule_code FROM ' || _rcl_store_policy_table ||  _where || ';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;

    ELSE 
        _where := ' JOIN (
            SELECT rcl_code, rule_code, md5(r.rcl_dimension::text) rcl_hash, rcl_dimension, rule_name
            FROM ' || _rcl_store_policy_rule_table || ' r
            JOIN (
                SELECT ' || _hash_cols || ' FROM global.product_attributes_filter ' || _pa_query || ' GROUP BY 1
            ) paf 
            ON md5(r.rcl_dimension::text) = ANY(rcl_hash)
            AND r.rcl_code = ANY(' || quote_literal(_rcl_codes::text) || '::int[])
            GROUP BY 1,2,3
        ) r USING(rule_code, rcl_code)';

        _temp_sql := 'CREATE TEMP TABLE "' || _temp_table || '" ON COMMIT DROP AS SELECT c.rule_code FROM ' || _rcl_store_policy_table || ' c' || _where || _query_meta_filters ||';';
        RAISE NOTICE '_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
		if _is_all_records_selected and jsonb_array_length(_excluded_rows) > 0 then
			execute 'delete from "' || _temp_table || '" temp_table where exists (select 1 from jsonb_array_elements(' || quote_literal(_excluded_rows::text) || ') where (value->>''rule_code'')::integer = temp_table.rule_code)';
		end if;
    END IF;

    -- Handle store level configuration if needed
    if _is_store_level_configuration then
        -- Extract auto_allocation_schedular value if it exists in _values
        _auto_allocation_schedular_value := substring(_values from 'auto_allocation_schedular\s*=\s*(\d+)');
        
        if _auto_allocation_schedular_value is not null then
            -- Update store level table for each rule_code
            _temp_sql := 'UPDATE inventory_smart.rcl_dc_store_policy_store_level 
                          SET auto_allocation_schedular = ' || _auto_allocation_schedular_value || ', 
                              updated_by = ' || $5 || ', 
                              updated_at = now() 
                          WHERE rule_code IN (SELECT rule_code FROM "' || _temp_table || '")';
            RAISE NOTICE 'Store level update SQL: %', _temp_sql;
            EXECUTE _temp_sql;
        end if;
    end if;

    -- Extract rule_name from $3 if it exists
    _rule_name := NULL;
    IF $3 ~* 'rule_name\s*=' THEN
        -- First try to match quoted rule_name
        _rule_name := substring($3 from 'rule_name\s*=\s*''([^'']+)''');
        
        -- If no quoted rule_name found, try to match unquoted rule_name
        -- This will capture everything until the next comma or end of string
        IF _rule_name IS NULL THEN
            _rule_name := trim(substring($3 from 'rule_name\s*=\s*([^,]+)(?:,|$)'));
        END IF;
    END IF;

    -- Create update SQL for rcl_dc_store_policy (excluding rule_name)
    _temp_sql := 'UPDATE ' || _rcl_store_policy_table || ' ' ||
                 regexp_replace(
                     regexp_replace($3, 'rule_name\s*=\s*''[^'']*''(,|\s*$)', ''), -- Remove quoted rule_name
                     'rule_name\s*=\s*[^,]+(,|\s*$)', -- Remove unquoted rule_name (including spaces)
                     ''
                 ) || 
                 ', updated_by = ' || $5 ||', updated_at = now() where (rule_code) IN (SELECT rule_code FROM "' ||_temp_table || '");';

    -- Clean up any double commas that might have been created
    _temp_sql := regexp_replace(_temp_sql, ',\s*,', ',', 'g');
    -- Fix array syntax
    _temp_sql := regexp_replace(_temp_sql, '{([0-9,]+)}', format('''{\1}'''), 'g');
    -- Remove comma if any after set command
    _temp_sql := regexp_replace(_temp_sql, 'set\s*,\s*', 'set ', 'gi');

    RAISE NOTICE 'rcl_dc_store_policy_temp_sql: %', _temp_sql;
    EXECUTE _temp_sql;

    -- If rule_name was specified, update rcl_dc_store_policy_rule
    IF _rule_name IS NOT NULL THEN
        _temp_sql := 'UPDATE ' || _rcl_store_policy_rule_table || ' rdspr
                    SET rule_name = ' || quote_literal(_rule_name) || '
                    WHERE rdspr.rule_code IN (SELECT rule_code FROM "' || _temp_table || '")';
        RAISE NOTICE 'rcl_dc_store_policy_rule_temp_sql: %', _temp_sql;
        EXECUTE _temp_sql;
    END IF;

end
$function$
;