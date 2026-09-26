--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_upload_strategy_sku_store_mapping_4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_upload_strategy_sku_store_mapping_4

DROP FUNCTION if exists price_markdown.fn_upload_strategy_sku_store_mapping;
CREATE OR REPLACE FUNCTION price_markdown.fn_upload_strategy_sku_store_mapping(
    p_strategy_id integer,
    p_product_store_mapping text[],
    p_delimiter varchar,
    p_include_inactive int,
    p_user_id int
    )
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
	declare
        _strategy_object price_markdown.tb_strategy_master%ROWTYPE;
        _sku_store_record_object RECORD;
	begin

    select * into _strategy_object from price_markdown.tb_strategy_master
    where strategy_id = p_strategy_id;

    with user_sku_stores as (
        select
            split_part(sku_store_mapping,p_delimiter,1) || '_'
            || split_part(sku_store_mapping,p_delimiter,2) || '_'
            || split_part(sku_store_mapping,p_delimiter,3) as product_cuq,
            split_part(sku_store_mapping,p_delimiter,4) as store_id
        from
            unnest(p_product_store_mapping) sku_store_mapping
    )
    select
        jsonb_agg(
            jsonb_build_object(
                'product_id',pm.product_id,
                'store_id',sm.store_id
            )
        ) as sku_store_mapping,
        array_agg(pm.product_id) as product_ids,
        array_agg(sm.store_id) as store_ids
    from
        user_sku_stores as ss
        inner join price_markdown.product_master pm on pm.product_cuq = ss.product_cuq
        inner join price_markdown.tb_store_master sm on sm.store_id :: text = ss.store_id
    where pm.is_active in (1,p_include_inactive)
    and pm.clearance_indicator = 0
    and pm.clearance_eligible = 1
    and sm.is_active = 1
    into _sku_store_record_object;

    return price_markdown.fn_v1_edit_strategy_step_1(
        p_strategy_id,
        _strategy_object.strategy_name,
        _strategy_object.strategy_comment,
        _strategy_object.start_date,
        _strategy_object.end_date,
        _sku_store_record_object.product_ids,
        _sku_store_record_object.store_ids,
        false,
        _sku_store_record_object.sku_store_mapping,
        null::jsonb,
        _strategy_object.calendar_config_id,
        p_user_id,
        true,
        array[]::int[],
        array[]::int[],
        _strategy_object.allow_only_with_inv
    );

	END;
$function$
;