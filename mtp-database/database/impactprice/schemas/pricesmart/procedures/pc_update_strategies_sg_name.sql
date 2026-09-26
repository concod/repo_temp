--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:pricesmart.pc_update_strategies_sg_name_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.pc_update_strategies_sg_name_1

DROP PROCEDURE if exists pricesmart.pc_update_strategies_sg_name;


CREATE OR REPLACE PROCEDURE pricesmart.pc_update_strategies_sg_name(IN _edit_sg_id integer, IN _new_sg_name text, IN _effected_strategies integer[] DEFAULT NULL::integer[])
 LANGUAGE plpgsql
AS $procedure$
	DECLARE
		 _strategy_id INT;
	BEGIN
		RAISE NOTICE 'Updating sg_id = % and sg_name = % for strategy IDs: %', _edit_sg_id, _new_sg_name, _effected_strategies;

	    IF array_length(_effected_strategies, 1) > 0 THEN
	        FOREACH _strategy_id IN ARRAY _effected_strategies
	        LOOP
	            RAISE NOTICE 'Updating strategy_id % with sg_id % and sg_name %', _strategy_id, _edit_sg_id, _new_sg_name;
	
	            -- Update corresponding sku_store_mapping table
	            EXECUTE format(
	                'UPDATE price_markdown.tb_strategy_sku_store_mapping_%s
	                 SET store_level_value = %L
	                 WHERE store_level_id = %L',
	                _strategy_id,
	                _new_sg_name,
	                _edit_sg_id
	            );
	
				-- Update corresponding price_markdown_temp.tb_strategy_step4_full_ table
				IF EXISTS (
				    SELECT 1
				    FROM information_schema.tables
				    WHERE table_schema = 'price_markdown_temp'
				      AND table_name = format('tb_strategy_step4_full_%s', _strategy_id)
				) THEN
				    EXECUTE format(
				        'UPDATE price_markdown_temp.tb_strategy_step4_full_%s AS tbl
				         SET rowid = tbl.product_level_value || ''_'' || %L,
				             store_level_value = %L
				         WHERE 
							 tbl.store_level_id = %L',
				        _strategy_id,         -- for table name
				        _new_sg_name,         -- for rowid prefix
				        _new_sg_name,         -- for store_level_value
				        _edit_sg_id           -- for WHERE clause
				    );
				END IF;
	
	
				-- Update corresponding price_markdown_temp.tb_copy_table_data_cte_ table
				IF EXISTS (
				    SELECT 1
				    FROM information_schema.tables
				    WHERE table_schema = 'price_markdown_temp'
				      AND table_name = format('tb_copy_table_data_cte_%s', _strategy_id)
				) THEN
				    EXECUTE format(
				        'UPDATE price_markdown_temp.tb_copy_table_data_cte_%s AS tbl
				         SET rowid = tbl.product_level_value || ''_'' || %L,
				             store_level_value = %L
				         WHERE 
							 tbl.store_level_id = %L',
				        _strategy_id,         -- for table name
				        _new_sg_name,         -- for rowid prefix
				        _new_sg_name,         -- for store_level_value
				        _edit_sg_id           -- for WHERE clause
				    );
				END IF;
	
	
				-- Update discount table
				UPDATE 
					price_markdown.tb_strategy_discount
				SET 
					store_level_value = _new_sg_name
				WHERE 
					strategy_id = _strategy_id
				  	AND store_level_id = _edit_sg_id;
	
	
				-- Update discount table
				UPDATE 
					price_markdown.tb_strategy_discount_ia
				SET 
					store_level_value = _new_sg_name
				WHERE 
					strategy_id = _strategy_id
				  	AND store_level_id = _edit_sg_id;
	
				-- Update discount finalized table
				UPDATE 
					price_markdown.tb_strategy_discount_finalized
				SET 
					store_level_value = _new_sg_name
				WHERE 
					strategy_id = _strategy_id
				  	AND store_level_id = _edit_sg_id;
	
	        END LOOP;
	    END IF;
	
	    RAISE NOTICE 'sg_name and sg_id updated for effected strategies.';

	END;
$procedure$
;
