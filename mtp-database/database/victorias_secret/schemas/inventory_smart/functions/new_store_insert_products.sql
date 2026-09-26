--liquibase formatted sql
--changeset liquibase:new_store_insert_products runOnChange:true stripComments:false splitStatements:false context:MTP-55027 labels: MTP-55027
--comment: new store insert only active products | MTP-64867 remodel flag added | drop statement added | considering store code in new store metrics 
--rollback: SELECT 1
DROP FUNCTION IF EXISTS inventory_smart.new_store_insert_products(jsonb, varchar, int4);
DROP FUNCTION IF EXISTS inventory_smart.new_store_insert_products(jsonb, varchar, int4, bool);
CREATE OR REPLACE FUNCTION inventory_smart.new_store_insert_products(jsonb, character varying, integer, boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
 /* 
  * Function/Procedure name: inventory_smart.new_store_insert_products
  * Created by: Manohara Gulla
  * Created at: 20-Sep-2024
  * No of input parameter: 4
  * Parameter Description : 
  *                         $1 = product filters str
                            $2 = store code
                            $3 =  user id 
                            $4 = remodel_flag
  * if any modification done in same function/procedure please record the changes in below format
  *
  * Updated_by       Updated_on      Purpose
  * ----------       -----------     --------
  *
  */
declare
    _query_combine text;
    _query_pa      text:='';
    v_gen_random_uuid text  := gen_random_uuid()::varchar;
    begin
    _query_pa  := inventory_smart.form_main_table_filters('product_attributes_filter', $1);
    _query_pa := _query_pa || ' and is_deleted = false and active' ;
    _query_combine := format($$
        insert into global.new_store_reserve (store_code, 
				product_code,
				size,
				article,
				created_at,
				approved,
				created_by,
				remodel_flag) 
				select  
					distinct store_code,
					a.product_code,
					a.size,
					a.article,
					NOW(), 
					false, 
					%1$s,
					remodel_flag
				from inventory_smart.new_store_metrics nsm 
				join ( select *
				FROM global.product_attributes_filter paf) a using (product_code)
				where nsm.remodel_flag = %2$L::boolean  and nsm.store_code = %3$L
    $$, $3, $4, $2);
    raise notice '%', _query_combine;
    execute _query_combine;  
    perform  global.sp_log(v_gen_random_uuid,'inventory_smart.new_store_insert_products', 'Before end',_query_combine,jsonb_build_object('product_filters', $1, 'store_code', $2, 'user_id', $3));
    end
$function$
;