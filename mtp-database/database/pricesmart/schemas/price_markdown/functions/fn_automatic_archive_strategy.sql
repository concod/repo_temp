--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_automatic_archive_strategy_15 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_automatic_archive_strategy_14.
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_automatic_archive_strategy;
CREATE OR REPLACE FUNCTION price_markdown.fn_automatic_archive_strategy(_timezone text DEFAULT 'US/Eastern'::text)
 RETURNS TABLE(partial_archival_strategies text, full_archival_strategies text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
	-- hardcoded for now, should keep it in some backend table.
	threshold_days integer := 1;
	strategy_id_ integer;
	temp_table_name text;
	check_table_exists bool := false;
	partial_archival_strategies integer[];
	full_archival_strategies integer[];
	not_approved_product_ids integer[];
	final_approved_product_level_ids integer[];
	not_approved_product_level_ids integer[];
	actual_product_count integer;
	query text;
	final_result json;
	threshold_days_name text:= 'automatic_archive_threshold_days';
	table_suffix text;
	strategy_start_date_ date;
begin
	-- Fetch threshold_days.

	select tasm.remarks::int into threshold_days from metaschema.tb_app_sub_master tasm where tasm.is_active = 1 and tasm.name = threshold_days_name;
	raise notice 'threshold_days: %', threshold_days;
	raise notice 'Strategies Starting From: %', (date(timezone(_timezone, now())) + threshold_days);


	-- Find the strategy_ids of partial archival.
	WITH strategy_statuses AS (
	    SELECT 
	        tsd.strategy_id,
	        tsd.approval_status
	    FROM
	        price_markdown.tb_strategy_discount tsd
	    INNER JOIN
	        price_markdown.tb_strategy_pcd tsp 
	            ON tsd.pcd_id = tsp.pcd_id 
	            AND tsp.pcd_start_date = (DATE(TIMEZONE(_timezone, NOW())) + threshold_days)
	    JOIN
	        price_markdown.tb_strategy_master tsm 
	            ON tsm.strategy_id = tsd.strategy_id
	    WHERE
	        tsd.strategy_id IN (
	            SELECT strategy_id 
	            FROM price_markdown.tb_strategy_master 
	            WHERE start_date = (DATE(TIMEZONE(_timezone, NOW())) + threshold_days)
	        )
	        AND tsm.status = 2
	    group by 
	    	tsd.strategy_id,
	        tsd.approval_status
	)
	SELECT
	    array_agg(DISTINCT strategy_id) into partial_archival_strategies
	FROM 
	    strategy_statuses
	WHERE 
	    strategy_id IN (
	        SELECT strategy_id 
	        FROM strategy_statuses 
	        WHERE approval_status = 'Finally Approved'
	    )
	    AND strategy_id IN (
	        SELECT strategy_id 
	        FROM strategy_statuses 
	        WHERE approval_status IN ('Initially Approved', 'Not Approved')
	    );
	raise notice 'partial_archival_strategies: %', partial_archival_strategies;


	-- Find the strategy_ids of full archival.
	WITH strategies_with_mixed_status AS (
	    SELECT 
	        array_agg(strategy_id) AS strateg_ids
	    FROM
	        price_markdown.tb_strategy_master tsm
	    WHERE
	        tsm.start_date = (DATE(TIMEZONE(_timezone, NOW())) + threshold_days)
	        AND tsm.status IN (0, 1, 5, 7)
	        AND NOT (strategy_id = ANY(partial_archival_strategies))
	),
	final_approved_strategies AS (
	    WITH strategy_statuses AS (
		    SELECT 
		        tsd.strategy_id,
		        tsd.approval_status
		    FROM
		        price_markdown.tb_strategy_discount tsd
		    INNER JOIN
		        price_markdown.tb_strategy_pcd tsp 
		            ON tsd.pcd_id = tsp.pcd_id 
		            AND tsp.pcd_start_date = (DATE(TIMEZONE(_timezone, NOW())) + threshold_days)
		    JOIN
		        price_markdown.tb_strategy_master tsm 
		            ON tsm.strategy_id = tsd.strategy_id
		    WHERE
		        tsd.strategy_id IN (
		            SELECT strategy_id 
		            FROM price_markdown.tb_strategy_master 
		            WHERE start_date = (DATE(TIMEZONE(_timezone, NOW())) + threshold_days)
		        )
		        AND tsm.status = 2
		    group by 
		    	tsd.strategy_id,
		        tsd.approval_status
		)
		SELECT
		    array_agg(DISTINCT strategy_id) AS strateg_ids
		FROM 
		    strategy_statuses
		WHERE 
		    strategy_id NOT IN (
		        SELECT strategy_id 
		        FROM strategy_statuses 
		        WHERE approval_status = 'Finally Approved'
		    )
	),
	finalised_strategies_cte AS (
	    SELECT unnest(strateg_ids) AS strategy_id 
	    FROM strategies_with_mixed_status 
	    WHERE strateg_ids IS NOT NULL
	    UNION
	    SELECT unnest(strateg_ids) AS strategy_id 
	    FROM final_approved_strategies 
	    WHERE strateg_ids IS NOT NULL
	)
	SELECT
	    array_agg(strategy_id) into full_archival_strategies
	FROM
	    finalised_strategies_cte;
	raise notice 'full_archival_strategies: %', full_archival_strategies;


	-- Perform full archival operations.
	if array_length(full_archival_strategies, 1) > 0 then
		-- log strategies info before full archive.
		perform price_markdown.fn_insert_auto_archive_logs((date(timezone(_timezone, now())) + threshold_days),  timezone(_timezone, now()), 'full_archival', full_archival_strategies::integer[], true);

		-- fully archival strategies are updated by default user_id: 0.
		perform price_markdown.fn_stop_or_archive_strategy(full_archival_strategies::integer[], -3::integer, _timezone::text);

		-- log strategies info after full archive.
		perform price_markdown.fn_insert_auto_archive_logs((date(timezone(_timezone, now())) + threshold_days),  timezone(_timezone, now()), 'full_archival', full_archival_strategies::integer[], false);
	end if;


	-- Perform partial archival operations.
	if array_length(partial_archival_strategies, 1) > 0 then
		-- log strategies info before partial archive.
		perform price_markdown.fn_insert_auto_archive_logs((date(timezone(_timezone, now())) + threshold_days),  timezone(_timezone, now()), 'partial_archival', partial_archival_strategies::integer[], true);

		FOREACH strategy_id_ in array partial_archival_strategies loop
			table_suffix = strategy_id_::TEXT;
			-- Drop the temporary table if it exists
    		EXECUTE 'DROP TABLE IF EXISTS temp_selected_rows;';

			EXECUTE 'CREATE TEMP TABLE temp_selected_rows AS
			        SELECT
			            tsd.product_level_id,
			            tsd.channel_info
			        FROM
			            price_markdown.tb_strategy_discount_' || table_suffix || ' tsd
			        WHERE
			            tsd.strategy_id = ' || strategy_id_ || '
			            AND tsd.pcd_id = (
			                SELECT MIN(tsp.pcd_id)
			                FROM price_markdown.tb_strategy_pcd tsp
			                WHERE tsp.strategy_id = ' || strategy_id_ || '
			            )
			            AND tsd.approval_status <> ''Finally Approved''';

			-- Backup data from tb_strategy_discount
		    EXECUTE 'INSERT INTO price_markdown.tb_strategy_discount_backup (strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by, product_level_id, store_level_id, id, previous_markdown_percentage, incremental_discount, approval_status, previous_pcd_id, channel_info, average_retail_price, markdown_type, action_status)
				    SELECT
						strategy_id, product_level_value, store_level_value,
						pcd_id, markdown_percentage, is_locked, created_at,
						updated_at, created_by, updated_by, product_level_id,
						store_level_id, id, previous_markdown_percentage,
						incremental_discount, approval_status::price_markdown.strategy_approval_status_enum, previous_pcd_id,
						channel_info, average_retail_price, markdown_type, action_status::price_markdown.action_status_enum
				    FROM
						price_markdown.tb_strategy_discount_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (
				        SELECT product_level_id, channel_info FROM temp_selected_rows
				    );';
			raise notice 'Backup Done For table price_markdown.tb_strategy_discount';

		    -- Backup data from tb_strategy_discount_ia
		    EXECUTE 'INSERT INTO price_markdown.tb_strategy_discount_ia_backup (strategy_id, product_level_value, store_level_value, pcd_id, markdown_percentage, is_locked, created_at, updated_at, created_by, updated_by, product_level_id, store_level_id, id, incremental_discount, previous_markdown_percentage, previous_pcd_id, average_retail_price, channel_info, markdown_type)
		    		SELECT
						strategy_id, product_level_value, store_level_value,
						pcd_id, markdown_percentage, is_locked, created_at,
						updated_at, created_by, updated_by, product_level_id,
						store_level_id, id, incremental_discount, previous_markdown_percentage,
						previous_pcd_id, average_retail_price, channel_info, markdown_type
				    FROM
						price_markdown.tb_strategy_discount_ia_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (
				        SELECT product_level_id, channel_info FROM temp_selected_rows
				    );';
			raise notice 'Backup Done For table price_markdown.tb_strategy_discount_ia';

			-- Delete the data at product_level_id, channel_info level.
			EXECUTE '
				    DELETE FROM price_markdown.tb_strategy_sku_store_mapping_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (SELECT product_level_id, channel_info FROM temp_selected_rows);

				    DELETE FROM price_markdown.tb_ssd_fin_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (SELECT product_level_id, channel_info FROM temp_selected_rows);

				    DELETE FROM price_markdown.tb_ssd_ia_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (SELECT product_level_id, channel_info FROM temp_selected_rows);

				    DELETE FROM price_markdown.tb_strategy_discount_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (SELECT product_level_id, channel_info FROM temp_selected_rows);

				    DELETE FROM price_markdown.tb_strategy_discount_ia_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (SELECT product_level_id, channel_info FROM temp_selected_rows);

				    DELETE FROM price_markdown.tb_agg_fin_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (SELECT product_level_id, channel_info FROM temp_selected_rows);

				    DELETE FROM price_markdown.tb_agg_ia_' || table_suffix || '
				    WHERE (product_level_id, channel_info) IN (SELECT product_level_id, channel_info FROM temp_selected_rows);
				    ';
			select
				start_date into strategy_start_date_
			from
				price_markdown.tb_strategy_master tsm
			where
				tsm.strategy_id = strategy_id_;
			call price_markdown_opt.pc_insert_stg_metric(strategy_id_);
			call price_markdown_opt.pc_insert_strategy_date_metrics(strategy_id_, 'ia', strategy_start_date_);
			call price_markdown_opt.pc_insert_strategy_date_metrics(strategy_id_, 'fin', strategy_start_date_);
			call price_markdown_opt.pc_insert_approval_metrics(strategy_id_);

			raise notice 'Delete/Refresh Done.';

			-- Update sku/store for the strategy.
			UPDATE price_markdown.tb_strategy_sku_store_count
			SET
			    sku_count = (
			        SELECT COUNT(DISTINCT product_id)
			        FROM price_markdown.tb_strategy_sku_store_mapping
			        WHERE strategy_id = strategy_id_
			    ),
			    store_count = (
			        SELECT COUNT(DISTINCT store_id)
			        FROM price_markdown.tb_strategy_sku_store_mapping
			        WHERE strategy_id = strategy_id_
			    )
			WHERE strategy_id = strategy_id_;

			-- Drop the temporary table if it exists
    		EXECUTE 'DROP TABLE IF EXISTS temp_selected_rows;';
		end loop;

		-- log strategies info after partial archive.
		perform price_markdown.fn_insert_auto_archive_logs((date(timezone(_timezone, now())) + threshold_days),  timezone(_timezone, now()), 'partial_archival', partial_archival_strategies::integer[], false);
	end if;

	return query execute Format(
	'select
		array_to_string(%1$L::integer[], '','') as partial_archival_strategies,
		array_to_string(%2$L::integer[], '','') as  full_archival_strategies',
	partial_archival_strategies, full_archival_strategies);
end;
$function$
;
