--liquibase formatted sql
--changeset shinde.samarth@impactanalytics.co:sync_auto_allocation_input_fixed runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-935
--comment: Fixed column aliasing and mappings; safe AST eval
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_auto_allocation_input();
CREATE OR REPLACE PROCEDURE public.sync_auto_allocation_input()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_auto_allocation_input';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	 	truncate table inventory_smart.auto_allocation_input;

          create temp table auto_allocation_configuration on commit drop as  (
                with rcl_dc_store_strategy as (
                select
                    *
                from
                    inventory_smart.rcl_dc_store_policy rdsp
                where
                    auto_allocation_rule is not null
                    and auto_allocation_schedular is not null
                    and not is_deleted 
                    ),
                    auto_allocation_scheduler_flat_table as (
				select
                    sh_code,
                    sh_name,
                    TRIM( '""' from TRIM('[]' from sh_structure -> 'data' ->> 'dailyRepeatOn') ) as dailyRepeatOn,
					string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedWeeks' )) , '"', ''), ', ') as selectedWeeks_array,
                    TRIM( '""' from TRIM('[]' from sh_structure -> 'data' ->> 'frequency_type') ) as frequency_type,
					string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedMonths' )) , '"', ''), ', ') as selectedMonths_array,
                    string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedDaysForYearly' )) , '"', ''), ', ') as selectedDaysForYearly_array,
                    string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedDatesForYearly' )) , '"', ''), ', ') as selectedDatesForYearly_array,
                    string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedDaysForMonthly' )) , '"', ''), ', ') as selectedDaysForMonthly_array,
                    string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedWeeksForYearly' )) , '"', ''), ', ') as selectedWeeksForYearly_array,
					string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedDatesForMonthly' )) , '"', ''), ', ') as selectedDatesForMonthly_array,
                    string_to_array(replace(UPPER(TRIM( '[]' from sh_structure -> 'data' ->> 'selectedDaysForQuaterly' )) , '"', ''), ', ') as selectedDaysForQuaterly_array,
                    string_to_array(replace(UPPER(TRIM( '[]' from sh_structure -> 'data' ->> 'selectedMonthsForYearly' )) , '"', ''), ', ') as selectedMonthsForYearly_array,
                    string_to_array(replace(UPPER(TRIM( '[]' from sh_structure -> 'data' ->> 'selectedMonths' )) , '"', ''), ', ') as selectedMonthsForQuaterly_array,
					string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedWeeksForMonthly' )) , '"', ''), ', ') as selectedWeeksForMonthly_array,
					string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedDatesForQuaterly' )) , '"', ''), ', ') as selectedDatesForQuaterly_array,
					string_to_array(replace(UPPER(TRIM('[]' from sh_structure -> 'data' ->> 'selectedWeeksForQuarterly' )) , '"', ''), ', ') as selectedWeeksForQuarterly_array
                from
                    inventory_smart.auto_allocation_scheduler aas
                where
                    is_deleted = false
                    ),
                    auto_allocation_rules_flat_table as (
                select
                    rule_code,
                    threshold_wos_data.dropdown as ar_threshold_wos_condition,
                    threshold_wos_data.threshold as ar_threshold_wos_threshold,
                    -- ADDED: carry rule_expression
                    x.rule_expression,
                    cast(
                values
                            -> 'cut_off_wos' as INT
                        ) as ar_cut_off_wos,
                    cast(
                values
                            -> 'minimum_dc_inventory' as INT
                        ) as ar_min_dc_inventory,
                    cast(
                values
                            -> 'minstock_not_satisfiled' -> 'value' as BOOL
                        ) as ar_minstock_condition,
                    auto_allocation_required_data.value as ar_auto_approve_condition
                from
                    inventory_smart.dc_store_policy_user_rule x,
                    jsonb_to_record(
                values
                            -> 'current_wos'
                        ) as threshold_wos_data(dropdown text,
                    threshold FLOAT),
                    jsonb_to_record(
                values
                            -> 'auto_allocation_required'
                        ) as auto_allocation_required_data(value BOOL)
                where
                    not is_deleted
                    and rule_type = 'auto-allocation'
                    )
                select
                    dc_store_rule,
                    auto_allocation_rule,
                    sh_name,
                    auto_allocation_schedular,
                    frequency_type as as_frequency,
                    dailyrepeaton as as_daily_repeat_on,
                    selectedweeks_array as as_selected_days_of_week,
                    selectedmonths_array  as as_selectedmonths,
                    selecteddaysforyearly_array  as as_days_for_yearly,
                    selecteddatesforyearly_array  as as_dates_for_yearly,
                    selectedweeksforyearly_array  as as_weeks_for_yearly,
                    selectedmonthsforyearly_array  as as_months_for_yearly,
                    selecteddaysforquaterly_array  as as_days_for_quarterly,
                    selecteddatesforquaterly_array  as as_dates_for_quarterly,
                    selectedweeksforquarterly_array  as as_weeks_for_quarterly,
                    selectedMonthsForQuaterly_array as as_months_for_quarterly,
                    selecteddaysformonthly_array  as as_days_for_monthly,
                    selecteddatesformonthly_array  as as_dates_for_monthly,
                    selectedweeksformonthly_array  as as_weeks_for_monthly,
                    ar_threshold_wos_condition,
                    ar_threshold_wos_threshold,
                    ar_cut_off_wos,
                    ar_min_dc_inventory,
                    ar_minstock_condition,
                    ar_auto_approve_condition,
                    -- ADDED: expose rule_expression downstream
                    rule_expression
                from
                    rcl_dc_store_strategy as rdss
                join auto_allocation_scheduler_flat_table as aasft on
                    rdss.auto_allocation_schedular = aasft.sh_code
                join auto_allocation_rules_flat_table as aarft on
                    rdss.auto_allocation_rule = aarft.rule_code
        );

        create temp table current_cal_info on commit drop as (
        select
            calendar_date,
            fiscal_day_name as day,
            case
                when fiscal_day_in_week not in (1, 7) then array['week_days','all_days']
                else array['all_days']
            end as day_type,
            fiscal_day_in_week as fiscal_date_of_week,
            fiscal_day_in_month as fiscal_date_of_month,
            fiscal_week_in_month as fiscal_week_of_month,
            fiscal_day_in_quarter as fiscal_date_of_the_quarter,
            fiscal_week_in_quarter as fiscal_week_of_the_quarter,
            fiscal_month_in_quarter as fiscal_month_of_the_quarter,
            fiscal_day_in_year as fiscal_date_of_the_year,
            fiscal_week_in_year as fiscal_week_of_the_year,
            upper(fiscal_month_name) as fiscal_month_of_the_year,
            fiscal_quarter_in_year as fiscal_quarter_of_the_year
        from
            global.fiscal_date_mapping
        where
            calendar_date = current_date
        );


        create temp table article_rule_resolution on commit drop as (
        select
            distinct article,
            rcl_dc_store_policy_code,
            rcl_code,
            default_store_groups,
            default_product_profile,
            dc_store_rule,
            auto_allocation_rule,
            auto_allocation_schedular
        from
            inventory_smart.generate_rcl_dc_store_policy(
            '(
            SELECT
            product_code
            FROM
            global.product_attributes_filter paf
            JOIN
            global.product_time_attributes pta
            USING
            (product_code)
            JOIN (
            select article
            from inventory_smart.article_inventory_dashboard aid 
            join global.store_attributes_filter saf using(store_code)
            where 
            not exists (
                select 1 from inventory_smart.alerts_product_level apl
                where apl.article =aid.article and apl.new_choice_flag = 1
            ) and 
            store_category = ''STORE''
            group by 1) aid
            USING
            (article)
            WHERE
            paf.active = TRUE
            AND current_date BETWEEN pta.start_time
            AND pta.end_time group by 1)',
            10003,
            current_date
            )
        join global.product_attributes_filter paf
                using (product_code)
        );

        create temp table article_resolved_dc_store_policy on commit drop as (
        select
            auto_allocation_rule,
            auto_allocation_schedular,
            sh_name,
            aac.dc_store_rule,
            as_frequency,
            as_daily_repeat_on,
            as_selected_days_of_week,
            as_selectedmonths,
            as_days_for_yearly,
            as_dates_for_yearly,
            as_weeks_for_yearly,
            as_months_for_yearly,
            as_days_for_quarterly,
            as_dates_for_quarterly,
            as_weeks_for_quarterly,
            as_months_for_quarterly,
            as_days_for_monthly,
            as_dates_for_monthly,
            as_weeks_for_monthly,
            ar_threshold_wos_condition,
            ar_threshold_wos_threshold,
            ar_cut_off_wos,
            ar_min_dc_inventory,
            ar_minstock_condition,
            ar_auto_approve_condition,
            article,
			rcl_dc_store_policy_code,
            rcl_code,
            default_store_groups,
            default_product_profile,
            calendar_date,
            day,
            day_type,
            fiscal_date_of_week,
            fiscal_date_of_month,
            fiscal_week_of_month,
            fiscal_date_of_the_quarter,
            fiscal_week_of_the_quarter,
            fiscal_month_of_the_quarter,
            fiscal_date_of_the_year,
            fiscal_week_of_the_year,
            fiscal_month_of_the_year,
            -- ADDED: rule_expression from aac
            aac.rule_expression
        from
            auto_allocation_configuration aac
        join article_rule_resolution arr
                using (
            auto_allocation_rule,
            auto_allocation_schedular
            )
        join current_cal_info
        on( 	
        case when as_frequency = 'daily' then as_daily_repeat_on = any(day_type)
        	else case when TRIM(as_frequency) = 'weekly' then UPPER(day) = ANY(as_selected_days_of_week) 
				else case when TRIM(as_frequency) = 'monthly' then 
					case when cardinality(as_dates_for_monthly) <> 0 then cast(fiscal_date_of_month as text) = any(as_dates_for_monthly)
					else cast(fiscal_week_of_month as text) = any(as_weeks_for_monthly)  AND UPPER(day) = ANY(as_days_for_monthly)
					end
						else case when TRIM(as_frequency) = 'quarterly' then
							case when cardinality(as_dates_for_quarterly) <> 0 then 
							cast(fiscal_date_of_month as text) = any(as_dates_for_quarterly) and cast(fiscal_month_of_the_quarter as text) = any(as_months_for_quarterly)
							else cast(fiscal_week_of_month as text) = any(as_weeks_for_quarterly)  AND UPPER(day) = ANY(as_days_for_quarterly) and cast(fiscal_month_of_the_quarter as text) = any(as_months_for_quarterly)
							end
								else case when TRIM(as_frequency) = 'yearly' then
									case when cardinality(as_dates_for_yearly) <> 0 then 
									cast(fiscal_date_of_month as text) = any(as_dates_for_yearly) and cast(fiscal_month_of_the_year as text) = any(as_months_for_yearly)
									else cast(fiscal_week_of_month as text) = any(as_weeks_for_yearly)  AND UPPER(day) = ANY(as_days_for_yearly) and cast(fiscal_month_of_the_year as text) = any(as_months_for_yearly)
									end
							end 
						end
                	end
            	end
			end
            )
        group by
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
            9,
            10,
            11,
            12,
            13,
            14,
            15,
            16,
            17,
            18,
            19,
            20,
            21,
            22,
            23,
            24,
            25,
            26,
            27,
            28,
            29,
            30,
            31,
            32,
            33,
            34,
            35,
            36,
            37,
            38,
            39,
            40,
            41,
            42,
			43
        );

        create temp table article_level_metrics on commit drop as (
        select
            article,
            coalesce(case
                when sum(tot_inv) = 0 then null
                else sum(forward_wos * tot_inv)/ sum(tot_inv)
            end,
            0) as article_weighted_fwos,
            avg(oh_dc) as dc_oh_inv
        from
            inventory_smart.article_inventory_dashboard as a
        join "global".store_attributes_filter as saf
                using(store_code)
        where
            store_category = 'STORE'
            and not exists (
                select 1 from inventory_smart.alerts_product_level apl
                where apl.article =a.article and apl.new_choice_flag = 1
            )
        group by
            1
        );

        create temp table constraints_table_filtered on commit drop as (
        select
            paf.article,
            AVG(wos) as target_wos
        from
                inventory_smart.final_result_table frt
        join global.product_attributes_filter paf on
            frt.product_code = paf.product_code
        join global.store_attributes_filter saf on
            frt.store_code = saf.store_code
        join (
            select article
            from inventory_smart.article_inventory_dashboard aid 
            join "global".store_attributes_filter saf using(store_code)
            where not exists (
                select 1 from inventory_smart.alerts_product_level apl
                where apl.article =aid.article and apl.new_choice_flag = 1
            )
            and store_category = 'STORE'
            group by 1
        ) base using(article)
        where
            paf.active
            and saf.active
        group by
            paf.article
        );

        create temp table inventory_filtered on commit drop as (
        select
                article,
                product_code,
                store_code,
                coalesce(sum(oh + oo + it),
            0) total_inv
        from 
                inventory_smart.latest_inventory li
        join global.product_attributes_filter paf1
                using (product_code)
        join (
            select article
            from inventory_smart.article_inventory_dashboard aid 
            join "global".store_attributes_filter saf using(store_code)
            where not exists (
                select 1 from inventory_smart.alerts_product_level apl
                where apl.article =aid.article and apl.new_choice_flag = 1
            )
            and store_category = 'STORE'
            group by 1
        ) base using(article)
        group by
            article,
            product_code,
            store_code
        );

        create temp table article_avg_target_wos on commit drop as (
        select
            ea.article,
            target_wos as article_weighted_twos
        from
            inventory_smart.article_inventory_dashboard as ea
        join article_resolved_dc_store_policy ardsp on
            ea.article = ardsp.article
        join constraints_table_filtered as sscot on
            ea.article = sscot.article
        group by
            1,
            2
        );

        create temp table temp5 on commit drop as (
        select
            A.article
        from
            article_resolved_dc_store_policy A,
            article_level_metrics B,
            article_avg_target_wos c
        where
            A.article = b.article
            and b.article = c.article
        group by
            1
        );

        create temp table temp4 on commit drop as (
        select
            *
        from
            inventory_filtered li
        join temp5 as t5
                using(article)
        );

        -- ADDED: compute flags, include rule_expression, evaluate AST safely with AND fallback
        DROP TABLE IF EXISTS temp3;
        CREATE TEMP TABLE temp3 ON COMMIT DROP AS (
        SELECT
            t.*,
            CASE
              WHEN t.rule_expression IS NOT NULL AND cardinality(t.rule_expression) > 0 THEN
                COALESCE(
                  CASE WHEN inventory_smart.eval_rule_ast_safe(
                       t.rule_expression,
                       (t.cut_off_wos_flag > 0),
                       (t.cutoff_wos_threshold_flag > 0),
                       (t.min_dc_inventory_flag > 0),
                       (t.min_stock_flag > 0)
                  ) THEN 1 ELSE 0 END,
                  CASE WHEN t.no_condition_flag = 0
                        AND (t.cut_off_wos_flag <> 0
                             AND t.min_stock_flag <> 0
                             AND t.min_dc_inventory_flag <> 0
                             AND t.cutoff_wos_threshold_flag <> 0)
                  THEN 1 ELSE 0 END
                )
              ELSE
                CASE WHEN t.no_condition_flag = 0
                      AND (t.cut_off_wos_flag <> 0
                           AND t.min_stock_flag <> 0
                           AND t.min_dc_inventory_flag <> 0
                           AND t.cutoff_wos_threshold_flag <> 0)
                THEN 1 ELSE 0 END
            END AS condition_flag
        FROM (
            SELECT
                inner_x.*,
                CASE
                    WHEN greatest(
            cut_off_wos_flag,
                        min_stock_flag,
                        min_dc_inventory_flag,
                        cutoff_wos_threshold_flag
            ) > -1 THEN 0
                        ELSE 1
                    END AS no_condition_flag
            FROM (
                    SELECT DISTINCT 
            alm.article,
                        alm.article_weighted_fwos,
                        alm.dc_oh_inv,
                        aasot.auto_allocation_rule,
                        aasot.auto_allocation_schedular,
                        aasot.ar_threshold_wos_condition,
                        aasot.ar_threshold_wos_threshold,
                        aasot.ar_cut_off_wos,
                        aasot.ar_min_dc_inventory,
                        aasot.ar_minstock_condition,
                        aasot.ar_auto_approve_condition,
                        -- ADDED: include rule_expression for evaluation
                        aasot.rule_expression,
                        SUM(
            case
                when (coalesce(li.total_inv,0)) < sscot.min_stock then 1
                else 0
            end
            ) over (partition by alm.article) as minstock_counts,
                        case
                            when aasot.ar_cut_off_wos is not null then case
                                when alm.article_weighted_fwos <= aasot.ar_cut_off_wos then 1
                                else 0
                            end
                            else -1
                        end as cut_off_wos_flag,
                        case
                            when aasot.ar_minstock_condition is not null then case
                                when aasot.ar_minstock_condition is true then SUM(
                case
                    when coalesce(li.total_inv,0) < sscot.min_stock then 1
                    else 0
                end
                ) over (partition by alm.article)
                                else 0
                            end
                            else -1
                        end as min_stock_flag,
                        case
                            when aasot.ar_min_dc_inventory is not null then case
                                when alm.dc_oh_inv >= aasot.ar_min_dc_inventory then 1
                                else 0
                            end
                            else -1
                        end as min_dc_inventory_flag,
                        case
                            when (aasot.ar_threshold_wos_threshold is not null)
                                and (aasot.ar_threshold_wos_condition = 'lt') then case
                                    when alm.article_weighted_fwos < aasot.ar_threshold_wos_threshold*aatw.article_weighted_twos then 1
                                    else 0
                                end
                                when (aasot.ar_threshold_wos_threshold is not null)
                                    and (aasot.ar_threshold_wos_condition = 'gte') then case
                                        when alm.article_weighted_fwos >= aasot.ar_threshold_wos_threshold*aatw.article_weighted_twos then 1
                                        else 0
                                    end
                                    else -1
                                end as cutoff_wos_threshold_flag
                            from
                                article_level_metrics as alm
                            join article_resolved_dc_store_policy as aasot using (article)
                            join (
                                select frt1.*, paf1.article 
                                from inventory_smart.final_result_table frt1
                                join global.product_attributes_filter paf1
                                using(product_code)
                            ) as sscot using (article)
                            join article_avg_target_wos as aatw
                                    using (article)
                            left join temp4 as li using(product_code,store_code)
            ) inner_x
            ) t
        );

        create temp table res on commit drop as (
        select
            *,
            condition_flag + no_condition_flag as final_flag
        from
            temp3 c
        )
        ;

        create temp table three_way_join on commit drop as
        (with psm as (
            select paf.article,product_code, ppm.store_code
            from  inventory_smart.product_profile_mapping ppm 
            join "global".product_attributes_filter paf
            using(product_code)
            where paf.active and not paf.is_deleted
            and exists (
                select 1
                from (
                    select article from inventory_smart.article_inventory_dashboard aid1
                    join "global".store_attributes_filter saf using(store_code)
                    where saf.store_category = 'STORE'
                    and not exists (
                        select 1
                        from inventory_smart.alerts_product_level apl 
                        where apl.article = aid1.article
                    )	
                ) aid
                where paf.article = aid.article
            )
            group by 1,2,3
        ),
        pdm as (
                        SELECT
                            pmpd.product_code,
                            gdc.dc_code
                        FROM global.product_mapping_product_dc pmpd
                        JOIN global.distribution_centres gdc using(dc_code)
                        WHERE gdc.is_active AND NOT gdc.is_deleted
                        group by 1,2
        ),
        sdm as (
                        SELECT
                            gdc.dc_code, pmsd.store_code 
                        FROM global.product_mapping_store_dc pmsd
                        JOIN global.distribution_centres gdc using(dc_code)
                        WHERE gdc.is_active AND NOT gdc.is_deleted
                        group by 1,2
        )
        select article from psm
        join pdm using(product_code)
        join sdm using(store_code,dc_code)
        group by 1)
        ;

        create temp table article_list on commit drop as (
        select
            article
        from
            res a
        join three_way_join b
            using(article)
        where
            final_flag = 1
        group by
            1
        )
        ;

        create temp table temp6 on commit drop as (
        select
            paf.l0_name,
            paf.l0_id,
            paf.l2_name,
            paf.l3_name,
            paf.l4_name,
            paf.subbrand_code_desc,
            ar_auto_approve_condition,
            paf.article
        from
            global.product_attributes_filter paf
        join global.product_time_attributes pta
                using (product_code)
        join (
            select
                distinct article,
                ar_auto_approve_condition
            from
                article_resolved_dc_store_policy
            ) a
                using (article)
        join article_list b
                using(article)
        where
            attribute_value = 'active'
            and current_date between start_time and end_time
        group by
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8
        )
        ;

        create temp table temp7 on commit drop as (
        select
            a.l0_name as brand,
            a.l0_id,
            a.l2_name as category,
            a.l3_name as "class",
            a.l4_name as sub_class,
            a.subbrand_code_desc,
            ar_auto_approve_condition as auto_approve_flag,
            article,
            row_number() over (
            partition by a.l0_name,
            a.l0_id,
            a.l2_name,
            a.l3_name,
            a.l4_name,
            a.subbrand_code_desc
            ) as article_rn
        from
            temp6 as a
        )
        ;

        create temp table final_base on commit drop as (
        select
            brand,
            category,
            "class",
            sub_class,
            subbrand_code_desc,
            auto_approve_flag as auto_release,
			false as auto_approve_flag,
            int_div,
            l0_id,
            MAX(article_rn) as total_article_count,
            COUNT(distinct article) as article_count_per_row,
            ARRAY_AGG(article) as article_list
        from
            (
            select
                brand,
                l0_id,
                category,
                "class",
                sub_class,
                subbrand_code_desc,
                coalesce(auto_approve_flag,
                false) as auto_approve_flag,
                article,
                (article_rn - 1) as article_rn,
                ((article_rn - 1) / 20) as int_div
            from
                temp7 as a
        ) as b
        group by
            1,
            2,
            3,
            4,
            5,
            6,
            7,
            8,
			9);

        create temp table  user_id on commit drop as (
        select user_code from "global".user_master
        where email in ('ia_system@impactanalytics.co')
        group by 1
        );

        insert into inventory_smart.auto_allocation_input (brand,category,"class",sub_class,auto_release,auto_approve_flag,int_div,total_article_count,article_count_per_row,article_list,row_num,allocation_code)
        select brand,category,"class",sub_class,auto_release,auto_approve_flag,int_div,total_article_count,article_count_per_row,article_list,row_num,allocation_code from (
            select c.*, 
            CONCAT( '6_', c.user_code, '_', c.l0_id,'_',TO_CHAR(NOW() AT TIME ZONE 'EST', 'YYYYMMDD"T"HH24MISSUS'),c.row_num,c.auto_approve_flag::int) AS allocation_code
            from 
            (select *, 
            ROW_NUMBER() OVER (
                ORDER BY
                brand,
                category,
                "class",
                sub_class,
                subbrand_code_desc,
                auto_release,
                auto_approve_flag,
                int_div,
                b.user_code
            ) as row_num
            from final_base as a
            cross join user_id b
            ) c   
        ) d
        ;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
    end
$procedure$
;
