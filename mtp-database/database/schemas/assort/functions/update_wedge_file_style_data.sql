--liquibase formatted sql
--changeset sadhana.jaiswal:added_drop runOnChange:true stripComments:false splitStatements:false context:MTP-38135 labels:liquibase_project_start
--comment: added drop for wedge style-color data.
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.update_wdg_style_file_data(input text, text[]);

CREATE OR REPLACE FUNCTION assort.update_wdg_style_file_data(input text, text[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$

declare

_query_combine text;
_attribute_value text;
_attr_name text;
_attr_nm text;

    begin
        /*
        Function/Procedure name: assort.update_wdg_style_file_data
        Created by: Sadhana J
        Created at: 4-Mar-2024
        No of input parameter: 2
        Parameter Description : $1 = text  wedge_temp_table_name, $2 = text[]

        Purpose: This function been created to update wedge data

        Calling Statement:

        select * from assort.update_wdg_style_file_data(
                'plan_wedge_temp_3_1676956781521398',
                '{"style_name","color_name","style_des","style_no"}'
                )

        Updated_by Updated_on Purpose
        Sadhana J 4-03-2024: to update wedge data
        */

        _attribute_value:=null;

      for _attr_name in select unnest($2::text[])
       loop
       	--raise notice '%',_attr_name;

	       	if _attribute_value IS NULL then
	            _attribute_value:=  (' json_build_object( '''||_attr_name || ''', ' || _attr_name || ' ')::text;
		    else
		        _attribute_value:= concat(_attribute_value, ', '''||_attr_name|| ''', ' || _attr_name || ' ' );
		    end if;
	       	--raise notice '%',_attribute_value;

       end loop ;


        _attribute_value:= concat(_attribute_value, ' )' );
        --raise notice '_attribute_value=%', _attribute_value;

        _query_combine := 'update assort.plan_wedge_opt_master  as pw
                                    set attribute_value = pw.attribute_value::jsonb || pt.attribute_value::jsonb
                                    from (
                                        SELECT
                                        REGEXP_REPLACE(COALESCE(plan_code::character varying, ''0''), ''[^0-9]*'' ,''0'')::integer  as plan_code,
                                        l0_name,
                                        l1_name,
                                        l2_name,  
                                        l3_name,
                                        choice_name, 
                                        channel,
                                        drop,
                                        '|| _attribute_value ||' AS attribute_value
                                        FROM assort.'||$1||'
                                    ) as pt
                                    where pw.plan_code = pt.plan_code
                                    and pw.levels->>''l0_name'' = pt.l0_name
                                    and pw.levels->>''l1_name'' = pt.l1_name
                                    and pw.levels->>''l2_name'' = pt.l2_name
                                    and pw.levels->>''l3_name'' = pt.l3_name
                                    and pw.attribute_value->>''choice_name'' = pt.choice_name
                                    and pw.levels->>''channel'' = pt.channel
                                    and pw.levels->>''drop'' = pt.drop
                                     ';

        --raise notice '%', _query_combine;
        execute _query_combine;

    end
$function$
;