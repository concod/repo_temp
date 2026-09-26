--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_split_ready_for_submission_promos runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: Function to split Ready for Submission promos based on Offer Type and Product Hierarchy

DROP FUNCTION IF EXISTS price_promo.fn_split_ready_for_submission_promos;
CREATE OR REPLACE FUNCTION price_promo.fn_split_ready_for_submission_promos(p_promo_ids integer[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
    promo_rec RECORD;
    product_group_rec RECORD;
    new_promo_id_var INTEGER;
    splitting_config JSONB;
    new_name TEXT;

    -- Configuration values extracted from splitting_config
    consumables_id_columns TEXT[];
    non_consumables_id_columns TEXT[];

    _query TEXT;
    _start_time TIMESTAMP;
BEGIN

    splitting_config := price_promo.fn_get_configuration_value('promo', 'promo_splitting_hierarchy_config');

    consumables_id_columns := ARRAY(SELECT jsonb_array_elements_text(splitting_config->'consumables'->'grouping_columns'));
    non_consumables_id_columns := ARRAY(SELECT jsonb_array_elements_text(splitting_config->'non_consumables'->'grouping_columns'));

    RAISE NOTICE 'Consumables grouping key: %', consumables_id_columns;
    RAISE NOTICE 'Non-consumables grouping key: %', non_consumables_id_columns;

    -- Loop through all Ready for Submission promos
    FOR promo_rec IN
        SELECT 
            pm.promo_id,
            pm.name,
            pm.event_id,
            pm.start_date,
            pm.end_date,
            pm.created_by,
            pm.vendor_created_by,
            pm.updated_by,
            pm.status
        FROM price_promo.promo_master pm
        WHERE pm.promo_id = ANY(p_promo_ids)
    LOOP
        RAISE NOTICE 'Processing promo_id: %, name: %', promo_rec.promo_id, promo_rec.name;
        
        -- Group products by Offer Type and Product Hierarchy
        _query = format(
            $sql$
                with product_grouping_cte AS (
                    SELECT
                        pp.product_id,
                        CASE 
                            WHEN pm.is_consumable = true THEN
                                jsonb_build_object(
                                    'offer_type_id', psd.scenario_data->'1'->>'offer_type_id',
                                    'offer_type', tasm.display_name,
                                    'is_consumables', true,
                                    'hierarchy_value', %4$s || ' - ' || %5$s
                                    %2$s
                                )
                            ELSE
                                jsonb_build_object(
                                    'offer_type_id', psd.scenario_data->'1'->>'offer_type_id',
                                    'offer_type', tasm.display_name,
                                    'is_consumables', false,
                                    'hierarchy_value', %6$s || ' - ' || %7$s
                                    %3$s
                                )
                        END AS group_key
                    FROM (
                        select * from 
                        price_promo.promo_product
                        where promo_id = %1$s
                    ) pp
                    INNER JOIN price_promo.product_master pm ON pp.product_id = pm.product_id
                    inner join (
                        select psd.*,pprd.product_level_value from 
                        price_promo.ps_scenario_discounts psd
                        inner join price_promo.tb_promo_product_reco_details pprd 
                        on psd.product_level_id = pprd.product_level_id
                        where psd.promo_id = %1$s
                    ) psd on (psd.product_level_value->>'product_id')::int = pp.product_id
                    inner join metaschema.tb_app_sub_master tasm on tasm.id = (psd.scenario_data['1']->>'offer_type_id')::int
                )
                SELECT
                    group_key,
                    ARRAY_AGG(DISTINCT product_id) AS product_ids
                FROM product_grouping_cte
                GROUP BY group_key
            $sql$,
            promo_rec.promo_id,
            (select array_to_string(array_agg(format(',''%1$s'',pm.%1$s', _col_name)), '') from unnest(consumables_id_columns) as t(_col_name)),
            (select array_to_string(array_agg(format(',''%1$s'',pm.%1$s', _col_name)), '') from unnest(non_consumables_id_columns) as t(_col_name)),
            (
                select array_to_string(array_agg(format('pm.%1$s', _col_name)), '|| '' - '' ||') 
                from jsonb_array_elements_text(splitting_config->'consumables'->'main_columns_for_promo_name') as t(_col_name)
            ),
            (
                select array_to_string(array_agg(format('pm.%1$s', _col_name)), '|| '' '' ||') 
                from jsonb_array_elements_text(splitting_config->'consumables'->'secondary_columns_for_promo_name') as t(_col_name)
            ),
            (
                select array_to_string(array_agg(format('pm.%1$s', _col_name)), '|| '' - '' ||') 
                from jsonb_array_elements_text(splitting_config->'non_consumables'->'main_columns_for_promo_name') as t(_col_name)
            ),
            (
                select array_to_string(array_agg(format('pm.%1$s', _col_name)), '|| '' '' ||') 
                from jsonb_array_elements_text(splitting_config->'non_consumables'->'secondary_columns_for_promo_name') as t(_col_name)
            )
        );

        raise notice 'Query: %', _query;

        FOR product_group_rec IN EXECUTE _query
        LOOP
            RAISE NOTICE 'Group key: %', product_group_rec.group_key;
            raise notice 'product_ids: %', product_group_rec.product_ids;

            -- Generate new promo name 
            new_name := format(
                '%1$s %2$s - %3$s',
                promo_rec.name,
                product_group_rec.group_key->>'offer_type',
                product_group_rec.group_key->>'hierarchy_value'
                
            );


            RAISE NOTICE 'Creating new promo with name: %', new_name;

            _start_time := now();

            -- Create new promo using fn_copy_promo
            SELECT price_promo.fn_copy_promo(
                promo_rec.promo_id,           -- p_promo_id
                promo_rec.event_id,           -- p_event_id
                new_name,                     -- p_new_promo_name
                promo_rec.start_date,         -- p_new_start_date
                promo_rec.end_date,           -- p_new_end_date
                promo_rec.created_by,         -- p_user_id
                NULL,                         -- p_review_status
                NULL,                         -- p_parent_vendor_promo_id
                promo_rec.status,             -- p_status
                false,                        -- p_update_review_status_timestamp
                true,                         -- p_is_vendor_created_promo
                promo_rec.vendor_created_by   -- p_vendor_created_by
            ) INTO new_promo_id_var;

            raise notice 'copy promo took % seconds', extract(epoch from now() - _start_time);

            RAISE NOTICE 'Created new promo_id: %', new_promo_id_var;

            -- Delete products that don't belong to this group from the new promo
            -- Keep only products in product_group_rec.product_ids
            EXECUTE format(
                'DELETE FROM price_promo.promo_product_%1$s WHERE promo_id = %1$s and (not product_id = ANY(%2$L))',
                new_promo_id_var, product_group_rec.product_ids
            );

            EXECUTE format(
                'DELETE FROM price_promo.included_products_%1$s WHERE promo_id = %1$s AND (not product_id = ANY(%2$L))',
                new_promo_id_var, product_group_rec.product_ids
            );

            delete from price_promo.promo_product_hierarchy
            where promo_id = new_promo_id_var
            and hierarchy_id not in (
                select pm.hierarchy_id from price_promo.product_master pm 
                where product_id = any(product_group_rec.product_ids)
            );

            delete from price_promo.ps_scenario_discounts
            where promo_id = new_promo_id_var
            and product_level_id in (
                select product_level_id from price_promo.tb_promo_product_reco_details
                where promo_id = new_promo_id_var
                and (product_level_value->>'product_id')::int not in (select unnest(product_group_rec.product_ids))
            );
            
            delete from price_promo.tb_promo_product_reco_details
            where promo_id = new_promo_id_var
            and product_level_id not in (
                select product_level_id from price_promo.ps_scenario_discounts
                where promo_id = new_promo_id_var
            );

            -- Update products count in promo_master
            UPDATE price_promo.promo_master
            SET 
                products_count = array_length(product_group_rec.product_ids, 1),
                vendor_portal_status = 1,
                updated_at = NOW(),
                updated_by = promo_rec.vendor_created_by
            WHERE promo_id = new_promo_id_var;

        END LOOP;

        -- Soft delete the original promo after all splits are created
        UPDATE price_promo.promo_master
        SET vendor_portal_status = 6, -- ARCHIVED
            updated_at = NOW(),
            updated_by = promo_rec.created_by
        WHERE promo_id = promo_rec.promo_id;

        RAISE NOTICE 'Soft deleted original promo_id: %', promo_rec.promo_id;

    END LOOP;

END;
$function$;
