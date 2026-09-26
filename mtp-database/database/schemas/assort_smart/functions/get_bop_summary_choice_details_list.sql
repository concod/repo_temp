--liquibase formatted sql
--changeset liquibase:get_bop_summary_choice_details_list runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for get_bop_summary_choice_details_list
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_bop_summary_choice_details_list(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_bop_summary_choice_details_list(input jsonb)
 RETURNS TABLE(plan_code integer, l0_name text, l1_name text, l2_name text, l3_name text, channel text, choice_name text, style_number text, style_name text, color_name text, article_number text, bop_qty double precision, aur double precision, st double precision, sku_productivity double precision, attribute_value jsonb)
 LANGUAGE plpgsql
AS $function$

  	/*
  Function/Procedure name: assort_smart.get_bop_summary_choice_details_list
  Created by: Hemant Kumar Singh
  Created at: 11-Apr-2022
  No of input parameter: 1
  Parameter Description : $1 = json

  Purpose: This function been created to getting bop summary list for choice level

  Calling Statement:

  SELECT assort_smart.get_bop_summary_choice_details_list(''{"filters":[{"attribute_name":"plan_code","value":[108],"operator":"in"},{"attribute_name":"l0_name","value":["Bags"],"prefix":"levels","operator":"in"},{"attribute_name":"l1_name","value":["Backpacks/Lunch Bags"],"prefix":"levels","operator":"in"},{"attribute_name":"l2_name","value":["Backpacks"],"prefix":"levels","operator":"in"},{"attribute_name":"l3_name","prefix":"levels","operator":"in","value":["< $115"]},{"attribute_name":"drop","prefix":"levels","operator":"in","value":["-"]},
  {"attribute_name":"flow_to_next_season","prefix":"attribute_value","operator":"in","value":["No"]}]}'');


  Hemant Kumar SIngh:getting bop summary choice list
  */
  declare
  _query_combine text;
  _input_json json ;
  _attribute_name text;
  _operator text;
  _prefix text;
  _value text;
  _where text;


      begin
      	_where:=null;

  	    for _input_json in select json_array_elements(value::json) input_json from
              (select value from jsonb_each_text($1::jsonb)) x

          loop

              _attribute_name = _input_json->>'attribute_name';

  			_operator = _input_json->>'operator';

  			_value = _input_json->>'value';
  			_value:= REPLACE(_value, '"', '''' );

  			if _operator = 'in' then
  				_value:= REPLACE(_value, '[', '(' );
  				_value:= REPLACE(_value, ']', ')' );
  			end if;

  			if (_input_json->>'prefix') IS NOT null then
  	     		_prefix = _input_json->>'prefix';

  	     	else
  	     		_prefix:=null;

  	     	end if;


  	     	if _where IS NULL then
  		     	if _prefix IS NULL then
  					_where:=  (' where '||_attribute_name || ' ' || _operator || ' ' || _value)::text;
  				else
  					_where:= (' where '||_prefix||'->>'''||_attribute_name || ''' ' || _operator || ' ' || _value)::text;
  				end if;
  			else
  				if _prefix IS NULL then
  					_where:= concat(_where, ' and '||_attribute_name|| ' ' || _operator || ' ' || _value);
  				else
  					_where:= concat(_where, ' and '||_prefix||'->>'''||_attribute_name || ''' ' || _operator || ' ' || _value);
  				end if;
  			end if;

        	end loop;

        	_query_combine := 'select * from (
  			 select
              wedge_master.plan_code ,
              wedge_master.l0_name,
              wedge_master.l1_name,
              wedge_master.l2_name,
              wedge_master.l3_name,
 			wedge_master.channel,
              wedge_master.choice_name ,
              replace(wedge_master.style_number,''null'','''') as style_number,
              replace(wedge_master.style_name,''null'','''') as style_name,
              replace(wedge_master.color_name,''null'','''') as color_name,
replace(wedge_master.article_number,''null'','''') as article_number,
              wedge_master.bop_qty,
              coalesce(wedge_master.aur,0),
              wedge_master.st,
  			wedge_master.forecasted_qty as sku_productivity,
              jsonb_agg(distinct(jsonb_build_object(key, value))) as attribute_value
          from
              (
              select
                  plan_code,
                  key,
                  value,
                  levels->>''l0_name'' l0_name,
                  levels->>''l1_name'' l1_name,
                  levels->>''l2_name'' l2_name,
                  levels->>''l3_name'' l3_name,
 				levels->>''channel'' channel,
                  attribute_value->>''choice_name'' as choice_name,
                  attribute_value->>''style_no'' as style_number,
                  attribute_value->>''style_name'' as style_name,
                  attribute_value->>''color_name'' as color_name,
					attribute_value->>''article_number'' as article_number,
                  avg((attribute_value->>''st'')::float8) st,
                  avg(COALESCE((attribute_value->>''aur'')::float8, 0)) aur,
                  avg(COALESCE((attribute_value->>''total_qty'')::float8, 0) * (100 - (attribute_value->>''st'')::float8))/100 as bop_qty,
  				sum((attribute_value->>''forecasted_qty'')::float8) forecasted_qty
              from
                  assort_smart.plan_wedge_opt_master wdg
              join jsonb_each_text(attribute_value) d on
                  true
              ' || ' ' ||_where || ' ' ||''
               ' group by
                  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,12,13) as wedge_master
          join (
              select
                  plan_code, array_agg(levels) as levels, attribute_name, attribute_value
              from
                  assort_smart.plan_wedge_opt_attribute
              group by
                  1, 3, 4) wedge_attr on
              wedge_master.plan_code = wedge_attr.plan_code
          where
              wedge_master.key = wedge_attr.attribute_name
          group by 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15 ) as final_table
          order by l0_name, l1_name,l2_name,l3_name,
  		SUBSTRING(split_part(choice_name ,''choice_'', 2) FROM ''([0-9]+)'')::BIGINT ASC '
                      ;

         -- raise notice '%', '_query_combine';
          raise notice '%', _query_combine;
          return query execute _query_combine;

      end
  $function$
;
