--liquibase formatted sql
--changeset hemanth.cs@impactanalytics.co:assort_smart.get_finalize_po_sheet_details liquibase:get_finalize_po_sheet_details runOnChange:true stripComments:false splitStatements:false context:style_name_added labels:liquibase_project_start
--comment: initial changeset for get_finalize_po_sheet_details
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort_smart.get_finalize_po_sheet_details(input jsonb);
CREATE OR REPLACE FUNCTION assort_smart.get_finalize_po_sheet_details(input jsonb)
 RETURNS TABLE(choice_name text, style text, article_number text, launch_date text,style_name text, attributes jsonb, l0_name text, l1_name text, l2_name text, l3_name text, launch text, cost double precision)
 LANGUAGE plpgsql
AS $function$
/*
Function/Procedure name: assort_smart.get_finalize_po_sheet_details
Created by: Hemant Kumar Singh
Created at: 31-Mar-2022
No of input parameter: 1
Parameter Description : $1 = json

Purpose: This function been created to get finalize po sheet details list

Calling Statement:
SELECT assort_smart.get_finalize_po_sheet_details('{"filters":[{"attribute_name":"plan_code","value":[818],"operator":"in"},{"attribute_name":"launch","prefix":"levels","operator":"in","value":["-"]}]}');

Hemant Kumar SIngh: getting finalize po sheet details
*/
 declare
 	_query_combine text;
 	_where text;
 	_input_data jsonb;
 	_filter_data jsonb;
 	begin
 		_where:=null;
 		_input_data:= $1::jsonb;
 		_filter_data:=(_input_data->>'filters')::jsonb;
 
     	-- prepare where clause
         _where:=(select * from assort_smart.prepare_where_clause_from_json_filters(_filter_data) );

			  	_query_combine := ' select sizes.choice_name,sizes.style_des as style,sizes.article_number,sizes.launch_date,sizes.style_name,sizes.attributes,sizes.l0_name,sizes.l1_name,sizes.l2_name,sizes.l3_name,sizes.launch,coalesce(wedge.cost,0) from
					(select  choice_name,launch_date,l0_name, l1_name,l2_name,l3_name,launch,stores, style_des,article_number,style_name, jsonb_object_agg(key, sum) as attributes
					from (
						    select 
						    concat("attributes"->>''choice_name'') as choice_name,
						    "attributes"->>''stores'' as stores,
						    "attributes"->>''style_des'' as style_des,
						    "attributes"->>''article_number'' as article_number,
						    "attributes"->>''launch_date'' as launch_date,
							"attributes"->>''style_name'' as style_name,
						    levels->> ''l0_name'' as l0_name,
						    levels->> ''l1_name'' as l1_name,
						    levels->> ''l2_name'' as l2_name, 
						    levels->> ''l3_name'' as l3_name,
						    levels->> ''launch'' as launch,
						    key, sum(value::float)
						    from assort_smart.plan_finalize_size_master 
						    cross join jsonb_each_text("attributes")
						     ' || ' ' ||_where || ' ' ||'' 
						   ' and key not like ''choice_%'' and key not like ''store%''
						    and key not like ''style_des''
						    and key not like ''article_number''
						    and key not like ''launch_date''
							and key not like ''style_number''
							and key not like ''style_id''
							and key not like ''style_name''
						    group by  "attributes"->>''choice_name'', key, "attributes"->>''stores'', levels->> ''l0_name'',
						    levels->> ''l1_name'', levels->> ''l2_name'', levels->> ''l3_name'',"attributes"->>''style_des'',
						    "attributes"->>''article_number'',levels->> ''launch'',"attributes"->>''launch_date'',"attributes"->>''style_name''
						    ) size_master 
						    group by choice_name, stores, l0_name,l1_name,l2_name,l3_name,launch, style_des,article_number,launch_date,style_name
						    order by SUBSTRING(choice_name FROM ''([0-9]+)'')::BIGINT ASC, choice_name) as sizes
						    join (
						    select distinct("attribute_value"->>''choice_name'') as choice_name,
						    avg(cast(CASE
						    when (attribute_value->>''cost'' IS NULL OR coalesce(attribute_value->>''cost'', '''') = '''') THEN null
						    ELSE attribute_value->>''cost'' end as Float)) as cost,
						    levels->> ''l0_name'' as l0_name, levels->> ''l1_name'' as l1_name, levels->> ''l2_name'' as l2_name,
						    levels->> ''l3_name'' as l3_name
						    from assort_smart.plan_wedge_opt_master   
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
