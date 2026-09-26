--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort.get_finalize_attribute_grade_details_list liquibase:get_finalize_attribute_grade_details_list runOnChange:true stripComments:false splitStatements:false context:MTP-28347 labels:liquibase_project_start
--comment: type conversion changeset for pen values for get_finalize_attribute_grade_details_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_finalize_attribute_grade_details_list(input integer);
CREATE OR REPLACE FUNCTION assort.get_finalize_attribute_grade_details_list(input jsonb)
 RETURNS TABLE(plan_finalize_grade_id integer[], attribute_name character varying, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$
  /*
  Function/Procedure name: assort.get_finalize_attribute_grade_details_list
  Created by: Hemant Kumar Singh
  Created at: 15-Mar-2022
  Updated at: 21-Nov-2023
  No of input parameter: 1
  Parameter Description : $1 = plan_finalize_grade_id
  
  Purpose: This function been created to get finalize attribute grade details list
  
  Calling Statement:
  SELECT assort.get_finalize_attribute_grade_details_list('92429');
  
  Hemant Kumar SIngh: getting finalize attribute grade details
  */
  declare
  	_query_combine text;
  	_where text;
  	_input_data jsonb;
  	_filter_data jsonb;
  	_input_json json ;
   	_value text;
  	begin
	  	_where:=null;
  		_input_data:= $1::jsonb;
  		_filter_data:=(_input_data->>'filters')::jsonb;
  		 for _input_json in select json_array_elements(value::json) input_json from
              (select value from jsonb_each_text($1::jsonb)) x

          loop

  			_value = _input_json->>'value';
			_value:= REPLACE(_value, '"', '' );

        	end loop;
      	-- prepare where clause
          _where:=(select * from assort.prepare_where_clause_from_json_filters(_filter_data) );
  		_query_combine := ' select
							 array'|| _value ||' as plan_finalize_grade_id, -- the plan_finalize_grade_id for the selected l3-cluster grades
							 attribute_name,
							 jsonb_build_object(
							 ''type'',type,
							 ''cc_ly'', coalesce(cc_ly,0),''cc_ty'', coalesce(cc_ty,0),
							 ''st_ly'', coalesce(st_ly,0),''st_ty'', coalesce(st_ty,0),
							 ''aps_ly'', coalesce(aps_ly,0),''aps_ty'', coalesce(aps_ty,0),
							 ''msrp_ly'', coalesce(msrp_ly,0),''msrp_ty'', coalesce(msrp_ty,0),
							 ''avg_depth_ly'', coalesce(avg_depth_ly,0),''avg_depth_ty'', coalesce(avg_depth_ty,0),
							 ''receipt$_ly'', coalesce(receipt$_ly,0),''receipt$_ty'', coalesce(receipt$_ty,0),
							 ''cogs_ly'', coalesce(cogs_ly,0),''cogs_ty'', coalesce(cogs_ty,0),
							 ''pen_ly'', coalesce((receipt$_ly/nullif((receipt$_ly_sum)::float,0))::float,0),
							 ''pen_ty'', coalesce((receipt$_ty/nullif((receipt$_ty_sum)::float,0))::float,0),
							 ''receipt_units_ly'', coalesce(receipt_units_ly,0),''receipt_units_ty'', coalesce(receipt_units_ty,0)
							 ) as attribute_value
							from (
							select *, sum(receipt$_ly) over () as receipt$_ly_sum, sum(receipt$_ty) over () as receipt$_ty_sum
							from
							 (select
							 attribute_name,
							 attribute_value ->> ''type'' as type,
							     avg(nullif((attribute_value ->> ''cc_ly'')::float,0))::float as cc_ly, avg(nullif((attribute_value ->> ''cc_ty'')::float,0))::float as cc_ty,
							 avg(nullif((attribute_value ->> ''st_ly'')::float,0))::float as st_ly, avg(nullif((attribute_value ->> ''st_ty'')::float,0))::float as st_ty,
							 avg(nullif((attribute_value ->> ''aps_ly'')::float,0))::float as aps_ly, avg(nullif((attribute_value ->> ''aps_ty'')::float,0))::float as aps_ty,
							 avg(nullif((attribute_value ->> ''msrp_ly'')::float,0))::float as msrp_ly, avg(nullif((attribute_value ->> ''msrp_ty'')::float,0))::float as msrp_ty,
							 avg(nullif((attribute_value ->> ''avg_depth_ly'')::float,0))::float as avg_depth_ly, avg(nullif((attribute_value ->> ''avg_depth_ty'')::float,0))::float as avg_depth_ty,
							 sum((attribute_value ->> ''receipt$_ly'')::float) as receipt$_ly, sum((attribute_value ->> ''receipt$_ty'')::float) as receipt$_ty,
							 sum((attribute_value ->> ''cogs_ly'')::float)::float as cogs_ly, sum((attribute_value ->> ''cogs_ty'')::float)::float as cogs_ty,
							sum((attribute_value ->> ''receipt_units_ly'')::float)::float as receipt_units_ly,sum((attribute_value ->> ''receipt_units_ty'')::float)::float as receipt_units_ty

							 from
							 assort.plan_finalize_grade_attribute
							' || _where ||' -- the plan_finalize_grade_id for the selected l3-cluster grades
							 and attribute_name not in (''receipt$'',''msrp'', ''cc'', ''receipt_units'', ''aur_grade'', ''st_grade'', ''aps_grade'', ''avg_depth'', ''imu'', ''rcpt_cost'', ''style_no'')
							 group by 1,2
							 order by attribute_name) temp_tbl) final_tbl
							  					';
  		raise notice '%', _query_combine;
  		RETURN QUERY execute _query_combine;
   	end
  $function$
;