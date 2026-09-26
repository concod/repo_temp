--liquibase formatted sql
--changeset sidharth.harish@impactanalytics.co:fn_get_stores_recommendation_level_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated returnt type for fn_get_stores_recommendation_level_3
--rollback: SELECT 1

DROP FUNCTION if exists price_markdown.fn_get_stores_recommendation_level;
CREATE OR REPLACE FUNCTION price_markdown.fn_get_stores_recommendation_level(p_strategy_id integer, p_store_recommendation_level integer, p_store_ids bigint[])
 RETURNS TABLE(store_id integer,
  store_level_id integer,
   store_level_value text,
   channel_info character varying
   )
 LANGUAGE plpgsql
AS $function$
	begin
		return query
        with store_group_data_cte as(
		    select
		        smc.store_id,
				tss.sg_id,
				tsg.sg_name
		    from
			    (select unnest(p_store_ids) store_id) smc
		        left join global.tb_sg_store tss on smc.store_id = tss.store_id
				left join global.tb_store_group tsg on tsg.sg_id = tss.sg_id
			where tss.sg_id in (
				select store_group_id from price_markdown.tb_strategy_store_groups
				where strategy_id = p_strategy_id
			)
		)
		select sm.store_id,
			(
				case
					when srlc."name" = 's6' then sm.store_id
					when srlc."name" = 's5' then sm.s5_id
					when srlc."name" = 's4' then sm.s4_id
					when srlc."name" = 's3' then sm.s3_id
					when srlc."name" = 's2' then sm.s2_id
					when srlc."name" = 's1' then sm.s1_id
                    when srlc."name" = 's0' then sm.s0_id
                    when srlc."name" = '-100' then sgdc.sg_id
					when srlc."name" = '-200' then -200
					else sgdc.sg_id
				end
			) as store_recommendation_level,
			(
				case
					when srlc."name" = 's6' then sm.store_name::text
					when srlc."name" = 's5' then sm.s5_name::text
					when srlc."name" = 's4' then sm.s4_name::text
					when srlc."name" = 's3' then sm.s3_name::text
					when srlc."name" = 's2' then sm.s2_name::text
					when srlc."name" = 's1' then sm.s1_name::text
                    when srlc."name" = 's0' then sm.s0_name::text
                    when srlc."name" = '-100' then sgdc.sg_name::text
					when srlc."name" = '-200' then 'Overall'::text
					else sgdc.sg_name::text
				end
			) as store_recommendation_value,
            sm.s1_name as channel_info
		from (
			select
				"name" as name
			from
				price_markdown.tb_view_by_config tvbc
			where
				tvbc.category = 'store_level'
				and tvbc.value = p_store_recommendation_level
		) srlc,
		price_markdown.tb_store_master sm
		left join
		store_group_data_cte sgdc on sgdc.store_id = sm.store_id
		where sm.store_id = any(p_store_ids);
	END;
$function$
;
