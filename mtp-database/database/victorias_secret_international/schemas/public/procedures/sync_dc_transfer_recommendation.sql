--liquibase formatted sql
--changeset liquibase:sync_dc_transfer_recommendation runOnChange:true stripComments:false splitStatements:false context:MTP-80390 labels:MTP-80390
--comment: MTP-80390 sync_dc_transfer_recommendation
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_dc_transfer_recommendation();

CREATE OR REPLACE PROCEDURE public.sync_dc_transfer_recommendation()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_dc_transfer_recommendation';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
    _query_common TEXT;
    _query_insert_reco TEXT;
    _query_insert_alloc TEXT;
    _query_insert_dc_dc_mapping TEXT;
    _inserted_reco_count INT := 0;
    _inserted_alloc_count INT := 0;
    _inserted_dc_dc_mapping_count INT := 0;
    _cutoff_date DATE;
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    -- Ensure idempotency before insert
    TRUNCATE TABLE inventory_smart.dc_transfer_recommendation_dc_dc_mapping;
    TRUNCATE TABLE inventory_smart.dc_transfer_recommendation_sn_resolved;
    TRUNCATE TABLE inventory_smart.dc_transfer_recommendation_promised_allocations;

    -- Calculate cutoff_date
    SELECT MIN(ac.ship_date - INTERVAL '1 day' * COALESCE(ac.promised_reco_days, 133))::date
    INTO _cutoff_date
    FROM inventory_smart.alerts_config_table ac
    WHERE ac.alert_name = 'upcoming floorset dc transfer';
    
    -- Build shared CTE logic
    _query_common := format($$
        WITH alerts_config AS materialized (
            SELECT
                article,
                start_date as launch_date,
                launch_floorset,
                floorset_start_date,
                floorset_end_date,
                ship_date,
                coalesce(promised_reco_days, 133) as promised_reco_days,
                alert_start_date,
                alert_end_date
            FROM inventory_smart.alerts_config_table
            WHERE alert_name = 'upcoming floorset dc transfer'
        )
        -- select * from alerts_config;
        ,dc_dc_transfer AS (
            SELECT
                ac.article,
                source_code,
                destination_code
            from inventory_smart.rcl_network_versions_latest rnvl 
            join alerts_config ac using(article)
            where rnvl.supply_route_name = 'DC-DC Transfer'
        )
        -- select * from dc_dc_transfer;
        ,eligible_dcs AS (
            SELECT
                ddt.article,
                dc_info.source_code,
                dc_info.tag
            FROM
                dc_dc_transfer ddt
            CROSS JOIN LATERAL
                UNNEST(
                    ARRAY[source_code, destination_code],
                    ARRAY['source'::text, 'destination'::text]
                ) AS dc_info(source_code, tag)
        )
        -- select * from eligible_dcs;
        ,filtered_sn_resolved AS (
            SELECT
                DISTINCT
                rnvl.article,
                rnvl.source_code,
                rnvl.source_type,
                rnvl.destination_code,
                rnvl.destination_type,
                rnvl.supply_route_name,
                rnvl.priority,
                edc.tag
            FROM inventory_smart.rcl_network_versions_latest rnvl
            INNER JOIN eligible_dcs edc USING(article, source_code)
            WHERE rnvl.supply_route_name = 'DC-DC Allocation'
                AND rnvl.destination_type NOT IN ('DC', 'Store')
                AND rnvl.priority IN (1, 3)
        )
        --select * from filtered_sn_resolved;
        ,ranked_sn_resolved AS (
            SELECT
                fsn.*,
                ROW_NUMBER() OVER (
                    PARTITION BY fsn.article, fsn.destination_code
                    ORDER BY fsn.priority
                ) AS rn
            FROM
                filtered_sn_resolved fsn
        )
        --select * from ranked_sn_resolved order by article, destination_code, rn;
        ,final_sn_resolved AS (
            SELECT
                article,
                launch_date,
                launch_floorset,
                floorset_start_date,
                floorset_end_date,
                ship_date,
                promised_reco_days,
                alert_start_date,
                alert_end_date,
                source_code,
                source_type,
                destination_code,
                destination_type,
                supply_route_name,
                tag
            FROM
                ranked_sn_resolved
            JOIN alerts_config USING(article)
            WHERE rn = 1
        )
        --select * from final_sn_resolved order by destination_code;
        ,carfg_filtered AS (
            SELECT
                carfg.article,
                carfg.retail_size_cd AS size,
                carfg.store,
                carfg.allocation_code,
                carfg.allocated_total,
                carfg.created_at
            FROM
                inventory_smart.create_allocation_result_flat_gurobi carfg
            JOIN final_sn_resolved fsn
                ON carfg.article = fsn.article AND carfg.store = fsn.destination_code
            WHERE
                carfg.created_at BETWEEN
                    '%s'::date AND now()::date
                AND status = 3
        )
        --select * from carfg_filtered order by store;
        ,allocations AS (
            SELECT
                ac.article,
                carfg.size,
                carfg.store,
                SUM(carfg.allocated_total) AS promised_quantity,
                ARRAY_AGG(DISTINCT carfg.allocation_code ORDER BY carfg.allocation_code) AS allocation_codes
            FROM alerts_config ac
            CROSS JOIN LATERAL (
                SELECT *
                FROM carfg_filtered carfg
                WHERE carfg.article = ac.article
                    -- created_at is in UTC
                    -- ac.ship_date - INTERVAL '1 day' * ac.promised_reco_days is in america/new_york time zone
                    -- ac.ship_date - INTERVAL '1 day' * ac.promised_reco_days + INTERVAL '4 hours' is in UTC
                    -- now()::date is in UTC
                    AND carfg.created_at BETWEEN
                        (ac.ship_date - INTERVAL '1 day' * ac.promised_reco_days + INTERVAL '4 hours') AND now()::date
            ) carfg
            GROUP BY 1, 2, 3
        )
        --select * from allocations order by size desc, store;
    $$, _cutoff_date);
    RAISE NOTICE '_query_common = %', _query_common;

    -- Insert into dc_transfer_recommendation_dc_dc_mapping
    _query_insert_dc_dc_mapping := $q$
        INSERT INTO inventory_smart.dc_transfer_recommendation_dc_dc_mapping (
            article, source_code, destination_code
        )
        SELECT
            article, source_code, destination_code
        FROM dc_dc_transfer;
    $q$;

    -- Insert into dc_transfer_recommendation_sn_resolved
    _query_insert_reco := $q$
        INSERT INTO inventory_smart.dc_transfer_recommendation_sn_resolved (
            article, launch_date, launch_floorset, floorset_start_date, floorset_end_date,
            ship_date, promised_reco_days, alert_start_date, alert_end_date,
            source_code, source_type, destination_code, destination_type, supply_route_name, tag
        )
        SELECT
            article, launch_date, launch_floorset, floorset_start_date, floorset_end_date,
            ship_date, promised_reco_days, alert_start_date, alert_end_date,
            source_code, source_type, destination_code, destination_type, supply_route_name, tag
        FROM final_sn_resolved;
    $q$;

    -- Insert into dc_transfer_recommendation_promised_allocations
    _query_insert_alloc := $q$
        INSERT INTO inventory_smart.dc_transfer_recommendation_promised_allocations (
            article, size, store, promised_quantity, allocation_codes
        )
        SELECT
            article, size, store, promised_quantity, allocation_codes
        FROM allocations;
    $q$;

    BEGIN
        -- Insert dc_transfer_recommendation_dc_dc_mapping and log count
        EXECUTE _query_common || _query_insert_dc_dc_mapping;
        GET DIAGNOSTICS _inserted_dc_dc_mapping_count = ROW_COUNT;
        RAISE NOTICE 'Inserted % rows into dc_transfer_recommendation_dc_dc_mapping', _inserted_dc_dc_mapping_count;

        -- Insert final_sn_resolved and log count
        EXECUTE _query_common || _query_insert_reco;
        GET DIAGNOSTICS _inserted_reco_count = ROW_COUNT;
        RAISE NOTICE 'Inserted % rows into dc_transfer_recommendation_sn_resolved', _inserted_reco_count;

        -- Insert allocations and log count
        EXECUTE _query_common || _query_insert_alloc;
        GET DIAGNOSTICS _inserted_alloc_count = ROW_COUNT;
        RAISE NOTICE 'Inserted % rows into dc_transfer_recommendation_promised_allocations', _inserted_alloc_count;

    EXCEPTION
        WHEN OTHERS THEN
            RAISE EXCEPTION 'Error during ingestion: %', SQLERRM;
    END;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;
