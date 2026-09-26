--liquibase formatted sql
--changeset shashwat.yadav:rcl_create_network_add runOnChange:true stripComments:false splitStatements:false context:MTP-74818 labels:MTP-74818
--comment: MTP-74818 Used to add hierarchy in rcl rule
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_create_network_add(text, jsonb, int4, int4);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_create_network_add(temp_tbl_name text, _product_filters jsonb, _rcl_code integer, _created_by integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare 
_query_part text;
_query_combine text;
_rule_filter text;
_index_query text;
_product_filter text;
_hierarchy text;
_key text;
_value text;
_keys text[];
_jsonb_arr text[];
_jsonb_body text;
v_gen_random_uuid text  := gen_random_uuid()::varchar;
BEGIN
    _product_filter := global.form_rcl_product_validity_filter($2, '{}');
    _product_filter := replace(REPLACE(_product_filter, '(rcl_dimension->>''', ''), ''')', '');
    for _key, _value in select * from jsonb_each_text($2) loop
	    	raise notice 'value2: %', _value;
    		_keys := array_append(_keys, _key);
    end loop;
    FOREACH _key IN ARRAY _keys loop
    	_jsonb_arr := array_append(_jsonb_arr, ''|| '''' || _key || '''' || ', ' || _key ||'');
    raise notice 'jsonb_arr: %', _jsonb_arr;
    end loop;
    _jsonb_body := array_to_string(_jsonb_arr, ', ');
    raise notice 'jsonb_body: %', _jsonb_body;
    _query_part := '
        create table public.' || $1 || ' as 
        select * from(SELECT
            x.*,
            rnr.rcl_dimension AS existing_rcl,
            rnr.rule_code AS existing_rule_code,
            rnr.rcl_code AS existing_rcl_code
            FROM
                (
                select 
                        rcl_dimension,
                        rcl_code,
                        rule_name,
                        supply_network,
                        validity,
                        created_by,
                        created_at,
                        rule_code
                from ( 
                            SELECT
                                jsonb_build_object(' || _jsonb_body || ') as rcl_dimension
                                , null::int4 as rcl_code
                                , ''''::varchar as rule_name
                                , null::int4 as supply_network
                                , null::daterange as validity
                                ,' || _created_by || '::int4 as created_by
                                ,' || quote_literal(now()) || '::timestamp as created_at
                                , nextval(''inventory_smart.rcl_network_rule_rule_code_seq'') as rule_code
                            FROM global.product_attributes_filter paf ' || _product_filter || '
                            group by 1,2,3,4,5,6,7
                        )  z 
                ) x

                left join inventory_smart.rcl_network_rule rnr on x.rcl_dimension = rnr.rcl_dimension) y
                where existing_rcl is null or not exists (
                    select
                        1
                    from
                        inventory_smart.rcl_network_master rnm
                    where
                        rnm.rule_code = y.existing_rule_code and
                        rnm.rcl_code = y.existing_rcl_code
                    and
                        upper(validity) > current_date
                    )
                ;';
    raise notice '_query_part: %', _query_part;
    perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.rcl_create_network_add', 'Before returning function value',_query_part,jsonb_build_object('_temp_tbl_name',$1,'_product_filters',$2,'_rcl_code',$3,'_created_by',$4)) ;		

   EXECUTE _query_part;
END
$function$
;