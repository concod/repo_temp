--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_send_data_to_snowflake_9 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: fn_send_data_to_snowflake_9
--rollback: SELECT 1
DROP FUNCTION if exists price_markdown.fn_send_data_to_snowflake;
CREATE OR REPLACE FUNCTION price_markdown.fn_send_data_to_snowflake()
 RETURNS TABLE(strategy_id integer, action text, data_count bigint, qc_table json, warning_array text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
    vl_test_query text :=  '';
    strategy_list integer[];
    pcd_list integer[];
    business_days text;
    week_day text;
    buffer text;
    warning_array text[][] := ARRAY[]::text[][];
begin
    
    vl_test_query := 'select remarks from metaschema.tb_app_sub_master where name = ''pcd_buffer''';
    raise notice 'buffer query: %', vl_test_query;
    execute vl_test_query into buffer;

    vl_test_query := format('select trim(to_char((current_timestamp at time zone ''US/Eastern'') + interval ''%1$s'', ''Day''))', buffer);
    RAISE NOTICE 'current day query: %', vl_test_query;
    execute vl_test_query into week_day;

        vl_test_query := format('select business_days from price_markdown.tb_week_business_days where week_day = ''%1$s''', week_day);
    RAISE NOTICE 'current business days query: %', vl_test_query;
    execute vl_test_query into business_days;

    vl_test_query :=  'drop table if exists tb_temp_1;';
    execute vl_test_query;
	
   	    vl_test_query := format('create temp table tb_temp_1 as(
                        select
                            strategy_id,
                            pcd_id,
                            pcd_start_date
                        from
                            price_markdown.tb_strategy_pcd
                        where
                            pcd_start_date between
                                date(timezone(''US/Eastern'', now())) + interval ''%1$s'' + interval ''1 day''
                            and
                                date(timezone(''US/Eastern'', now())) + interval ''%1$s'' + interval ''%2$s''
                    )', buffer, business_days);
    RAISE NOTICE 'query 1: %', vl_test_query;
    execute vl_test_query;

    vl_test_query := 'select array(select distinct strategy_id from tb_temp_1)';
    RAISE NOTICE 'query 2: %', vl_test_query;
    execute vl_test_query into strategy_list;

    vl_test_query := 'select array(select distinct pcd_id from tb_temp_1)';
    RAISE NOTICE 'query 3: %', vl_test_query;
    execute vl_test_query into pcd_list;

    IF array_length(strategy_list, 1) > 0 THEN

        vl_test_query :=  'drop table if exists tb_temp_2;';
        execute vl_test_query;

                vl_test_query := format('create temp table tb_temp_2 as(
                            select
                                pms.sku_id as sku_id,
                                tssm.store_id,
                                tt1.pcd_start_date as effective_date,
                                case
                                    when tsd.markdown_type = ''Final Sale Price'' then
                                        floor(
                                            case
                                                when tsm.s1_name = ''Store'' then
                                                    round((coalesce(tpsp.last_reg_price,pms.last_reg_price_bnm) * (1 - coalesce(tsd.markdown_percentage/100, 0)))::numeric,2)
                                                else
                                                    round((coalesce(tpsp.last_reg_price,pms.last_reg_price_ecom) * (1 - coalesce(tsd.markdown_percentage/100, 0)))::numeric,2)
                                            end) + 0.97
                                    else
                                        floor(
                                            case
                                                when tsm.s1_name = ''Store'' then
                                                    round((coalesce(tpsp.last_reg_price,pms.last_reg_price_bnm) * (1 - coalesce(tsd.markdown_percentage/100, 0)))::numeric,2)
                                                else
                                                    round((coalesce(tpsp.last_reg_price,pms.last_reg_price_ecom) * (1 - coalesce(tsd.markdown_percentage/100, 0)))::numeric,2)
                                            end) + 0.99
                                end as price,
                                case
                                    when tsd.markdown_type = ''First Markdown'' then 22
                                    else 24
                                end as price_status,
                                um.name as updated_by,
                                tsd.updated_at,
                                tsd.approval_status as ia_approval_status,
                                tsd.incremental_discount,
                                tsd.channel_info as channel,
                                tsd.pcd_id,
                                tsd.product_level_id,
                                tt1.strategy_id,
                                tsd.markdown_percentage as discount,
                                tsgm.status as strategy_status,
                                tssm.product_id,
                                case
                                    when tsm.s1_name = ''Store'' then
										coalesce(tpsp.last_reg_price,pms.last_reg_price_bnm)
                                    else
										coalesce(tpsp.last_reg_price,pms.last_reg_price_ecom)
                                end as base_price,
                                pmpm.style_cuq as style_id
                            from
                                price_markdown.tb_strategy_discount tsd
                            join
                                price_markdown.tb_strategy_sku_store_mapping tssm
								on
                                    tssm.product_level_id = tsd.product_level_id
							        and tssm.store_level_id = tsd.store_level_id
									and tssm.channel_info = tsd.channel_info
									and tssm.strategy_id = tsd.strategy_id
                            join
                                price_markdown.product_master_sku pms
							on
						        pms.product_id = tssm.product_id
                            join
                                global.user_master um
							on
								um.user_code = tsd.updated_by
                            join
                                price_markdown.tb_store_master tsm
							on
								tssm.store_id = tsm.store_id
                            join
                                tb_temp_1 tt1
							on
								tsd.pcd_id = tt1.pcd_id
                            join
                                price_markdown.tb_strategy_master tsgm
							on
								tsd.strategy_id = tsgm.strategy_id
                            left join
                                price_markdown.tb_product_store_price tpsp
							on
                                    tssm.product_id = tpsp.product_id
								and tssm.store_id = tpsp.store_id
                            join
                                price_markdown.product_master pmpm
							on
								tssm.product_id = pmpm.product_id
                            where
                                tsd.strategy_id in (%1$s)
							and
                                tssm.strategy_id in (%1$s)
							and
                                tsd.pcd_id in (%2$s)
							and
                                pms.is_active = 1
                        )', array_to_string(strategy_list, ','), array_to_string(pcd_list, ','), buffer);

        RAISE NOTICE 'query 4: %', vl_test_query;
        execute vl_test_query;

        vl_test_query :=  'drop table if exists filtered_data;';
		execute vl_test_query;
	
		vl_test_query := 'create temp table filtered_data as (
							select * from
								(select
									s.*,
									rank() over (partition by s.sku_id, s.store_id, s.effective_date order by s.updated_at desc) as rnk
								from
									price_markdown.tb_snowflake_data s) f
								where f.rnk = 1
						)';
		RAISE NOTICE 'Table with rank query: %', vl_test_query;
		execute vl_test_query;

		vl_test_query := 'drop table if exists output_1;';
		execute vl_test_query;
	
		vl_test_query := 'create temp table output_1 as
					SELECT
					       t.sku_id,
					       t.store_id,
					       t.effective_date,
					       t.price,
					       t.price_status,
					       ''ADD'' as action,
					       t.ia_approval_status,
					       t.updated_by,
					       t.updated_at,
					       t.channel,
					       t.pcd_id,
					       t.product_level_id,
						   t.strategy_id,
						   t.discount,
						   t.base_price,
						   t.product_id,
						   t.style_id
	
					FROM
					       tb_temp_2 t
					       left join filtered_data ON filtered_data.sku_id = t.sku_id
					       AND filtered_data.store_id = t.store_id
					       AND filtered_data.effective_date = t.effective_date
					WHERE
		              t.ia_approval_status = ''Finally Approved''
					  AND t.incremental_discount > 0
		              AND t.strategy_status IN (2,3,6) ;';		             
		RAISE NOTICE 'query 5: %', vl_test_query;
		execute vl_test_query;

		vl_test_query := 'drop table if exists output_2;';
		execute vl_test_query;
	
		vl_test_query := 'create temp table output_2 as
					SELECT
					       t.sku_id,
					       t.store_id,
					       t.effective_date,
					       t.price,
					       t.price_status,
					       CASE
				         	 -- Subcondition 1: ia_approval_status changed from Finally Approved to Initially Approved
				             WHEN filtered_data.ia_approval_status = ''Finally Approved''
				             	AND t.ia_approval_status in (''Initially Approved'', ''Not Approved'')  THEN ''DEL''
							-- Subcondition 2: ia_approval_status not changed but price has changed
				             WHEN filtered_data.price != t.price THEN ''MOD''
				             ELSE ''ADD''
					       END AS action,
					       t.ia_approval_status,
					       t.updated_by,
					       t.updated_at,
					       t.channel,
					       t.pcd_id,
					       t.product_level_id,
						   t.strategy_id,
						   t.discount,
						   t.base_price,
						   t.product_id,
						   t.style_id
					FROM
					       tb_temp_2 t
					       inner join filtered_data ON filtered_data.sku_id = t.sku_id
					       AND filtered_data.store_id = t.store_id
					       AND filtered_data.effective_date = t.effective_date
						   AND filtered_data.pcd_id = t.pcd_id
					WHERE
		               (filtered_data.ia_approval_status = ''Finally Approved''
             				AND t.ia_approval_status in (''Initially Approved'', ''Not Approved''))
                       OR filtered_data.price != t.price;
		              ';
		RAISE NOTICE 'query 6: %', vl_test_query;
		execute vl_test_query;
	
		vl_test_query := 'drop table if exists final_output;';
		execute vl_test_query;
	
		vl_test_query := 'create temp table final_output as (
					select * from output_1 union all select * from output_2
				);';
			
		RAISE NOTICE 'final output query: %', vl_test_query;
		execute vl_test_query;
	
		vl_test_query := 'drop table if exists qc_results';
		execute vl_test_query;
	
		vl_test_query := 'create temp table qc_results (qc_name text, qc_status boolean)';
		execute vl_test_query;
		
		--------------------------------------------QC's----------------------------------------------------------
	
		-- QC Check: SKU, Store, effective_date, and date(updated_at) uniqueness
	    INSERT INTO qc_results (qc_name, qc_status)
	    VALUES (
	        'Duplicate entries for SKU, Store, effective_date, updated_at date',
	        NOT EXISTS (
	            SELECT 1
	            FROM final_output
	            GROUP BY sku_id, store_id, effective_date, date(updated_at)
	            HAVING COUNT(*) > 1
	        )
	    );
	
	    -- QC Check: Null values in essential columns
	    INSERT INTO qc_results (qc_name, qc_status)
	    VALUES (
	        'Null values in essential columns',
	        NOT EXISTS (
	            SELECT 1 FROM final_output fo
	            WHERE (sku_id IS NULL OR store_id IS NULL OR effective_date IS NULL OR price IS NULL OR
                   price_status IS NULL OR updated_by IS NULL OR updated_at IS NULL OR ia_approval_status IS NULL OR
                   channel IS NULL OR pcd_id IS NULL OR product_level_id IS NULL OR fo.strategy_id IS NULL OR
                   discount IS NULL OR base_price IS NULL OR product_id IS NULL OR style_id IS NULL)
	        )
	    );

        -- QC Check: Price ending validation based on price_status
	   INSERT INTO qc_results (qc_name, qc_status)
	    VALUES (
	        'Price ending does not match for specified price_status. ',
	        NOT EXISTS (
	            SELECT 1 FROM final_output
            	WHERE (price_status = 22 AND price::text NOT LIKE '%.99') OR
                  (price_status = 24 AND price::text NOT LIKE '%.97')
	        )
	    );
	   

        -- QC Check: Effective date validation within a specified range
	    vl_test_query := format('
			    INSERT INTO qc_results (qc_name, qc_status)
			    VALUES (
			        ''Effective date is not within the specified business day range from today.'',
			        NOT EXISTS (
			            SELECT 1 
			            FROM final_output
			            WHERE effective_date < date(timezone(''US/Eastern'', now())) + interval ''%1$s'' + interval ''1 day'' 
			               OR effective_date > date(timezone(''US/Eastern'', now())) + interval ''%1$s'' + interval ''%2$s''
			        )
			    )', buffer, business_days);
		raise notice 'Date range QC Query: %', vl_test_query;
		execute vl_test_query;
	
		-- QC Check: Unique price per Style, Store, effective_date, and updated_at
		INSERT INTO qc_results (qc_name, qc_status)
	    VALUES (
	        'Multiple prices found for the same Style, Store, effective_date, and updated_at. ',
	        NOT EXISTS (
	            SELECT style_id, store_id, effective_date, date(updated_at)
			    FROM final_output
			    GROUP BY style_id, store_id, effective_date, date(updated_at)
			    HAVING COUNT(DISTINCT price) > 1
	        )
	    );
	
	   raise notice 'QC table formed.';
	
		---------------------------------------------QC's----------------------------------------------------------

        -- Return if QC checks fail
        if not (select bool_and(qc_status) from qc_results) then
	        return query 
	        select null::integer as strategy_id, 
	               null::text as action, 
	               0::bigint as data_count, 
	               (select json_agg(qc) from qc_results qc) as qc_table,
	               null::text[] as warning_array;
	        return;
        end if;
       
        --creating an array of array for the discount>75%
        SELECT ARRAY_AGG(distinct ARRAY[fo.strategy_id::text, fo.pcd_id::text, fo.discount::text])
	    INTO warning_array
	    FROM final_output fo
	    WHERE discount > 75;

	    --Since all the QCs passed, inserting the data.
		vl_test_query := 'drop table if exists tb_temp_int;';
		execute vl_test_query;
		vl_test_query := 'create temp table tb_temp_int as (
								with new_data as (
									insert into
									price_markdown.tb_snowflake_data (
									    sku_id,
									    store_id,
									    effective_date,
									    price,
									    price_status,
									    action,
										ia_approval_status,
									    updated_by,
									    updated_at,
									    channel,
									    pcd_id,
									    product_level_id,
										strategy_id,
									    discount,
									    base_price,
									    product_id,
									    style_id
									)
									select
							            sku_id,
							            store_id,
							            effective_date,
							            price,
							            price_status,
							            action,
							            ia_approval_status,
							            updated_by,
							            CURRENT_TIMESTAMP AT TIME ZONE ''US/Eastern'',
							            channel,
							            pcd_id,
							            product_level_id,
							            strategy_id,
							            discount,
							            base_price,
							            product_id,
							            style_id
							        from final_output
									RETURNING
									strategy_id,action)
								select
								strategy_id, action, count(*) as data_count
								from new_data
								group by 1,2);';
		RAISE NOTICE 'query 7: %', vl_test_query;
		execute vl_test_query;
		
        
		RETURN QUERY
        SELECT tt.strategy_id, 
               tt.action, 
               tt.data_count, 
               NULL::json AS qc_table, 
               warning_array 
        FROM tb_temp_int tt;

    ELSE
        RETURN QUERY SELECT NULL::integer, NULL::text, NULL::bigint, null::json AS qc_table, null::text[] as warning_array;
    END IF;
END;
$function$
;
