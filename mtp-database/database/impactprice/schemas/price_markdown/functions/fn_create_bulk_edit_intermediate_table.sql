--liquibase formatted sql
--changeset liquibase:vamsi.balaga@impactanalytics.co:fn_create_bulk_edit_intermediate_table runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for price_markdown.fn_create_bulk_edit_intermediate_table


DROP FUNCTION if exists price_markdown.fn_create_bulk_edit_intermediate_table;
CREATE OR REPLACE FUNCTION price_markdown.fn_create_bulk_edit_intermediate_table(
    p_strategy_id integer,
    p_pcd_wise_discounts text,
    p_prodouct_and_store_level_condition text,
    p_user_id int
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
    declare
        _query text;
	begin

        insert into price_markdown.tb_simulation_speed (strategy_id,user_id,discount_insertion_start)
        values (p_strategy_id,p_user_id,now())
        on conflict(strategy_id) do update
        set (discount_insertion_start, user_id, is_bulk_simulation) = (now(), p_user_id, true);

        execute format('drop table if exists price_markdown_temp.bulk_edit_temp_table_%1$s',p_strategy_id);

        _query = format('
            create unlogged table price_markdown_temp.bulk_edit_temp_table_%1$s as
            with pcd_discount_percentage_mapping as (
                select pcd_id,discount_percent,include_pcds from
                jsonb_to_recordset(''%2$s''::jsonb) as pcd_discounts(
                    pcd_id int,
                    discount_percent numeric,
                    include_pcds integer[]
                )
            )
            select
                %1$s as strategy_id,
                product_level_id,
                product_level_value,
                store_level_id,
                store_level_value,
                tsd.pcd_id,
                null::int as is_locked,
                pdpm.discount_percent,
                pdpm.include_pcds,
                approval_status
            from (
                select * from
                (
                    select product_level_id,product_level_value,store_level_id,store_level_value,pcd_id,markdown_percentage,approval_status
                    from (
                        select
                            dl.product_level_id,
                            prd.product_level_value::text as product_level_value,
                            dl.store_level_id,
                            srd.store_level_value::text as store_level_value,
                            (pcd_entry.value->>''pcd_id'')::int as pcd_id,
                            (pcd_entry.value->>''markdown_percentage'')::float8 as markdown_percentage,
                            (pcd_entry.value->>''approval_status'')::text as approval_status
                        from price_markdown.tb_strategy_discount_level_%1$s dl
                        cross join lateral jsonb_each(dl.pcd_data) as pcd_entry(key, value)
                        left join price_markdown.tb_strategy_product_reco_details prd on prd.product_level_id = dl.product_level_id
                        left join price_markdown.tb_strategy_store_reco_details srd on srd.store_level_id = dl.store_level_id
                        where dl.pcd_data is not null
                        and (pcd_entry.value->>''pcd_id'')::int in (select pcd_id from pcd_discount_percentage_mapping)
                    ) sd
                    where 1=1
                    %3$s
                    union all
                    select
                        product_level_id,
                        product_level_value,
                        store_level_id,
                        store_level_value,
                        pcd_id,
                        null::float8 as markdown_percentage,
                        ''Not Approved'' as approval_status
                    from (
                        select product_level_id,product_level_value,store_level_id,store_level_value
                        from price_markdown.tb_strategy_sku_store_mapping_%1$s
                        where not exists (
                            select 1 from price_markdown.tb_strategy_discount_level_%1$s where pcd_data is not null limit 1
                        )
                        %3$s
                        group by 1,2,3,4
                    ) ssm
                    cross join
                    (
                        select pcd_id from price_markdown.tb_strategy_pcd_new
                        where strategy_id = %1$s
                        and not exists (select 1 from price_markdown.tb_strategy_discount_level_%1$s where pcd_data is not null limit 1)
                        and pcd_id in (select pcd_id from pcd_discount_percentage_mapping)
                    ) sp
                ) s
            ) tsd
            left join
                pcd_discount_percentage_mapping pdpm on tsd.pcd_id = pdpm.pcd_id
        ',
        p_strategy_id,
        p_pcd_wise_discounts,
        p_prodouct_and_store_level_condition
        );

        raise notice '%',_query;


        execute _query;

	end;
$function$
;
