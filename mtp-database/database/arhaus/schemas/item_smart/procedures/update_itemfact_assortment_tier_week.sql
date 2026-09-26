--liquibase formatted sql
--changeset abhimanyu.j@impactanalytics.co:update_itemfact_assortment_tier_week runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:update_logic_itemfact_assortment_tier_week_initial_commit
--comment: logic changeset for update_itemfact_assortment_tier_week
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS item_smart.update_itemfact_assortment_tier_week();
CREATE OR REPLACE PROCEDURE item_smart.update_itemfact_assortment_tier_week()
 LANGUAGE plpgsql
AS $procedure$
BEGIN
TRUNCATE item_smart.itemfact_assortment_tier_week;

WITH weeks_all AS (
    	select calendar_date::date as fiscal_date, fiscal_year_week from global.fiscal_date_mapping
    ),
	updated_store_tier_table as (
		select 
			stt.store_code, store_tier, 
			coalesce(w1.fiscal_year_week,202001) as start_week, 
			coalesce(w2.fiscal_year_week,300001) as end_week
		from (
    			SELECT 
				    start_date::date, COALESCE(end_date::date, '3000-12-01'::date) AS end_date,store_code, store_tier
				FROM public.store_tier_itemsmart
				where store_tier is not null) stt
		left join weeks_all w1
		on stt.start_date = w1.fiscal_date
		left join weeks_all w2
		on stt.end_date = w2.fiscal_date),
	all_combinations as(
	select *
	from 
	(select distinct store_tier from updated_store_tier_table) upstt
	cross join (select distinct fiscal_year_week from weeks_all) wa
	)
	



-- Insert into the table
INSERT INTO item_smart.itemfact_assortment_tier_week (assortment_tier, current_week,store_count)
select 
    ac.store_tier as assortment_tier , ac.fiscal_year_week as current_week, count(distinct store_code) as store_count
from 
    all_combinations ac
left join updated_store_tier_table ustt
on ac.fiscal_year_week between ustt.start_week and ustt.end_week 
    and ac.store_tier = ustt.store_tier
group by 1,2
order by 2,1;

END $procedure$
;
