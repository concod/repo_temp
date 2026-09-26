--liquibase formatted sql
--changeset RaviThakur:get_oms_constraints_lead_time_update3 runOnChange:true stripComments:false splitStatements:false context:MTP-58020 labels:71829-1
--comment: MTP-71829 user name added_update2
--rollback: SELECT 1

DROP FUNCTION IF EXISTS inventory_smart.get_oms_constraints_lead_time(input refcursor, jsonb, jsonb);
CREATE OR REPLACE FUNCTION inventory_smart.get_oms_constraints_lead_time(input refcursor, jsonb, jsonb)
 RETURNS refcursor
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
       inventory_smart.get_oms_constraints_lead_time(
       'my_cur',
       '{
           "l0_name": [{"type": "list","operator": "in", "values": ["101_BRIDAL"]}],
           "l1_name" : [],
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
   _query_pa                   text:='';
   _query_order                text:='';
   v_constraints_leadtime_sql  text:='';
 begin
_query_pa := inventory_smart.form_main_table_filters(
		  'ph_master',
		  $2
		);
_query_order := global.form_table_query($3);

   v_constraints_leadtime_sql := '
     select
       *
     from (
            select
              oclt.id,
			  oclt.article,
              oclt.lead_time,
              oclt.mode_shipment,
              COALESCE(oclt.default_mode, ''1'') as default_mode,
              paf.cost,
              paf.l0_name,
              paf.l1_name,
              paf.l2_name,
              paf.l3_name,
			  paf.l4_name,
			  paf.color_description as color_desc,
              dc.name as loc_name,
              oclt.loc_code,
              oclt.vendor_name,
              oclt.vendor_code,
              oclt.created_at,
              um2.name as created_by,
              um.name as updated_by,
              oclt.updated_at
            from
              inventory_smart.oms_constraints_lead_time oclt
              left join global.user_master um 
              on oclt.updated_by=um.user_code
              left join global.user_master um2 
              on oclt.created_by=um2.user_code
            inner join
              (SELECT article, active, l0_name, l1_name, l2_name,l3_name, l4_name, color_description, ordering, avg(cost) as cost FROM "global".product_attributes_filter  '||_query_pa||'
				group by 1, 2, 3, 4, 5, 6, 7, 8, 9) paf
            on
              oclt.article = paf.article
            inner join
              global.distribution_centres dc
            on
              oclt.loc_code = dc.linked_store_code
            and
              not dc.is_deleted and paf.active and paf.ordering = ''Y''
          ) X
			'||_query_order|| '';

   raise notice 'v_constraints_leadtime_sql %',v_constraints_leadtime_sql;
   open input for execute v_constraints_leadtime_sql;
   RETURN v_constraints_leadtime_sql;
 end
 $function$
;
