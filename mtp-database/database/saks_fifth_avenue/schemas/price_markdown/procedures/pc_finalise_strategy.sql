--liquibase formatted sql
--changeset liquibase:pc_finalise_strategy runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pc_finalise_strategy
--rollback: SELECT 1

DROP PROCEDURE if exists price_markdown.pc_finalise_strategy();
CREATE OR REPLACE PROCEDURE price_markdown.pc_finalise_strategy(IN _strategy_id integer, IN _source text)
 LANGUAGE plpgsql
AS $procedure$
	declare
		finalized_exists bool;
		finalised_table_name text;
		finalised_agg_table_name text;
		source_table_name text;
		source_disc_table_name text;
		blo_table_name text;
		blo_agg_table_name text;
		future_date date;
		future_pcd_id int;
		ia_finalised_flag int:= 0;
	begin
		select pcd_id, pcd_start_date
		into future_pcd_id, future_date
		from
			price_markdown.tb_strategy_pcd
		where
			pcd_start_date in (select min(pcd_start_date) from price_markdown.tb_strategy_pcd where pcd_start_date > date(timezone('EST', now())) and strategy_id = _strategy_id)
			and strategy_id = _strategy_id;
		raise notice 'rec date : % ', future_date::text;
		finalised_table_name :=  FORMAT('tb_%s_ssd_finalized', _strategy_id::text);
		finalised_agg_table_name := FORMAT('tb_%s_agg_finalized', _strategy_id::text);

		blo_table_name :=  FORMAT('tb_%s_ssd_blo', _strategy_id::text);
		blo_agg_table_name := FORMAT('tb_%s_agg_blo', _strategy_id::text);

		if _source = 'bl_override' then
			source_table_name := 'tb_'|| _strategy_id::text ||'_ssd_blo' ;
			source_disc_table_name := 'tb_strategy_discount' ;
		else
			source_table_name := 'tb_'|| _strategy_id::text ||'_ssd_ia' ;
			ia_finalised_flag := 1;
			source_disc_table_name := 'tb_strategy_discount_ia';
		end if;

		SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tb_'|| _strategy_id ||'_ssd_finalized' and table_schema='price_markdown') into finalized_exists;
		if not finalized_exists then
			call price_markdown.pc_create_mkd_sku_store_date(_strategy_id, 'price_markdown', 'finalized');
			call price_markdown.pc_create_mkd_agg_date(_strategy_id, 'price_markdown', 'finalized');
		end if;

		execute 'delete from price_markdown.' || finalised_table_name || ' where recommendation_date >= ''' || future_date || ''';' ;
		execute 'insert into price_markdown.' || finalised_table_name || ' select * from price_markdown.' || source_table_name || ' where recommendation_date >= ''' || future_date || ''';' ;
		delete from price_markdown.tb_strategy_discount_finalized where strategy_id = _strategy_id and pcd_id >= future_pcd_id;
		execute 'insert
			into
			price_markdown.tb_strategy_discount_finalized (strategy_id,
			product_level_id,
			product_level_value,
			store_level_id,
			store_level_value,
			pcd_id,
			markdown_percentage,
			is_locked)
		select
			strategy_id,
			product_level_id,
			product_level_value,
			store_level_id,
			store_level_value,
			pcd_id,
			markdown_percentage,
			is_locked
		from
			price_markdown.'|| source_disc_table_name ||'
		where
			strategy_id = ' || _strategy_id::text ||'
			and pcd_id >= ' || future_pcd_id::text ||';' ;
		execute 'delete from price_markdown.' || finalised_agg_table_name || ' where recommendation_date >= ''' || future_date || ''';' ;
		call price_markdown.pc_insert_mkd_resim_agg_bl_overide(_strategy_id, finalised_table_name, finalised_agg_table_name, future_date);
		call price_markdown.pc_trim_parent_strategy(_strategy_id);

		-- move data to blo table if source = 'ia'
		if _source = 'ia_recc' then
			raise notice 'move ia values to bl as well ';

			call price_markdown.pc_create_mkd_sku_store_date(_strategy_id, 'price_markdown', 'blo');

			execute 'delete from price_markdown.' || blo_table_name || ' where recommendation_date >= ''' || future_date || ''';' ;
			execute 'insert into price_markdown.' || blo_table_name || ' select * from price_markdown.' || source_table_name || ' where recommendation_date >= ''' || future_date || ''';' ;

			delete from price_markdown.tb_strategy_discount where strategy_id = _strategy_id and pcd_id >= future_pcd_id;
			insert
				into
				price_markdown.tb_strategy_discount (strategy_id,
				product_level_id,
				product_level_value,
				store_level_id,
				store_level_value,
				pcd_id,
				markdown_percentage,
				is_locked)
			select
				strategy_id,
				product_level_id,
				product_level_value,
				store_level_id,
				store_level_value,
				pcd_id,
				markdown_percentage,
				is_locked
			from
				price_markdown.tb_strategy_discount_ia
			where
				strategy_id = _strategy_id
				and pcd_id >= future_pcd_id;
			execute 'delete from price_markdown.' || blo_agg_table_name || ' where recommendation_date >= ''' || future_date || ''';' ;
			call price_markdown.pc_create_mkd_agg_date(_strategy_id, 'price_markdown', 'blo');
			call price_markdown.pc_insert_mkd_resim_agg_bl_overide(_strategy_id, blo_table_name, blo_agg_table_name, future_date);
		end if;

		update price_markdown.tb_strategy_master set (status, finalised_ia_recc, draft_scenario_present) = (2, ia_finalised_flag, false) where strategy_id = _strategy_id;
	exception
		when others then
            -- Handle the exception here or re-raise it
            raise notice 'Exception caught: %', SQLERRM;
	end;
$procedure$
;
