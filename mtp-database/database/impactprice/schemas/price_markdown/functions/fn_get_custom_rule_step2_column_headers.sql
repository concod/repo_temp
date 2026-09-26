--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_custom_rule_step2_column_headers runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_get_custom_rule_step2_column_headers
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_get_custom_rule_step2_column_headers;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_custom_rule_step2_column_headers(_rule_id integer, _rule_name text, _product_reco_lev integer, _store_reco_lev integer)
 RETURNS jsonb
	LANGUAGE plpgsql
AS $function$
	DECLARE
		query text:= '';
		temp_query text;
		dummy_query text:= 'select jsonb_build_object() as final_response';
		final_query text;
		rc record;
		final_response json;
	BEGIN
		if _rule_id is not null then
			temp_query = 'select tasm.name, trm.rule_product_level, trm.rule_store_level from price_markdown.tb_rule_master trm inner join metaschema.tb_app_sub_master tasm on trm.rule_type = tasm.id where trm.rule_id = ' || _rule_id::text;
	   		execute temp_query into rc;
	   		_rule_name = rc.name;
	   		_product_reco_lev = rc.rule_product_level;
	   		_store_reco_lev = rc.rule_store_level;
	   		--raise notice 'data : %, %', _rule_name, _product_reco_lev;
		end if;
		if _store_reco_lev is null then
			_store_reco_lev = -200;
		end if;
		final_query = format('  with meta_cte as (
								    select id as rule_type from metaschema.tb_app_sub_master where name = ''%1$s''
								),
								column_names_cte as(
									select
										column_name as column_names,
										display_order
									from
										(
											(select display_name as column_name, 0 as display_order from price_markdown.tb_view_by_config tvbc where tvbc.category = ''product_level'' and tvbc.value = %2$s)
											union
											(select display_name as column_name, 1 as display_order from price_markdown.tb_view_by_config tvbc where tvbc.category = ''store_level'' and tvbc.value = %3$s)
											union
											(select
												case
													when enable_min_value = 1 and rule_type_id = 42 then ''Min Discount''
													when enable_min_value = 1 and rule_type_id = 43 then ''Min Step Size''
													when enable_min_value = 1 and rule_type_id = 45 then ''Min No Of Markdowns''
													when enable_min_value = 1 and rule_type_id = 46 then ''Min MD Frequency''
													else NULL
												end as column_name,
												2 as display_order
											 from
												price_markdown.tb_rule_config trc
											 where
												trc.rule_type_id = (select rule_type from meta_cte)
											)
											union
											(select
												case
													when enable_max_value = 1 and rule_type_id = 42 then ''Max Discount''
													when enable_max_value = 1 and rule_type_id = 43 then ''Max Step Size''
													when enable_max_value = 1 and rule_type_id = 45 then ''Max No Of Markdowns''
													when enable_max_value = 1 and rule_type_id = 46 then ''Max MD Frequency''
													else NULL
												end as column_name,
												3 as display_order
											 from
												price_markdown.tb_rule_config trc
											 where
												trc.rule_type_id = (select rule_type from meta_cte)
											)
											union
											(select
												case
													when enable_applicable_value = 1 then ''Applicable Discount''
												end as  column_name,
												4 as display_order
											 from
												price_markdown.tb_rule_config trc
											 where
												trc.rule_type_id = (select rule_type from meta_cte)
											)
										)dd
									where
										dd.column_name is not null
									order by
										dd.display_order
								)
								select
									json_agg(jsonb_build_object(
															''header'', column_names,
															''key'', case
																		when display_order = 0 and  column_names in(''Overall'', ''Product Group'', ''Division'', ''Department'', ''Class'' ,''Sub Class'', ''SKU'') then ''product_level_value''
																		when display_order = 1 and  column_names in(''All Stores'', ''Store Group'', ''Country'', ''Region'', ''State'' , ''District'' ,''City'', ''Store'') then ''store_level_value''
																		when column_names in(''Min Discount'', ''Min Step Size'', ''Min No Of Markdowns'', ''Min MD Frequency'') then ''min_value''
																		when column_names in(''Max Discount'', ''Max Step Size'', ''Max No Of Markdowns'', ''Max MD Frequency'') then ''max_value''
																		when column_names = ''Applicable Discount'' then ''applicable_value''
																		else NULL
																	 end
														  )) as  final_response
								from
									column_names_cte  ', _rule_name, _product_reco_lev, _store_reco_lev);
		--raise notice 'final_query : %', final_query;
		execute final_query into final_response;
		return final_response;
  end;
$function$
;