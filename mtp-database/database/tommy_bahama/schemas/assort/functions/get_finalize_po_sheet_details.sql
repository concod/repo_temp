--liquibase formatted sql
--changeset mohammed.ayaz@impactanalytics.co:get_finalize_po_sheet_details,fix_data_ordering  runOnChange:true stripComments:false splitStatements:false context:MTP-44708, style_no rename, fix_data_ordering labels:liquibase_project_start, style_no_field_update, style_no field rename, add style_desc
--comment:  style_no field rename, add style_desc, fix the ordering of data
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.get_finalize_po_sheet_details(input jsonb);
CREATE OR REPLACE FUNCTION assort.get_finalize_po_sheet_details(input jsonb)
 RETURNS TABLE(choice_name text, style_number text, style_des text, article_number text, launch_date text, attributes jsonb, l0_name text, l1_name text, l2_name text, l3_name text, drop text, cost double precision)
 LANGUAGE plpgsql
AS $function$
declare
_query_combine text;
_input_json json ;
_attribute_name text;
_operator text;
_prefix text;
_value text;
_where text;
/*
Function/Procedure name: assort.get_finalize_po_sheet_details
Created by: Hemant Kumar Singh
Created at: 31-Mar-2022
No of input parameter: 1
Parameter Description : $1 = json

Purpose: This function been created to get finalize po sheet details list

Calling Statement:
SELECT assort.get_finalize_po_sheet_details('{"filters":[{"attribute_name":"plan_code","value":[818],"operator":"in"},{"attribute_name":"drop","prefix":"levels","operator":"in","value":["-"]}]}');

Hemant Kumar SIngh: getting finalize po sheet details
*/

    begin
    	_where:=null;

	    for _input_json in select json_array_elements(value::json) input_json from 
            (select value from jsonb_each_text($1::jsonb)) x
            
        loop
        	
        	raise notice ' value: %', _input_json;
            
            _attribute_name = _input_json->>'attribute_name';
			raise notice 'attribute_name %',_attribute_name;
		
			_operator = _input_json->>'operator';
			raise notice 'operator %',_operator;
			
			_value = _input_json->>'value';
			_value:= REPLACE(_value, '"', '''' );
			raise notice 'value %',_value;
			
			if _operator = 'in' then
				_value:= REPLACE(_value, '[', '(' );
				_value:= REPLACE(_value, ']', ')' );
			end if;

			if (_input_json->>'prefix') IS NOT null then
	     		_prefix = _input_json->>'prefix';
	     		
	     	else
	     		_prefix:=null;
	     		
	     	end if;

	     	raise notice 'prefix %',_prefix;

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

			raise notice 'where  %',_where;
		
      	end loop; 

				_query_combine := ' select sizes.choice_name,sizes.style_number, sizes.style_des, sizes.article_number,sizes.launch_date,sizes.attributes,sizes.l0_name,sizes.l1_name,sizes.l2_name,sizes.l3_name,sizes.drop,wedge.cost from
					(select  choice_name,launch_date,l0_name, l1_name,l2_name,l3_name,drop,stores, style_des, style_number,article_number, jsonb_object_agg(key, sum) as attributes
					from (
						    select 
						    concat("attributes"->>''choice_name'') as choice_name,
						    "attributes"->>''stores'' as stores,
						    "attributes"->>''style_des'' as style_des,
						    "attributes"->>''article_number'' as article_number,
							"attributes"->>''style_number'' as style_number,
						    "attributes"->>''launch_date'' as launch_date,
						    levels->> ''l0_name'' as l0_name,
						    levels->> ''l1_name'' as l1_name,
						    levels->> ''l2_name'' as l2_name, 
						    levels->> ''l3_name'' as l3_name,
						    levels->> ''drop'' as drop,
						    key, sum(value::float)
						    from assort.plan_finalize_size_master 
						    cross join jsonb_each_text("attributes")
						     ' || ' ' ||_where || ' ' ||'' 
						   ' and key not like ''choice_%'' and key not like ''store%''
						    and key not like ''style_des''
						    and key not like ''article_number''
						    and key not like ''launch_date''
							and key not like ''style_number''
						    group by  "attributes"->>''choice_name'', key, "attributes"->>''stores'', levels->> ''l0_name'',
						    levels->> ''l1_name'', levels->> ''l2_name'', levels->> ''l3_name'',"attributes"->>''style_des'',
							"attributes"->> ''style_number'',"attributes"->>''article_number'',levels->> ''drop'',"attributes"->>''launch_date''
						    ) size_master 
						    group by choice_name, stores, l0_name,l1_name,l2_name,l3_name,drop, style_des,style_number,article_number,launch_date
						    order by SUBSTRING(choice_name FROM ''([0-9]+)'')::BIGINT ASC, choice_name) as sizes
						    join (
						    select distinct("attribute_value"->>''choice_name'') as choice_name,
						    avg(cast(CASE
						    when (attribute_value->>''cost'' IS NULL OR coalesce(attribute_value->>''cost'', '''') = '''') THEN null
						    ELSE attribute_value->>''cost'' end as Float)) as cost,
						    levels->> ''l0_name'' as l0_name, levels->> ''l1_name'' as l1_name, levels->> ''l2_name'' as l2_name,
						    levels->> ''l3_name'' as l3_name
						    from assort.plan_wedge_opt_master   
						    ' || ' ' ||_where || ' ' ||'' 
						    ' group by choice_name,l0_name,l1_name,l2_name,l3_name
						) wedge on sizes.choice_name = wedge.choice_name and sizes.l0_name = wedge.l0_name
						and sizes.l1_name = wedge.l1_name and sizes.l2_name = wedge.l2_name
						and sizes.l3_name = wedge.l3_name '
                    ;

       -- raise notice '%', '_query_combine';
        raise notice '%', _query_combine;
        return query execute _query_combine;
       
    end
$function$
;
