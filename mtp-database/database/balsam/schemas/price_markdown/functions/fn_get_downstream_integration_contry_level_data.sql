--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:fn_get_downstream_integration_contry_level_data_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:approval
--comment: fn_get_downstream_integration_contry_level_data_1
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_get_downstream_integration_contry_level_data;


CREATE OR REPLACE FUNCTION price_markdown.fn_get_downstream_integration_contry_level_data(_brand text)
 RETURNS TABLE("Event Name" text, "Offer Name" text, strategy_name text, price_start_date date, price_end_date date, brand text, productcode text, brandsku text, productprice real, saleprice real, currency text, "user" text, user_mail text, module text, "Offer Type" text, "Offer Value" text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
	_tomorrow_starting_pcds int[];
BEGIN
	if exists(select 1 from price_markdown.product_master pm where pm.l0_name = _brand) then
		
		create temp table contry_level_data on commit drop as
		with tomorrow_starting_pcds as(
			select 
				tsp.strategy_id,
				tsm.strategy_name, 
				tsp.pcd_id, 
				tsp.pcd_start_date,
				tsm.created_by,
				case 
					when array_length(tsr.applicable_value, 1) > 0  
					then tsr.applicable_value[1] 
					else null
				end as end_rule
			from 
				price_markdown.tb_strategy_pcd tsp 
			inner join 
				price_markdown.tb_strategy_master tsm using(strategy_id)
			inner join 
				price_markdown.tb_strategy_rule tsr on tsp.strategy_id = tsr.strategy_id and tsr.constraint_id = 3
			where 
				tsp.pcd_start_date = date(now()) + 1
		),
		required_discount_records as(
			select
				tsp.strategy_id,
				tsp.strategy_name,
				tsp.created_by,
				tsp.end_rule,
				tsp.pcd_start_date as price_start_date,
				'2099-12-31' as price_end_date,
				tsss.product_id,
				tsd.markdown_percentage
			from 
				price_markdown.tb_strategy_discount tsd 
			inner join 
				tomorrow_starting_pcds tsp on tsp.strategy_id = tsd.strategy_id and tsp.pcd_id = tsd.pcd_id 
			inner join 
				price_markdown.tb_strategy_sku_store_mapping tsss on tsss.strategy_id = tsd.strategy_id and tsss.product_level_id = tsd.product_level_id
			where 
				tsd.approval_status in('Initially Approved', 'Finally Approved')
		)
		select 
			rdr.strategy_name::text,
			rdr.price_start_date::date,
			rdr.price_end_date::date,
			pm.l0_name::text as brand,
			pm.l6_name::text as productcode,
			pm.brandsku::text,
			pm.msrp_with_vat::float4 as productprice,
			case 
				when rdr.end_rule is null 
		        then round(cast(pm.msrp_with_vat*(1 - rdr.markdown_percentage/100) as numeric), 2)::float4 
		        else (round(cast(pm.msrp_with_vat*(1 - rdr.markdown_percentage/100) - (rdr.end_rule/100) as numeric), 0)+(rdr.end_rule/100))::float4 
		    end as saleprice,
			pm.currency_id,
			pm.currency::text,
			um."name"::text as user,
			um.email::text as user_mail,
			'Clearance'::text as module,
			rdr.end_rule
		from 
			required_discount_records rdr
		inner join 
			price_markdown.product_master pm using(product_id)
		inner join
			"global".user_master um on um.user_code = rdr.created_by
		where 
			pm.l0_name = _brand;

		if _brand = 'BHUK' then
			return 
				query 
			select 
				null::text as "Event Name", null::text as "Offer Name",
				tbl.strategy_name, tbl.price_start_date, tbl.price_end_date, 
				tbl.brand, tbl.productcode, tbl.brandsku, tbl.productprice, 
				tbl.saleprice, tbl.currency, tbl.user, tbl.user_mail, tbl.module,
				null::text as "Offer Type", null::text as "Offer Value"
			from 
				(
					select 
						tb1.strategy_name, tb1.price_start_date, tb1.price_end_date, 
						tb1.brand, tb1.productcode, tb1.brandsku, tb1.productprice, 
						tb1.saleprice, tb1.currency, tb1.user, tb1.user_mail, tb1.module 
					from 
						contry_level_data tb1
					union all
					select 
						tb2.strategy_name, tb2.price_start_date, tb2.price_end_date, 
						tb2.brand, tb2.productcode, tb2.brandsku, tb2.productprice, 
						(round(cast( (tb2.saleprice * (select planned_conversion_multiplier from "global".actual_forex_rate afr where afr.source_currency_id = tb2.currency_id and afr.target_currency_id = 3 order by "date" desc limit 1) ) - (tb2.end_rule/100) as numeric), 0)+(tb2.end_rule/100))::float4,
						(select currency_name from global.tb_currency_master tcm where tcm.currency_id = 3)::text as currency, 
						tb2.user, tb2.user_mail, tb2.module
					from 
						contry_level_data tb2
				)tbl;
		else 
			return 
				query 
			select 
				null::text as "Event Name", null::text as "Offer Name",
				tbl.strategy_name, tbl.price_start_date, tbl.price_end_date, 
				tbl.brand, tbl.productcode, tbl.brandsku, tbl.productprice, 
				tbl.saleprice, tbl.currency, tbl.user, tbl.user_mail, tbl.module,
				null::text as "Offer Type", null::text as "Offer Value"
			from 
				contry_level_data tbl;	
		end if;
	else 
		RETURN QUERY
	    SELECT * FROM (
	        VALUES
	            (NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::DATE, NULL::DATE, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::FLOAT4, NULL::FLOAT4, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT)
	    ) AS t (
	        strategy_name,
	        price_start_date,
	        price_end_date,
	        brand,
	        productcode,
	        brandsku,
	        productprice,
	        saleprice,
	        currency,
	        "user",
	        user_mail,
	        module
	    );
	end if;
END;
$function$
;
