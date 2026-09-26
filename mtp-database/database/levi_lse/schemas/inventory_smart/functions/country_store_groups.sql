--liquibase formatted sql
--changeset rajesh:country_store_group runOnChange:true stripComments:false splitStatements:false context:MTP-75468 labels:MTP-75468
--comment: MTP-75468 : CNA for Levis
--rollback: SELECT  1

-- DROP FUNCTION inventory_smart.country_store_groups();

DROP FUNCTION IF EXISTS inventory_smart.country_store_groups(input refcursor, text, text);

CREATE OR REPLACE FUNCTION inventory_smart.country_store_groups(input refcursor, text, text)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
declare 
_query_all text := '';
v_gen_random_uuid text  := gen_random_uuid()::varchar;
begin                     
    _query_all = '
    SELECT 
        sg.sg_code as value, 
        sg.name as label
    FROM global.store_groups sg
    LEFT JOIN global.store_groups_mapping sgm on sg.sg_code = sgm.sg_code 
	LEFT JOIN global.store_attributes_filter saf on saf.store_code = sgm.store_code
	WHERE 
        sg.is_deleted = false and 
		saf.planning_group_name = '||  quote_literal($2) ||'
    GROUP BY sg.sg_code, sg.name
	ORDER BY sg.created_by desc';


	raise notice 'Query All --> %', _query_all;
    OPEN $1 FOR execute _query_all;  
	PERFORM  global.sp_log(v_gen_random_uuid, 'inventory_smart.country_store_groups', 'Before returning function value',_query_all,jsonb_build_object('country',$2,'channel',$3));
	RETURN $1;

END;
$function$
;
;
