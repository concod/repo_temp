--liquibase formatted sql
--changeset harsh.singh:fn_update_product_group_promo runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: function to handle promo updates when product groups are modified

DROP FUNCTION IF EXISTS price_promo.fn_update_product_group_promo;

CREATE OR REPLACE FUNCTION price_promo.fn_update_product_group_promo(
    selected_promos integer[],
    edit_pg_id integer,
    new_pg_id integer,
    new_pg_name varchar,
    pg_updated_products integer[],
    p_user_id integer
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        start_time TIMESTAMP;
        end_time TIMESTAMP;
        p_promo_id integer;
        _query text;
        hierarchy_l_id int;
        _product_hierarchies_config jsonb;
        _product_hierarchy_ids_config jsonb;
        _pg_inclusion_promos int[];
        _pg_exclusion_promos int[];
        _ps_rules_record price_promo.ps_rules%ROWTYPE;
        _unselected_promos int[];
        _user_id integer;
    begin

        select 
            array_agg(pm.promo_id) into _pg_inclusion_promos 
        from 
            price_promo.promo_master pm
        inner join 
            price_promo.included_promo_product_groups ippg 
        on
            pm.promo_id = ippg.promo_id
            and ippg.product_group_id = edit_pg_id;

        raise notice 'pg_inclusion_promos: %',_pg_inclusion_promos;


        select array_agg(promo_id) into _unselected_promos
        from (
            select distinct promo_id
            from price_promo.included_promo_product_groups ippg
            where product_group_id = edit_pg_id and promo_id not in (select unnest(selected_promos))
        ) s;


        select 
            array_agg(pm.promo_id) into _pg_exclusion_promos 
        from 
            price_promo.promo_master pm
        inner join 
            price_promo.excluded_product_groups epg 
        on
            pm.promo_id = epg.promo_id
            and epg.pg_id = edit_pg_id;

        raise notice 'pg_exclusion_promos: %',_pg_exclusion_promos;

        raise notice 'updating effected promos %',array_length(selected_promos,1);
        if array_length(selected_promos,1) > 0 then
            start_time := clock_timestamp();
            raise notice 'updating effected promos';
            
            select config_value::jsonb into _product_hierarchies_config
            from price_promo.tb_tool_configurations
            where module = 'product' and config_name = 'hierarchy_filters';

            select jsonb_object_agg(
                value->>'id',
                value || jsonb_build_object('key',key)
            ) into _product_hierarchy_ids_config
            from jsonb_each(_product_hierarchies_config)
            where (value->>'id' is not null and value->>'id_column' != 'product_id');

            for p_promo_id in select unnest(selected_promos) as selected_promos_id
            loop
                if p_promo_id in (select unnest(_pg_inclusion_promos)) then
                    raise notice 'updating effected promo_id %',p_promo_id;
                    update price_promo.included_promo_product_groups set product_group_id = new_pg_id, product_group_name = new_pg_name
                    where promo_id = p_promo_id and product_group_id = edit_pg_id;

                    -- updating promo & excluded pg combination
                    update price_promo.excluded_product_groups set pg_id = new_pg_id, pg_name = new_pg_name
                    where promo_id = p_promo_id and pg_id = edit_pg_id;

                    raise notice 'updating promo & pg combination %',p_promo_id;
                    -- deleting edit product group id and insert the hierarchies with new pg id
                    delete from price_promo.included_promo_pg_hierarchy
                    where  promo_id = p_promo_id and product_group_id = edit_pg_id;
                    raise notice 'deleting edit product group id and insert the hierarchies with new pg id %',p_promo_id;

                    FOR hierarchy_l_id IN 
                        select distinct hierarchy_level 
                        from global.tb_pg_hierarchy tph
                        inner join jsonb_each(_product_hierarchy_ids_config) as config(key, value) 
                            on tph.hierarchy_level = (value->>'id')::integer
                        where tph.pg_id = new_pg_id 
                    LOOP
                        _query = format(' 
                            insert into price_promo.included_promo_pg_hierarchy
                            (promo_id, product_group_id, product_group_name, hierarchy_level_id, hierarchy_level_name, hierarchy_value_id, hierarchy_value_name)
                            select 
                                distinct
                                %1$s as promo_id,
                                %2$s as product_group_id,
                                tpg.pg_name as product_group_name,
                                %3$s::int as hierarchy_level_id,
                                ''%4$s'' as hierarchy_level_name,
                                pm.%5$s as hierarchy_value_id,
                                pm.%6$s as hierarchy_value_name
                            from global.tb_pg_hierarchy tph
                            left join global.tb_product_group tpg on tph.pg_id = tpg.pg_id
                            left join price_promo.fn_get_user_restricted_products(%8$L) as pm on tph.hierarchy_value = pm.%5$s
                            where tph.pg_id = %2$s 
                            and tph.hierarchy_level = %3$s
                            and pm.product_id = any(%7$L::int[])
                            and pm.%5$s is not null
                            ',
                            p_promo_id,
                            new_pg_id,
                            hierarchy_l_id,
                            _product_hierarchy_ids_config[hierarchy_l_id]->>'label',
                            _product_hierarchy_ids_config[hierarchy_l_id]->>'id_column',
                            _product_hierarchy_ids_config[hierarchy_l_id]->>'value_column',
                            pg_updated_products,
                            p_user_id
                        );

                        raise notice 'included promo pg hierarchy query: %', _query;
                        execute _query;
                    END LOOP;

                    drop table if exists tmp_delete_product_ids;
                    drop table if exists tmp_new_product_ids;
                    create temp table tmp_delete_product_ids on commit drop as (
                        select pp.product_id
                        from price_promo.included_products as pp
                        where pp.promo_id = p_promo_id
                            and pp.product_id not in (select product_id from unnest(pg_updated_products) product_id)
                    );
                    create temp table tmp_new_product_ids on commit drop as (
                        select p_promo_id,
                            pt.product_id,
                            pm.product_name
                        from (select unnest(pg_updated_products) as product_id) pt
                        left join price_promo.included_products as pp on pp.product_id = pt.product_id
                        join price_promo.fn_get_user_restricted_products(p_user_id) as pm on pm.product_id = pt.product_id
                        where pp.promo_id = p_promo_id
                        and pp.product_id is null
                    );
                    raise notice 'promo_hierarchy insert hierarchy %',p_promo_id;

                    delete from price_promo.included_products
                    where promo_id = p_promo_id
                    and product_id in (select product_id from tmp_delete_product_ids);

                    insert into price_promo.included_products (promo_id, product_id, product_name)
                    select * from tmp_new_product_ids;

                    raise notice 'delete and insert in included_products %',p_promo_id;

                elsif p_promo_id in (select unnest(_pg_exclusion_promos)) then
                    update price_promo.excluded_product_groups set pg_id = new_pg_id, pg_name = new_pg_name
                    where promo_id = p_promo_id and pg_id = edit_pg_id;
                end if;

                _user_id = (select created_by from price_promo.promo_master where promo_id = p_promo_id);

                perform price_promo.fn_save_promo_final_hierarchy(p_promo_id, _user_id);
                perform price_promo.fn_save_promo_final_products(p_promo_id, _user_id);

                update price_promo.promo_master
                set step_count = case when price_promo.ps_rules.discount_level != -200 then 1 else price_promo.promo_master.step_count end,
                    status = 0,
                    products_count = (select count(product_id) from price_promo.promo_product where promo_id = p_promo_id)
                from price_promo.ps_rules
                where price_promo.promo_master.promo_id = p_promo_id;
                raise notice 'step_count update %',p_promo_id;

            end loop;
            perform price_promo.fn_delete_promo_metrics_and_update_status(selected_promos);
            end_time := clock_timestamp();
            raise notice 'time taken to update effected promos: %',end_time - start_time;
        end if;



        
        for p_promo_id in select unnest(_unselected_promos)
        loop
            select * into _ps_rules_record from price_promo.ps_rules where promo_id = p_promo_id;
            if _ps_rules_record.product_discount_level = array[-100] then
                update price_promo.tb_promo_product_reco_details
                set 
                    product_level_value = product_level_value ||
                        jsonb_build_object('pg_name', (select pg_name from global.tb_product_group where pg_id = edit_pg_id))
                where 
                    promo_id = p_promo_id
                    and product_level_value->>'pg_id' = edit_pg_id::text
                ;

                raise notice '%',format(' 
                    update price_promo.tb_promo_product_reco_details 
                    set 
                        product_level_value = product_level_value ||
                            jsonb_build_object(''pg_name'', (select pg_name from global.tb_product_group where pg_id = %2$s))
                    where 
                        promo_id = %1$s
                        and product_level_value->>''pg_id'' = %2$s;
                    ',
                    p_promo_id,
                    edit_pg_id
                );

            end if;
        end loop;
    end;
$function$
; 