--liquibase formatted sql
--changeset liquibase:map_colorway_details_into_wedge runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for map_colorway_details_into_wedge
--rollback: SELECT 1
DROP FUNCTION IF EXISTS assort.map_colorway_details_into_wedge(input integer, text[], text[]);
CREATE OR REPLACE FUNCTION assort.map_colorway_details_into_wedge(input integer, text[], text[])
 RETURNS void
 LANGUAGE plpgsql
AS $function$

/*
Function/Procedure name:assort.map_colorway_details_into_wedge
Created by: Sadhana
Created at: 26-Aug-2022
No of input parameter: 2
Parameter Description : $1 = Plan code , $2 = list, $3 = list

Purpose: This function been created to map carryover colorway details into omni-wedge n wedge table

Calling Statement:

select * from assort.map_colorway_details_into_wedge(199,
'{"parent_style", "style_no", "style_des", "subclass", "suggested_size_range", "style_name", "size", "merchant_pyramid", "selling_collection", "actual_msrp", "msrp"}',
'{"color_code", "color_name", "colorway_name", "season_launch_date", "new_carry_over_season"}');

Sadhana:getting Receipt Drawer list
*/

declare

_query_combine text;
_attribute_value text;
_attr_name text;
_query_product_color text;
_product_id text;
_product_season_id text;
_colorway_season_id text;
_colorway_id text;
_query_update_color text;
_query_update_product text;
_val text;
_attr_product text;
_attr_color text;
_product_deatils jsonb;
_color_details jsonb;
_omni_levels jsonb;
_omni_season_code text;
_l0_name text;
_l1_name text;
_l2_name text;
_query_block_choice_update text;



    begin

        select source_levels, attribute_value->>'season_code' season_code into _omni_levels, _omni_season_code
        from assort.plan_omni_wedge_opt_master
							where source_plan_code =  $1
						limit 1;

		_l0_name:=_omni_levels->>'l0_name';
		_l1_name:=_omni_levels->>'l1_name';
		_l2_name:=_omni_levels->>'l2_name';

		raise notice '_query_block_choice_update= %',_query_block_choice_update;
		--raise notice '0-2 _omni_season_code= %',_omni_season_code;

        _query_product_color:= 'select p_ps.product_id,
                                    p_ps.product_season_id ,
                                    c_cs.colorway_season_id,
                                    c_cs.colorway_id,
                                    p_ps.p_attribute_value::jsonb || p_ps.ps_attribute_value::jsonb product_deatils,
                                    c_cs.cws_attribute_value::jsonb || c_cs.cw_attribute_value::jsonb  as colorway_details
                                    from (select  p.product_id ,ps.product_season_id, p.p_attribute_value,
                                            ps.ps_attribute_value
                                            from (SELECT style_color_size_season_code as product_id, attribute_value  as p_attribute_value  FROM "global".style_color_size_season_master
                                                    where level in ( ''Product'')
                                                    and attribute_value->>''l0_name'' = '''||_l0_name|| '''
                                                    and attribute_value->>''l1_name'' = '''||_l1_name|| '''
                                                    and attribute_value->>''l2_name'' = '''||_l2_name|| ''') p
                                            join
                                                (SELECT style_color_size_season_code as product_season_id , attribute_value ps_attribute_value FROM "global".style_color_size_season_master
                                                    where level in ( ''ProductSeason'')
                                                    and attribute_value->>''season_code'' = '''||_omni_season_code||'''
                                                ) ps
                                                on ps.ps_attribute_value->>''product_id'' = p.p_attribute_value->>''product_id''
                                    ) p_ps
                                    join
                                    (select cs.colorway_season_id,
                                        c.colorway_id,
                                        cs.cws_attribute_value,
                                        c.cw_attribute_value
                                        from (SELECT style_color_size_season_code as colorway_season_id, attribute_value cws_attribute_value FROM "global".style_color_size_season_master mm
                                                where level in ( ''ColorwaySeason'')
                                                and attribute_value->>''season_code'' = '''||_omni_season_code||'''
                                                and attribute_value->>''new_carry_over_season'' = ''Carry-Over'') cs
                                         join
                                        (SELECT style_color_size_season_code as colorway_id,  attribute_value as cw_attribute_value  FROM "global".style_color_size_season_master
                                                where level in ( ''Colorway'')
                                        ) c
                                        on cs.cws_attribute_value->>''colorway_id'' = c.cw_attribute_value->>''colorway_id''
                                    ) c_cs
                                    on p_ps.p_attribute_value->>''product_id'' = c_cs.cws_attribute_value->>''product_id'' ';

    --raise notice '0-3 _query_product_color= %',_query_product_color;
    -- run query n save result into data
	for _product_id, _product_season_id, _colorway_season_id, _colorway_id, _product_deatils, _color_details   in execute _query_product_color
		Loop
			--raise notice '1 _product_deatils =%', _product_deatils;
		_attr_product:=null;
        _attr_color:=null;
	      -- prepare product attr json
	      for _attr_name in select unnest($2::text[])
	       loop
	       	--raise notice '2 _attr_name= %',_attr_name;
	            if (((_product_deatils->>_attr_name)::text) IS NOT NULL) and (((_product_deatils->>_attr_name)::text) != '') then
	            	--raise notice '2-1 val= %',((_product_deatils->>_attr_name)::text);
	            	_val:=(_product_deatils->>_attr_name)::text;
	            	--raise notice '2-1-1 val= %',_val;
	    	       	if _attr_product IS NULL then
	    	            _attr_product:=  ' jsonb_build_object( '''||_attr_name || ''', ''' || _val || ''' ';
	    	           --raise notice '2-2 _attr_product= %',_attr_product;
	    		    else
	    		        _attr_product:= concat(_attr_product, ', '''||_attr_name|| ''', ''' || _val || ''' ' );
	    		    end if;
	    		   --raise notice '3 _attr_product =%', _attr_product;
	            end if;
		       	--raise notice '%',_attr_product;
	       end loop ;

	       -- add ids
	       _attr_product:= concat(_attr_product, ', ''product_id'', ''' || _product_id || ''' ,''product_season_id'', ''' || _product_season_id || ''' ' );
	       _attr_product:= concat(_attr_product, ' )' );
	        --raise notice '_attr_product=%', _attr_product;


	       -- prepare color attr json
	      for _attr_name in select unnest($3::text[])
	       loop
	        --raise notice '%',_attr_name;

	            if _attr_color IS NULL then
	                _attr_color:=  (' json_build_object( '''||_attr_name || ''', ''' || ((_color_details->>_attr_name)::text) || ''' ')::text;
	            else
	                _attr_color:= concat(_attr_color, ', '''||_attr_name|| ''', ''' || ((_color_details->>_attr_name)::text) || ''' ' );
	            end if;
	            --raise notice '%',_attr_color;
	       end loop ;

	       _attr_color:= concat(_attr_color, ', ''colorway_id'', ''' || _colorway_id || ''' ,''colorway_season_id'', ''' || _colorway_season_id || ''' ' );
	        _attr_color:= concat(_attr_color, ' )' );
	        --raise notice '_attr_color=%', _attr_color;


	        -- OMNI WEDGE UPDATE
	        --
	        _query_update_color := 'update assort.plan_omni_wedge_opt_master  as pw
	                                    set attribute_value = pw.attribute_value::jsonb || '||_attr_color||'::jsonb
	                                    where pw.attribute_value->>''colorway_season_id'' = '''|| _colorway_season_id||'''
										and source_plan_code =  '||$1||'
	                            ' ;

	        raise notice '%', _query_update_color;
	        execute _query_update_color;

	        _query_update_product := 'update assort.plan_omni_wedge_opt_master  as pw
	                                    set attribute_value = pw.attribute_value::jsonb || '||_attr_product||'::jsonb
	                                    where source_plan_code =  '||$1||' and pw.attribute_value->>''global_style_number'' in (select attribute_value->>''global_style_number'' as  global_style_number
                                                                from assort.plan_omni_wedge_opt_master
                                                                where attribute_value->>''colorway_season_id'' = '''|| _colorway_season_id||'''
																	and source_plan_code =  '||$1||'
																)
	                            ' ;

	        raise notice '%', _query_update_product;
	        execute _query_update_product;


	        -- WEDGE UPDATE
	        _query_update_color := 'update assort.plan_wedge_opt_master  as pw
	                                    set attribute_value = pw.attribute_value::jsonb || '||_attr_color||'::jsonb
	                                    where pw.attribute_value->>''colorway_season_id'' = '''|| _colorway_season_id||'''
										and plan_code in (select destination_plan_code from assort.plan_omni_wedge_opt_master
								                                               where source_plan_code =  '||$1||')
	                            ' ;

	        raise notice '%', _query_update_color;
	        execute _query_update_color;

	        _query_update_product := 'update assort.plan_wedge_opt_master  as pw
	                                    set attribute_value = pw.attribute_value::jsonb || '||_attr_product||'::jsonb
	                                    where pw.attribute_value->>''style_id'' in (select attribute_value->>''style_id'' as  style_id
	                                                                                        from assort.plan_wedge_opt_master
	                                                                                        where attribute_value->>''colorway_season_id'' = '''|| _colorway_season_id||'''
																							and plan_code in (select destination_plan_code
								                                                                                        from assort.plan_omni_wedge_opt_master
								                                                                                        where source_plan_code =  '||$1||')
																				 )
										and plan_code in (select destination_plan_code from assort.plan_omni_wedge_opt_master
								                                               where source_plan_code =  '||$1||')
	                            ' ;

	        raise notice '%', _query_update_product;
	        execute _query_update_product;
	 end loop;

	-- omni update for block_choice
		_query_block_choice_update := 'update assort.plan_omni_wedge_opt_master
									set attribute_value= attribute_value::jsonb ||  ''{ "block_choice": true }''									where  source_plan_code= '||$1||'
									and attribute_value->>''colorway_season_id'' != ''''
									and attribute_value->>''colorway_season_id'' is not null
									and attribute_value->>''new_carry_over_season'' = ''Carry-Over''
									and attribute_value->>''block_choice'' != ''true''';

		raise notice '%', _query_block_choice_update;
		execute _query_block_choice_update;

	--wedge master update for block_choice
		_query_block_choice_update := 'update assort.plan_wedge_opt_master
										set attribute_value= attribute_value::jsonb || ''{ "block_choice": true }''
										where attribute_value->>''colorway_season_id''!= ''''
										and attribute_value->>''colorway_season_id'' is not null
										and attribute_value->>''block_choice'' != ''true''
										and attribute_value->>''new_carry_over_season'' = ''Carry-Over''
										and plan_code in (
										SELECT destination_plan_code
											FROM assort.plan_omni_wedge_opt_master
											where source_plan_code = '||$1|| '
										)';

		raise notice '%', _query_block_choice_update;

		execute _query_block_choice_update;

    end
$function$
;
