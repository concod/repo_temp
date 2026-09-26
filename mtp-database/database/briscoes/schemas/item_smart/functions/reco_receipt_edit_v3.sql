--liquibase formatted sql
--changeset kalyan.chandu@impactanalytics.co:reco_receipt_edit_v3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:reco_receipt_edit_v3
--comment: reco_receipt_edit_v3
--rollback: SELECT 1

DROP FUNCTION IF EXISTS item_smart.reco_receipt_edit_v3(jsonb, text, text, integer[]);

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
calendar_ref as (
-- date dictionary ranked for getting pre launch eligible weeks
select fiscal_year_week, rank() over (order by fiscal_year_week)  as rank
from(
select fiscal_year_week
from global.fiscal_date_mapping fdm 
where calendar_date >= current_date
group by 1) a
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
where a.launch_date >= current_date and launch_date <= current_date + interval ''2 years 26 weeks''
and  hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
),
launch_minus_initial_receipt as (
	select * 
	from (
		select hierarchy_code, launch_week, cr_1.fiscal_year_week as fiscal_year_week
		from launch_weeks lw
		left join calendar_ref_date cr_1
		on lw.launch_date - 14 = cr_1.calendar_date) base
	where fiscal_year_week is not null and fiscal_year_week >= (select min(fiscal_year_week) from calendar_ref_date)
	and hierarchy_code in(SELECT hierarchy_code FROM hierarchy_data)
),
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
select hierarchy_code, fiscal_year_week as first_eligible_week, lead_time
from (
select hierarchy_code, current_date,lead_time,-- current_date - interval (concat(coalesce(lead_time,0), '' days ''))
 CURRENT_DATE + coalesce(lead_time,0)::int as calendar_date -- edited week minus
from %s) a
join global.fiscal_date_mapping fdm 
using(calendar_date)
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
),
eligible_weeks as (
select distinct fiscal_year_week
from (
select *,  rank() over (partition by fiscal_year_month order by fiscal_year_week)
from(
select fiscal_year_month, fiscal_year_week
from global.fiscal_date_mapping fdm 
where calendar_date >= current_date
group by 1,2
order by 1,2) a
) b
where rank = 2
),
hier_eligible_weeks as(
select few.hierarchy_code, fiscal_year_week,last_eligible_week
from first_eligible_week few
left join eligible_weeks ew
on ew.fiscal_year_week >= few.first_eligible_week
left join last_eligible_week lew
on few.hierarchy_code = lew.hierarchy_code
where coalesce(fiscal_year_week <= last_eligible_week, true) and few.hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
),
reg_eligible_weeks as (
select *, 
	lead(fiscal_year_week) over (partition by hierarchy_code order by fiscal_year_week) as next_fiscal_year_week, 
	rank() over (partition by hierarchy_code order by fiscal_year_week asc) as week_set
from (
(
select hierarchy_code, fiscal_year_week from launch_minus_initial_receipt
union distinct 
select hierarchy_code, fiscal_year_week from hier_eligible_weeks )
) all_eligible
where hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
order by 1,2),

base as (
select hierarchy_code , current_week, target_fwos,sum(written_sales_units) as written_sales_units, sum(bop_units) as bop_units, SUM(on_order_placed_total_auc) as on_order_placed_total_auc,
sum( on_order_placed_total_unit) as  on_order_placed_total_unit,sum(on_order_unplaced_total_unit) as on_order_unplaced_total_unit
from %s
left join %s
using(current_week,hierarchy_code)
where current_week >=  (select min(fiscal_year_week) from  calendar_ref_date) 
and hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
group by 1,2,3),
rcpt_demand as(
select hierarchy_code, current_week, on_order_placed_total_auc, target_fwos, on_order_unplaced_total_unit, on_order_placed_total_unit,
	case when rcpt_demand>0 
		then rcpt_demand else 0 end as final_rcpt_demand
from(
select *, (sales_units_demand - coalesce((lead(sales_units_demand,ROUND(target_fwos)::INTEGER) over(partition by hierarchy_code order by current_week)),0)) - bop_units as rcpt_demand 
from (
select hierarchy_code, target_fwos, current_week, written_sales_units, bop_units,on_order_placed_total_auc,on_order_unplaced_total_unit,on_order_placed_total_unit,
		sum(written_sales_units) over (partition by hierarchy_code order by current_week desc) as sales_units_demand
from base
where hierarchy_code in (SELECT hierarchy_code FROM hierarchy_data)
) a)b
order by 1,2)
--select * from rcpt_demand
,
regular_weeks_reco as (
select hierarchy_code, current_week, reco_receipt_units,on_order_placed_total_auc
from ( 
	select *, COALESCE(lead(reco_rcpt_week_set) over (partition by hierarchy_code order by current_week asc),0) 
	+ COALESCE(on_order_unplaced_total_unit,0) + 
	COALESCE(on_order_placed_total_unit,0) as reco_receipt_units
	from (
		select *, max(final_rcpt_demand) over(partition by hierarchy_code, week_set) as reco_rcpt_week_set
		from(
				select rd.*, 
					case when aew_actual.fiscal_year_week is null then 0 else 1 end as status_eligible, 
						aew_actual.fiscal_year_week, aew.week_set, lead(aew.week_set) over (partition by rd.hierarchy_code) as lead_week_set
				from rcpt_demand rd
				left join reg_eligible_weeks aew
				on rd.hierarchy_code = aew.hierarchy_code and 
					rd.current_week > aew.fiscal_year_week and 
					rd.current_week <= aew.next_fiscal_year_week
				left join reg_eligible_weeks aew_actual
				on rd.current_week = aew_actual.fiscal_year_week
			) aa
		) bb
	 where lead_week_set is not null --and fiscal_year_week is not null
) cc
where fiscal_year_week is not null
group by  hierarchy_code, current_week, reco_receipt_units,on_order_placed_total_auc
order by hierarchy_code, current_week
)
select * from regular_weeks_reco
',
       	hierarchy_code_list,
		hierarchy_code_list,
       	itemfact_sku_table_name,
		itemfact_sku_table_name,
		itemfact_sku_table_name,
		itemfact_sku_table_name,
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
        		recomm_receipt_auc = cd.on_order_placed_total_auc
    		FROM complete_data_reco_receipts cd
    			WHERE wp.hierarchy_code = cd.hierarchy_code
      				AND wp.current_week = cd.current_week
      				AND wp.channel = ''DC'' 
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
      AND wp.channel = ''DC''
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