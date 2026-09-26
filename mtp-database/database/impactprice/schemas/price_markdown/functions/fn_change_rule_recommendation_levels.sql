--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_change_rule_recommendation_levels runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: pg new price_markdown.fn_change_rule_recommendation_levels
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_change_rule_recommendation_levels;
CREATE OR REPLACE FUNCTION price_markdown.fn_change_rule_recommendation_levels(p_rule_id integer, p_product_level integer, p_store_level integer)
 RETURNS json
	LANGUAGE plpgsql
AS $function$
	declare
        _product_level_id_column varchar;
        _product_level_name_column varchar;
        _store_level_name_column varchar;
		_store_level_id_column varchar;
		_product_join_string text;
		_store_join_string text;
		_query text;
        enable_applicable_count int;
        _discounts_columns text;
        _discounts_aggregate_columns text;
       _final_response json;
	begin

        if p_product_level = -200 THEN
            _product_level_id_column = ' -200 as product_level_id ';
            _product_level_name_column = ' ''Overall''::character varying as product_level_value ';
            _product_join_string = '';

        elsif p_product_level = -100 THEN
            _product_level_id_column = ' tpgp.pg_id as product_level_id ';
            _product_level_name_column = ' tpg.pg_name as product_level_value ';
            _product_join_string = format('
                    inner join price_markdown.tb_pg_product tpgp on tpgp.product_h5_id = trssm.product_h5_id
                    inner join price_markdown.tb_product_group tpg on tpg.pg_id = tpgp.pg_id
                    inner join price_markdown.tb_rule_product_groups trpg on trpg.product_group_id = tpg.pg_id
						and trpg.rule_id = %1$s
                ',p_rule_id);
        else
            _product_level_id_column = format('pm.product_h%s_id::int as product_level_id ',p_product_level);
            _product_level_name_column = format('pm.product_h%s_name as product_level_value ',p_product_level);
            _product_join_string = ' inner join pricesmart.product_master pm on pm.product_h5_id = trssm.product_h5_id ';
        end if;

        if p_store_level = -200 THEN
            _store_level_id_column = ' -200 as store_level_id ';
            _store_level_name_column = ' ''Overall''::character varying as store_level_value ';
            _store_join_string = '';

        elsif p_store_level = -100 THEN
            _store_level_id_column = ' tsgs.sg_id as store_level_id ';
            _store_level_name_column = ' tsg.sg_name as store_level_value ';
            _store_join_string = format('
                    inner join price_markdown.tb_sg_store tsgs on tsgs.store_h6_id = trssm.store_h6_id
                    inner join price_markdown.tb_store_group tsg on tsg.sg_id = tsgs.sg_id
                    inner join price_markdown.tb_rule_store_groups trsg on trsg.store_group_id = tsg.sg_id
						and trsg.rule_id = %1$s
                ',p_rule_id);
        else
            _store_level_id_column = format('sm.store_h%s_id as store_level_id ',p_store_level);
            _store_level_name_column = format('sm.store_h%s_name as store_level_value ',p_store_level);
            _store_join_string = ' inner join public.store_master sm on sm.store_h6_id = trssm.store_h6_id ';
        end if;

        select count(*) into enable_applicable_count
        from price_markdown.tb_rule_master trm
        inner join
       	price_markdown.tb_rule_config trc on trm.rule_type = trc.rule_type_id
       	where trm.rule_id = p_rule_id and trc.enable_applicable_value = 1;

        if enable_applicable_count > 0 THEN
            _discounts_columns = '''applicable_value'',applicable_value';
	        _discounts_aggregate_columns = 'max(tsd.applicable_value) as applicable_value';

        else
            _discounts_columns = '''min_value'',min_value,''max_value'',max_value';
            _discounts_aggregate_columns = '
					case when tasm.name in (''min_max_percent'',''step_size_percent'',''first_markdown_percent'') then (round(avg(tsd.min_value)/5.0)*5)::numeric
					else min(tsd.min_value) end as min_value,
					case when tasm.name in (''min_max_percent'',''step_size_percent'',''first_markdown_percent'') then (round(avg(tsd.max_value)/5.0)*5)::numeric
					else min(tsd.max_value) end as max_value
				';

        end if ;


        _query := format('
            select jsonb_agg(json_build_object(
                ''row_id'', row_id,
                ''product_level_id'', product_level_id,
                ''store_level_id'', store_level_id,
                ''product_level_value'', product_level_value,
                ''store_level_value'', store_level_value,
                %5$s
            )) as final_response
            from (
                select %1$s,%6$s,row_number() over () as row_id
                from
				price_markdown.tb_rule_master trm inner join
				metaschema.tb_app_sub_master tasm on tasm.id = trm.rule_type
				inner join
				price_markdown.tb_rule_discount tsd on trm.rule_id = tsd.rule_id
                inner join price_markdown.tb_rule_sku_store_mapping trssm
                on tsd.rule_id = trssm.rule_id and tsd.product_level_id = trssm.product_level_id and tsd.store_level_id = trssm.store_level_id
                %3$s
                %4$s
                where tsd.rule_id = %2$s
                group by 1,2,3,4,tasm.name
            ) s
            ',
            array_to_string(array[_product_level_id_column,_store_level_id_column,_product_level_name_column,_store_level_name_column]::text[],','),
            p_rule_id,
            _product_join_string,
            _store_join_string,
            _discounts_columns,
            _discounts_aggregate_columns
        );

       	raise notice 'query: %',_query;

        execute _query into _final_response;

       	return _final_response;

    end;
$function$
;