--liquibase formatted sql
--changeset karthikeswar.saravanan@impactanalytics.co:order_batching_fetch_allocation runOnChange:true stripComments:false splitStatements:false context:order_batching_fetch_allocation labels:order_batching_fetch_allocation
--comment: order_batching_fetch_allocation - intial sync version
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.order_batching_fetch_allocation(input refcursor, jsonb, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.order_batching_fetch_allocation(input refcursor, jsonb, jsonb, jsonb)
 RETURNS refcursor
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.order_batching_fetch_allocation
  * Created by: Jitendra
  * No of input parameter: 4
  * Parameter Description : $1 = cursor
  *                         $2 = product filters str
                            $3 = store filters str
                            $4 = custom filter str
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *Tharun B         15-Nov-2024    Added logging
  */
declare
    _query_combine text;
    _query_pa      text:='';
    _query_sa      text:='';
    _query_cus     text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $2);
    _query_sa  := inventory_smart.form_main_table_filters('store_attributes_filter', $3);
    _query_cus := inventory_smart.form_main_table_filters('', $4);
    _query_combine = format($$
    		select * from (
                SELECT 
                    plan_code,
                    name as allocation_name,
                    created_at,
                    type,
                    status
                FROM 
                    inventory_smart.plan_master
                    where
                    is_deleted = false
                    --and status in (2) and type in (0, 2, 4)
            ) X %3$s
        $$, _query_pa, _query_sa, _query_cus);
        raise notice '%', _query_combine;
        OPEN $1 FOR execute _query_combine;  
		perform  global.sp_log(v_gen_random_uuid, 'inventory_smart.order_batching_fetch_allocation', 'Before returning function value',_query_combine,jsonb_build_object('product filters str',$2,'store filters str',$3,'custom filter str',$4)) ;		
        RETURN $1;
    end
$function$
;