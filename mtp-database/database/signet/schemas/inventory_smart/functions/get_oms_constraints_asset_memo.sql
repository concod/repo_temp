--liquibase formatted sql
--changeset aman.pareek:get_oms_constraints_asset_memo runOnChange:true stripComments:false splitStatements:false context:MTP-41038 labels:liquibase_project_start
--comment: changes for get_oms_constraints_asset_memo
--rollback: SELECT 1


DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_asset_memo(refcursor, jsonb, jsonb);

-- DROP FUNCTION inventory_smart.get_oms_constraints_asset_memo(refcursor, jsonb, jsonb);

CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_asset_memo(input refcursor, jsonb, jsonb)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
 /*
   Get lead time constraints
   Parameres :
               $1: Refcursor
               $2: Product Filter
               $3: Meta JSON for pagination
 
   
  Usage:
   select
      *
   from
       inventory_smart.get_oms_constraints_asset_memo(
       'my_cur',
       '{
           "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
           "l1_name" : [],
           "l2_name" : [],
           "product_description" : [],
           "planning_ownership" : [],
           "merchandise_category" :[],
           "merchandise_brand": [],
           "product_channel_name": [],
           "vendor_code": [],
           "vendor_name": []
        }',
         '{
           "search": [],
           "sort": [],
           "range": [],
           "limit": {
                      "limit": 10,
                       "page": 2
                    }
       }'
      );
  fetch all in "my_cur";
  */
 declare
   v_pa_sql                    text:='';
   v_constraints_asset_memo_sql  text:='';
 begin
   v_pa_sql := global.form_attribute_table_filters_v2('product_attributes'
                                                     ,'product_code'
                                                     , $2
                                                     );
   v_constraints_asset_memo_sql := '
     select
       *
     from (
            select 
				par.*,
				oor.roq_unconstrained,
				oor.order_type,
				ocam.future_conversion_date,
				ocam.cancelled_memo_po_qty,
				ocam.committed_not_oo_qty
			from 
				(select paf.*,new_value as loc_code
					from ('||v_pa_sql||') paf
					join
					inventory_smart.oms_mapping_table mt
					ON paf.primary_wh=mt.value AND mt.variable=''store'' AND mt.true_false = ''true''
					and paf.active and paf.ordering = ''Y'' ) par
				left join 
					inventory_smart.oms_orders_recommended oor 
				on
					par.product_code = oor.product_code
					and 
					par.vendor_code = oor.vendor_code
					and 
					par.loc_code =  oor.loc_code
					and 
					 oor.order_gen_type = ''Recommended''	
				left join 
					inventory_smart.oms_constraints_asset_memo ocam
				on 
					par.product_code  = ocam.product_code
					and 
					par.vendor_code = ocam.vendor_code
					and 
					par.loc_code = ocam.loc_code

            
          ) X '|| global.form_table_query($3);
   
   raise notice 'v_constraints_leadtime_sql %',v_constraints_asset_memo_sql;
   open $1 for execute v_constraints_asset_memo_sql;
   RETURN v_constraints_asset_memo_sql;
 end
 $function$
;
