--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:reco_receipt_edit_v4 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:item_smart_reco_receipt_edit_v3
--comment: initial changeset for reco_receipt_edit_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.reco_receipt_edit_v3(jsonb, text, text, _int4);

CREATE OR REPLACE FUNCTION item_smart.reco_receipt_edit_v3(filters jsonb, dept text, planing_level text, hierarchy_code_list integer[])
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
   updated_row_count INTEGER := 0;
   where_clause TEXT := '';
   wp_table_name TEXT;
   itemfact_sku_table_name TEXT;
   itemfact_sku_week_table_name TEXT;
   select_query TEXT;
   filter JSONB;
   attribute_name TEXT;
   values TEXT;
   operator TEXT;
   update_query1 TEXT;
   update_query2 TEXT;
   is_special_order_condition text;
begin
	-- Drop the temporary table
   DROP TABLE IF EXISTS complete_data_reco_receipts;
   wp_table_name := 'item_smart.wp_master_' || dept;
   itemfact_sku_table_name := 'item_smart.itemfact_sku_' || dept;
   itemfact_sku_week_table_name := 'item_smart.itemfact_sku_week_' || dept;
  	
  
     -- Build the WHERE clause dynamically from the filters
    FOR filter IN
    SELECT * FROM jsonb_array_elements(filters)
LOOP
    attribute_name := filter->>'attribute_name';
    values := (SELECT string_agg(quote_literal(value), ', ')
               FROM jsonb_array_elements_text(filter->'value') value);
    operator := filter->>'operator';
    
    -- Check if attribute_name is 'l3_name' and if any values have 'REGULAR_' or 'SPO_' prefixes
    IF planing_level = 'spo' AND attribute_name = 'l3_name' THEN
        IF values LIKE '%REGULAR_%' THEN
            is_special_order_condition := 'is_special_order = false';
            values := (SELECT string_agg(quote_literal(regexp_replace(value, '^REGULAR_', '')), ', ')
                       FROM jsonb_array_elements_text(filter->'value') value);
        ELSIF values LIKE '%SPO_%' THEN
            is_special_order_condition := 'is_special_order = true';
            values := (SELECT string_agg(quote_literal(regexp_replace(value, '^SPO_', '')), ', ')
                       FROM jsonb_array_elements_text(filter->'value') value);
        END IF;
    END IF;

    -- Skip certain attributes
    IF attribute_name NOT IN ('fiscal_month_name_abb', 'fiscal_quarter_name_abb', 'fiscal_year','fiscal_week') THEN
        -- Handle the 'in' operator and format the where_clause
        IF operator = 'in' THEN
            IF where_clause = '' THEN
                where_clause := format('%I %s (%s)', attribute_name, operator, values);
            ELSE
                where_clause := where_clause || format(' AND %I %s (%s)', attribute_name, operator, values);
            END IF;
        ELSE
            RAISE NOTICE 'Unsupported operator: %', operator;
        END IF;
    END IF;
END LOOP;

-- Append the is_special_order condition if applicable
IF is_special_order_condition <> '' THEN
    where_clause := where_clause || ' AND ' || is_special_order_condition;
END IF;
   
   RAISE NOTICE 'v_sql : %', where_clause;
 
	 
-- Form the SELECT query to populate the temporary table
   select_query := format(
       '
		CREATE TEMP TABLE complete_data_reco_receipts AS
		WITH hierarchy_data AS (
		   SELECT DISTINCT
		       pa.hierarchy_code
		   FROM (
		       SELECT hierarchy_code
		       FROM item_smart.mv_product_hierarchies_filter 
		       WHERE hierarchy_code = ANY(%L)
		       UNION ALL 
		       SELECT hierarchy_code
		       FROM item_smart.placeholders_info
		       WHERE hierarchy_code = ANY(%L)
		   ) pa
		),
calendar_ref_date as(
select calendar_date, fiscal_year_week, rank() over (order by calendar_date)  as rank
from global.fiscal_date_mapping fdm 
where calendar_date >= current_date),
calendar_ref_date_new as(
select calendar_date, fiscal_year_week, rank, rank_week, case when calendar_date >= min_date and calendar_date < max_date then -1 else 0 end 
from ( 
select calendar_date, fiscal_year_week, rank,  dense_rank() over (order by fiscal_year_week) as rank_week,
		min(calendar_date) over(partition by fiscal_year_week) as min_date, 
		max(calendar_date) over(partition by fiscal_year_week) as max_date
from calendar_ref_date) aa
),
launch_weeks as
(
select hierarchy_code, launch_date , 
	case when (launch_date is not null) and fiscal_year_week is null 
		 then (case when launch_date > current_date  then 300001 else 200001 end)
		when (launch_date is null)
		 then 300001
		else fiscal_year_week end as launch_week
from %s a 
left join global.fiscal_date_mapping fdm 
on a.launch_date = fdm.calendar_date 
where a.launch_date >= current_date and launch_date <= current_date + interval ''2 years''
and  hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
),
--launch_minus_initial_receipt as (
--	select * 
--	from (
--		select hierarchy_code, launch_week, cr_1.fiscal_year_week as fiscal_year_week
--		from launch_weeks lw
--		left join calendar_ref_date cr_1
--		on lw.launch_date - 14 = cr_1.calendar_date) base
--	where fiscal_year_week is not null and fiscal_year_week >= (select min(fiscal_year_week) from calendar_ref_date)
--	and hierarchy_code in(SELECT hierarchy_code FROM hierarchy_data)
--),
    /*launch_minus_pres_min_receipt as (
	select base.hierarchy_code, base.fiscal_year_week as current_week , presentation_min as reco_receipt_units
	from (
		select hierarchy_code, launch_week, cr_1.fiscal_year_week as fiscal_year_week
		from launch_weeks lw
		left join calendar_ref_date cr_1
		on lw.launch_date - 56 = cr_1.calendar_date ) base
	left join %s ifs
	on base.hierarchy_code = ifs.hierarchy_code
	where fiscal_year_week is not null and fiscal_year_week >= (select min(fiscal_year_week) from calendar_ref_date)
	and base.hierarchy_code in(SELECT hierarchy_code FROM hierarchy_data)
),*/
first_eligible_week as (
-- finding first eligible week of a sku
select hierarchy_code, greatest(lw.launch_week, fiscal_year_week) as first_eligible_week, lead_time
from (
select hierarchy_code, current_date,vendor_dc_lead_time as lead_time, -- current_date - interval (concat(coalesce(lead_time,0), '' days ''))
 CURRENT_DATE + coalesce(vendor_dc_lead_time,0)::int as calendar_date -- edited week minus
from %s) a
join global.fiscal_date_mapping fdm 
using(calendar_date)
left join launch_weeks lw
using(hierarchy_code)
where hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
),
last_eligible_week as(
select hierarchy_code, coalesce(fdm.fiscal_year_week,max_planning_week) as last_eligible_week  
from (
select hierarchy_code, least(clearance_date, exit_date) as last_eligible_date 
from %s) led
left join global.fiscal_date_mapping fdm
on fdm.calendar_date = led.last_eligible_date
left join 
(select max(fiscal_year_week) as max_planning_week from calendar_ref_date) aa
on true
where hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
)
--select * from last_eligible_week
,


eligible_weeks as (
select *
from 
	(
		select *
		from (
			select hierarchy_code, current_week as fiscal_year_week, reco_rcpt_week_flag from %s
			where target_fwos IS NOT null and hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data) and reco_rcpt_week_flag
			) a
		) b
)
--select * from eligible_weeks
, 

hier_eligible_weeks as(
select *,
	case when eligible_week_rank = 1 then 1 else 0 end as bop_not_greatest_flag
from (
select *, rank() over (partition by hierarchy_code order by fiscal_year_week) as eligible_week_rank
from
	(
		select few.hierarchy_code, fiscal_year_week,last_eligible_week--, bop_not_greatest_flag
		from first_eligible_week few	
		left join eligible_weeks ew
		on ew.hierarchy_code = few.hierarchy_code  and ew.fiscal_year_week >= few.first_eligible_week
		left join last_eligible_week lew
		on few.hierarchy_code = lew.hierarchy_code
		where coalesce(fiscal_year_week <= last_eligible_week, true) and few.hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
	) hew1
	) hew2
)
--select * from hier_eligible_weeks
,

reg_eligible_weeks as (
select *, 
	lead(fiscal_year_week) over (partition by hierarchy_code order by fiscal_year_week) as next_fiscal_year_week, 
	rank() over (partition by hierarchy_code order by fiscal_year_week asc) as week_set
from (
(

select hierarchy_code, fiscal_year_week, last_eligible_week, bop_not_greatest_flag from hier_eligible_weeks )
) all_eligible
where hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
order by 1,2)
--select * from reg_eligible_weeks
,

base as (
select channel,hierarchy_code , current_week, ROUND(target_fwos::NUMERIC)::INTEGER as fwos, bop_not_greatest_flag,
		sum(written_sales_units) as written_sales_units, 
		sum(bop_units) as bop_units, 
		SUM(
		  CASE
		    WHEN on_order_placed_total_auc IS NULL OR on_order_placed_total_auc = 0
		    THEN written_auc
		    ELSE on_order_placed_total_auc
		  END
		) as on_order_placed_total_auc,
		sum( on_order_placed_total_unit) as  on_order_placed_total_unit,
		sum(on_order_unplaced_total_unit) as on_order_unplaced_total_unit,
		sum(written_air) as written_air
from %s
left join %s
using(current_week,hierarchy_code)
left join (select hierarchy_code, fiscal_year_week as current_week, bop_not_greatest_flag from hier_eligible_weeks) c
using(hierarchy_code, current_week)
where 
current_week >=  (select min(fiscal_year_week) from  calendar_ref_date) and 
hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
group by 1,2,3,4,5
)
--select * from base
,

rcpt_demand_base as(
select channel,hierarchy_code, fwos, current_week, bop_not_greatest_flag,
		written_sales_units, bop_units,on_order_placed_total_auc,on_order_unplaced_total_unit,on_order_placed_total_unit,written_air,
		sum(written_sales_units) over (partition by channel, hierarchy_code order by current_week desc) as sales_units_demand,
		lag(fwos) over (partition by channel, hierarchy_code order by current_week) as fwos_lag
from base
where hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
)
--select * from rcpt_demand_base
,


rcpt_demand as (
select *,case when bop_not_greatest_flag = 1 then b.bop_units else b.bop_units end as bop_units_ref,
	--channel,hierarchy_code, current_week, on_order_placed_total_auc, fwos, on_order_unplaced_total_unit, on_order_placed_total_unit,
	--	lead(
		case when rcpt_demand>0 
			then rcpt_demand else rcpt_demand end
	--		) over (partition by channel, hierarchy_code order by current_week) 
			as final_rcpt_demand
	from(
	select *, sales_units_demand, (lead(sales_units_demand,ROUND(fwos_lag::NUMERIC)::INTEGER) over(partition by channel,hierarchy_code order by current_week)) as sales_units_demand_lead,
	((sales_units_demand - coalesce((lead(sales_units_demand,ROUND(fwos_lag::NUMERIC)::INTEGER) over(partition by channel,hierarchy_code order by current_week)),0)) 
		- 
--		greatest(
		bop_units
--		,0)
		) as rcpt_demand 
	from rcpt_demand_base a)b
	order by 1,2 
)
--select * from rcpt_demand
,


regular_weeks_reco as (

            SELECT mphf.l1_name as channel, hierarchy_code, current_week, 
--            		greatest(
            			COALESCE(reco_receipt_units,0) 
--            			- COALESCE(lag(coalesce(reco_receipt_units,0)) over (partition by hierarchy_code order by current_week),0)
            			
            			+ COALESCE(on_order_unplaced_total_unit,0) 
            			+ 
            			COALESCE(on_order_placed_total_unit,0) 
--            			+ case when bop_not_greatest_flag = 1 
--            					then least(coalesce(coalesce(bop_units_ref,0) - coalesce(written_sales_units,0),0),0)
--            					else 0 end
--            			,0) 
						as reco_receipt_units_prefinal, 
						case when bop_not_greatest_flag = 1 
            					then least(coalesce(coalesce(bop_units_ref,0) - coalesce(written_sales_units,0),0),0) 
            					else 0 end as check_col, 
						on_order_placed_total_auc,
            			written_air
            			,on_order_unplaced_total_unit, on_order_placed_total_unit, bop_units_ref, bop_not_greatest_flag
            FROM ( 
                SELECT *, lead(reco_rcpt_week_set) OVER (PARTITION BY hierarchy_code ORDER BY current_week ASC) AS reco_receipt_units
                FROM (
						select *, max(final_rcpt_demand) over(partition by hierarchy_code, week_set) as reco_rcpt_week_set
						from(
							select rd.*, 
									CASE WHEN aew_actual.fiscal_year_week IS NULL THEN 0 ELSE 1 END AS status_eligible, 
							        aew_actual.fiscal_year_week, aew.week_set, 
							        lead(aew.week_set) OVER (PARTITION BY rd.hierarchy_code) AS lead_week_set,
							        bop_units
							from 
								rcpt_demand rd
								left join (select hierarchy_code, fiscal_year_week as current_week, bop_not_greatest_flag from hier_eligible_weeks ) ew
								using(hierarchy_code, current_week)
								LEFT JOIN reg_eligible_weeks aew
						        ON rd.hierarchy_code = aew.hierarchy_code AND 
						        	rd.current_week > aew.fiscal_year_week AND 
						        	rd.current_week <= aew.next_fiscal_year_week
						        LEFT JOIN reg_eligible_weeks aew_actual
						        ON rd.current_week = aew_actual.fiscal_year_week AND
								   rd.hierarchy_code = aew_actual.hierarchy_code
						  ) aa
	   				) bb
                WHERE lead_week_set IS NOT null  or (lead_week_set IS null and week_set is not null)
                ) cc
                join (
                	select hierarchy_code, l1_name from item_smart.mv_product_hierarchies_filter 
                	union all 
                	select hierarchy_code, l1_name from item_smart.placeholders_info) mphf
                using(hierarchy_code)
            WHERE fiscal_year_week IS NOT NULL
-- --           GROUP BY hierarchy_code, current_week, reco_receipt_units, on_order_placed_total_auc
--            ORDER BY hierarchy_code, channel, current_week
--) cc
order by hierarchy_code, channel, current_week
)



select *,
	greatest( reco_receipt_units_prefinal 
	+ sum(check_col) over ( partition by hierarchy_code order by current_week ) ,0 
	) as reco_receipt_units 
	from regular_weeks_reco
',
       	hierarchy_code_list,
		hierarchy_code_list,
       	itemfact_sku_table_name,
		itemfact_sku_table_name,
		itemfact_sku_table_name,
		itemfact_sku_table_name,
		itemfact_sku_week_table_name,
		wp_table_name,
		itemfact_sku_week_table_name
       
   );
   RAISE NOTICE 'Formed SELECT query: %', select_query;
   -- Execute the dynamic SELECT query to create and populate the temporary table
   EXECUTE select_query;
   update_query1 := format('
    	UPDATE %s wp
    		SET 
        		recomm_receipt_units = cd.reco_receipt_units,
        		recomm_receipt_auc = cd.on_order_placed_total_auc,
				recomm_receipt_msrp_per_unit = cd.written_air,
				recomm_receipt_msrp = COALESCE(cd.reco_receipt_units, 0) * COALESCE(cd.written_air, 0)
    		FROM complete_data_reco_receipts cd
    			WHERE wp.hierarchy_code = cd.hierarchy_code
      				AND wp.current_week = cd.current_week
      				AND wp.channel = cd.channel
    ',
 		
 		wp_table_name
 		
 		);
  RAISE NOTICE 'Formed UPDATE query 1: %', update_query1;
   -- Execute the dynamic UPDATE queries sequentially
   EXECUTE update_query1;
  
     update_query2 := format(
    '
    UPDATE %s wp
    SET 
        recomm_receipt_cost = COALESCE(wp.recomm_receipt_units, 0) * COALESCE(wp.recomm_receipt_auc, 0)
    FROM complete_data_reco_receipts cd
    WHERE wp.hierarchy_code = cd.hierarchy_code
      AND wp.current_week = cd.current_week
      AND wp.channel = cd.channel
    ',
    wp_table_name
);
    RAISE NOTICE 'Formed UPDATE query 2: %', update_query2;
    -- Execute the dynamic UPDATE query
    EXECUTE update_query2;   
   GET DIAGNOSTICS updated_row_count = ROW_COUNT;
 
  RETURN updated_row_count;
END;
$function$
;