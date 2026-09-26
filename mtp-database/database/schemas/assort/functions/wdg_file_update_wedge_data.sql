--liquibase formatted sql
--changeset sadhana.j:removed_drop_table_qry runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:liquibase_project_start
--comment: removed drop table query
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.wdg_file_update_wedge_data(input text, text[], text[]);

CREATE OR REPLACE FUNCTION assort.wdg_file_update_wedge_data(input text, text[], text[])
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
        Function/Procedure name: assort.wdg_file_update_wedge_data
        Created by: Sadhana J
        Created at: 11-Mar-2022
        No of input parameter: 3
        Parameter Description : $1 = text  wedge_temp_table_name, $2 = text[],
                                $3 = text[]

        Purpose: This function been created to update wedge data

        Calling Statement:

        select * from assort.wdg_file_update_wedge_data(
                'plan_wedge_temp_3_1676956781521398',
                '{"choice_name","style_id","color","product_price","total_qty","dropship_choice","carry_over_prev_season","lock_choice","style_name","color_name","style_des","style_no","actual_msrp","cost","flow_to_next_season","size","article_number","cluster_qty"}',
                '{"color", "product_price"}'
                )

        Updated_by Updated_on Purpose
        Sadhana J 11-03-2022: to update wedge data
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

      -- insert attribute into plan_wedge_opt_attribute
      for _attr_nm in select unnest($3::text[])
       loop
       	    --raise notice '%',_attr_nm;

       	   _query_combine := 'insert into assort.plan_wedge_opt_attribute  (plan_code, levels, attribute_name, attribute_value)
                                select final.plan_code, json_build_object(''l0_name'', final.l0_name, ''l1_name'', final.l1_name,
                                                        ''l2_name'', final.l2_name, ''l3_name'', final.l3_name) AS levels,
                             		final.attribute_name, final.attribute_value

                            from (
                                    select distinct plan_code, l0_name,l1_name,l2_name,l3_name, "drop",channel,sub_channel,
                                    '''||_attr_nm || ''' as attribute_name,
                                    ' || _attr_nm || ' as attribute_value
                                     from assort.'||$1||'
                                     where '|| _attr_nm ||' not in (select '|| _attr_nm ||' from assort.'||$1||' bb
                                                                    left join assort.plan_wedge_opt_attribute as aa
                                                                    on aa.plan_code = bb.plan_code
                                                                    where
                                                                     bb.l0_name = aa.levels->>''l0_name''
                                                                        and bb.l1_name = aa.levels->>''l1_name''
                                                                        and bb.l2_name = aa.levels->>''l2_name''
                                                                        and bb.l3_name = aa.levels->>''l3_name''
                                                                        and bb."drop" = aa.levels->>''drop''
                                                                        and bb.channel = aa.levels->>''channel''
                                                                        and bb.sub_channel = aa.levels->>''sub_channel''
                                                                        and '''||_attr_nm || ''' = aa.attribute_name
                                                                        and text(bb.'|| _attr_nm ||') = text(aa.attribute_value))
                                ) final
                            ';

	       	--raise notice '%',_query_combine;
			 execute _query_combine;
       end loop ;


        _attribute_value:= concat(_attribute_value, ' )' );
        --raise notice '_attribute_value=%', _attribute_value;

        _query_combine := 'update assort.plan_wedge_opt_master  as pw
                                    set attribute_value = pw.attribute_value::jsonb || pt.attribute_value::jsonb
                                    from (
                                        SELECT
										plan_wedge_opt_id,
                                        REGEXP_REPLACE(COALESCE(plan_code::character varying, ''0''), ''[^0-9]*'' ,''0'')::integer  as plan_code,
                                        l0_name,
                                        l1_name,cluster_code,
                                         l2_name,  l3_name,"drop", flow, choice_name,
                                        '|| _attribute_value ||' AS attribute_value
                                        FROM assort.'||$1||'
                                    ) as pt
                                    where pw.plan_wedge_opt_id = pt.plan_wedge_opt_id
                                     ';

        --raise notice '%', _query_combine;
        execute _query_combine;

    end
$function$
;
