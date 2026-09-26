--liquibase formatted sql
--changeset akshay.jain@impacanalyticst.co:rcl_create_pmps_version_2_tester_5 runOnChange:true stripComments:false splitStatements:false context:Release_1_5 labels:liquibase_project_start_5
--comment: added count exceed check
--rollback: SELECT 1
DROP FUNCTION IF EXISTS global.rcl_create_pmps_version_2_tester(input refcursor, _temp_tbl_name text, _product_filters jsonb, _meta_filters jsonb, _created_by integer, _rcl_code integer, _validity jsonb, _store_filters jsonb, _review boolean);
CREATE OR REPLACE FUNCTION global.rcl_create_pmps_version_2_tester(input refcursor, _temp_tbl_name text, _product_filters jsonb, _meta_filters jsonb, _created_by integer, _rcl_code integer, _validity jsonb, _store_filters jsonb, _review boolean)
 RETURNS refcursor
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
_index_query text;
_product_filter text;
_store_filter text = '';
_hierarchy text;
_key text;
_value text;
_keys text[];
_jsonb_arr text[];
_jsonb_body text;
_query_table_filters text;
select_query text;
persist_query text;
drop_query text;
_rcl_level_val text[];
_validity datemultirange;
_item text;
_rule_code_update_sql text;
_data_count integer;
_count_query text;

/*
 *select * from global.rcl_create_pmps_version_2_tester('cur', 'e1fae385_f4e6_44f3_a080_12fd2145c04e', '{"l0_name": [{"type": "list", "operator": "in", "values": ["CAN"], "dimension": "product"}], "l1_name": [{"type": "list", "operator": "in", "values": ["E-Commerce"], "dimension": "product"}], "l2_name": [{"type": "list", "operator": "in", "values": ["CARTERS"], "dimension": "product"}], "l3_name": [{"type": "list", "operator": "in", "values": ["BABY"], "dimension": "product"}], "l4_name": [{"type": "list", "operator": "in", "values": ["0-24M"], "dimension": "product"}], "l5_name": [{"type": "list", "operator": "in", "values": ["HOLIDAYS AND EVENTS"], "dimension": "product"}], "active": [{"type": "list", "operator": "in", "values": [true], "dimension": "product"}], "is_deleted": [{"type": "list", "operator": "in", "values": [false], "dimension": "product"}]}', '{"search": [], "sort": [], "range": [], "limit": {"limit": 10, "page": 1, "offset": 0}, "query_type": "AND"}', 251, 65538, '{"validity": "{[2024-08-04, 2024-08-08]}"}', '{"country": [{"type": "list", "operator": "in", "values": ["CAN"], "dimension": "store"}], "channel": [{"type": "list", "operator": "in", "values": ["E-Commerce"], "dimension": "store"}], "active": [{"type": "list", "operator": "in", "values": [true], "dimension": "store"}], "is_deleted": [{"type": "list", "operator": "in", "values": [false], "dimension": "store"}]}', True);
fetch all in "cur";
*/
begin	
   	_store_filter := "global".form_attribute_table_filters_v2('store_attributes', 'store_code', $8);
   	_query_table_filters := global.form_table_query($4);
   	select level from global.rcl_master where rcl_code = $6 into _rcl_level_val;
   _validity := ($7)::jsonb->>'validity';
   
    FOREACH _key IN ARRAY _rcl_level_val loop
    	_jsonb_arr := array_append(_jsonb_arr, ''|| '''' || _key || '''' || ', ' || _key ||'');
    	IF not ($3 ? _key) THEN
		$3 := jsonb_set($3, ARRAY[_key], '[]');
	end if;
	_product_filter := "global".form_attribute_table_filters_v2('product_attributes', 'product_code', $3);
    raise notice 'jsonb_arr: %', _jsonb_arr;
    end loop;
    _jsonb_body := array_to_string(_jsonb_arr, ', ');
    raise notice 'jsonb_body: %', _jsonb_body;
   
   _query_part := 
        'CREATE TABLE IF NOT EXISTS global.rule_creation_' || $2::text || ' as
with paf_data as (

	select paf2.* from (select distinct l0_name, jsonb_build_object(' || _jsonb_body || ') AS rcl_dimension, nextval(''global.rcl_product_mapping_product_store_rule_rule_code_seq'') as rule_code  FROM ('|| _product_filter ||') paf ) paf2
	LEFT JOIN global.rcl_product_mapping_product_store_rule rcl 
		            ON rcl.rcl_dimension = paf2.rcl_dimension
		            WHERE rcl.rcl_dimension IS NULL

),
combined_data as (
	select distinct psa.psa_code, 
                    psa.psa_name,
					paf_data.rcl_dimension,
					paf_data.rule_code,
                    ' || $6::int || ' AS rcl_code,
                    ' || quote_literal(_validity::datemultirange) || ' AS validity,
                    ' || _created_by || '::int4 AS created_by,
                    ' || quote_literal(now()) || '::timestamp AS created_at
                    from paf_data
                    join global.product_store_attributes_filter_store_code psa USING (l0_name)
                    JOIN (
                    SELECT attributes.store_code
                    FROM (' || _store_filter || ') attributes
                ) store_attr USING (store_code)
                    
)

select * from combined_data';

	drop_query = 'drop table if exists global.rule_creation_' || $2::text;
   
   	EXECUTE _query_part;
   
   	_count_query := 'select count(*) from global.rule_creation_' || $2::text;
   raise notice 'count query: %', _count_query;
   EXECUTE _count_query INTO _data_count;
   
   	raise notice 'data_count: %', _data_count;
   
   
   IF _data_count > 1000000 then
   		execute drop_query;
        -- Raise a custom exception with SQLSTATE code 'P0002'
        RAISE EXCEPTION 'Row count exceeds the limit of 1000000: %', _data_count USING ERRCODE = 'P0002';
   ELSIF _data_count=0 then
   		execute drop_query;
   		RAISE EXCEPTION 'Row count 0 No New rules to be created : %', _data_count USING ERRCODE = 'P0003';
   end if;
   	
   IF $9 is false then
	   	persist_query =  'select * from global.persist_rcl_create_pmps_version_2(''rule_creation_' || $2::text || ''')';
		raise notice 'persist_query: %', persist_query;
		execute persist_query;
		execute drop_query;
		open $1 for execute 'select true';
   	else
   		open $1 for execute 'select ''global.rule_creation_' || $2::text || ''' as unique_table';
    END IF;
RETURN $1;
end
$function$
;