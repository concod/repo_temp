--liquibase formatted sql
--changeset liquibase:rcl_store_groups runOnChange:true stripComments:false splitStatements:false context:MTP-38503 labels:MTP-38503
--comment: MTP-38503 Used to list store_groups linked with rcl rule, filtering based on country and channel, sorted by default store groups
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.rcl_store_groups(refcursor, text, text, _int4, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.rcl_store_groups(input refcursor, text, text, integer[], table_filters jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_combine text;
_query_table_filters text := '';
_query_all text := '';
v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin

    _query_table_filters := global.form_table_query(table_filters);

    _query_combine = '
    SELECT * FROM (SELECT 
        sg.sg_code, 
        sg.name,
        CASE 
            WHEN sg.sg_code = any(' ||  quote_literal($4) || ') THEN true
            ELSE false 
        END as is_selected,
        jsonb_agg(
            jsonb_build_object(
            ''store_code'', sgm.store_code,
            ''store_name'', saf.store_name
            )) as stores
    FROM global.store_groups sg
    LEFT JOIN global.store_groups_mapping sgm on sg.sg_code = sgm.sg_code 
	LEFT JOIN global.store_attributes_filter saf on saf.store_code = sgm.store_code
	WHERE sgm.store_code is not null and saf.country='||  quote_literal($2) ||' and sg.channel='||  quote_literal($3) ||' and not sg.is_deleted
    GROUP BY sg.sg_code, sg.name 
	ORDER BY is_selected desc, sg.created_by desc) x';


	_query_all = _query_combine || ' ' || _query_table_filters;
	raise notice 'Query All --> %', _query_all;
    OPEN $1 FOR execute _query_all;  
	perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.rcl_store_groups', 'Before returning function value',_query_all,jsonb_build_object('country',$2,'channel',$3,'sg_code',$4,'table_filters',$5)) ;		

	RETURN $1;

END;
$function$
;
