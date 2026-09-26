--liquibase formatted sql
--changeset hemant.kumar@impactanalytics.co:assort_smart.get_master_plan_level_list liquibase:get_master_plan_level_list runOnChange:true stripComments:false splitStatements:false context:MTP-26446 labels:liquibase_project_start
--comment: initial changeset for get_master_plan_level_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_master_plan_level_list(input jsonb, jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_master_plan_level_list(input jsonb, jsonb)
 RETURNS TABLE(l0_name text, l1_name text, l2_name text, l3_name text, channel text, sub_channel text, updated_at text,year text,season text, aur double precision, sales_units double precision, sales double precision, aic double precision, buy_units double precision, receipt double precision, st double precision, gm double precision, style_count bigint, choice_count bigint)
 LANGUAGE plpgsql
AS $function$
  /*
  Function/Procedure name: assort_smart.assort_master_plan_level_list
  Created by: Hemant Kumar
  Created at: 03-Apr-2023
  Update at: 03-Apr-2023
  No of input parameter: 1
  Parameter Description : $1, jsonb

  Purpose: This function been created to get plan_budget details for plan-review-screen

  Calling Statement:
  SELECT * from assort_smart.assort_master_plan_level_list({'filters': [
          {'attribute_name': 'l0_name', 'value': ['Home'
              ], 'prefix': 'levels', 'operator': 'in'
          },
          {'attribute_name': 'l1_name', 'value': ['Home'
              ], 'prefix': 'levels', 'operator': 'in'
          },
          {'attribute_name': 'l2_name', 'value': ['Textiles'
              ], 'prefix': 'levels', 'operator': 'in'
          }
      ]
  });

  Hemant Kumar:
  */
  declare
  	_query_combine text;
  	_query_final_query text;
  	_where text;
  	_input_data jsonb;
  	_filter_data jsonb;
  	_query_table_filters text := '';
  	begin
  		_where:=null;
  		_input_data:= $1::jsonb;
  		_filter_data:=(_input_data->>'filters')::jsonb;

      	-- prepare where clause
          _where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );
         _query_table_filters := "global".form_table_query($2);

         if length(coalesce (_where,''))=0 then
      		_where:=' ';

      	end if;

  		_query_combine := 'select * from (
								select
 								l0_name::text,
 								l1_name::text,
 								l2_name::text,
 								l3_name::text,
 								channel::text,
 								sub_channel::text,
								updated_at::text,
								year::text,
								season::text,
 								coalesce(sum(forecasted_qty * AUR)/sum((nullif(forecasted_qty,0))),0) as aur ,
 								coalesce(avg(forecasted_qty),0) sales_units,
 								coalesce(sum(forecasted_qty * aur),0) as sales,
 								coalesce(sum(forecasted_qty * cost)/sum(forecasted_qty),0) as aic,
 								coalesce(sum(total_qty),0) as buy_units,
 								coalesce(sum(total_qty * aur),0) as receipt,
 								coalesce(sum(st * forecasted_qty)/sum(forecasted_qty),0) as st,
 								(sum(forecasted_qty * aur) - sum(forecasted_qty * cost))/nullif(sum(forecasted_qty* aur),0) gm,
 								count(style_id) as style_count,
 								count(article_number) as choice_count
 							from
 								(
 								select
 									l0_name,
 									l1_name,
 									levels->>''l2_name'' as l2_name,
 									levels->>''l3_name'' as l3_name,
 									channel,
 									levels->>''sub_channel'' as sub_channel,
									levels->>''fiscal_year'' as year,
									attribute_value->>''season_name'' as season,
									(attribute_value->>''updated_at'') as updated_at,
									(attribute_value->>''aur'')::float8 as aur,
 									coalesce((attribute_value->>''forecasted_qty'')::float8,0) as forecasted_qty,
 									(attribute_value->>''cost'')::float8 as cost,
 									(attribute_value->>''total_qty'')::float8 as total_qty,
 									(attribute_value->>''st'')::float8 as st,
									(attribute_value->>''style_id'') as style_id,
 									(attribute_value->>''article_number'') as article_number
 								from
 									assort_smart.assort_master_plan
 									' || _where ||'
 							) as amp
 							group by 1,2,3,4,5,6,7,8,9 ) final_tbl '|| _query_table_filters ||' ';
 		raise notice '%', _query_combine;
  		RETURN QUERY execute _query_combine;
   	end
  $function$
;
