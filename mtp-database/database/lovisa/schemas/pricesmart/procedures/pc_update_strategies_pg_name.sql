--liquibase formatted sql
--changeset durgaprasad.tulugu@impactanalytics.co:pricesmart.pc_update_strategies_pg_name_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.pc_update_strategies_pg_name_1

DROP PROCEDURE if exists pricesmart.pc_update_strategies_pg_name;


CREATE OR REPLACE PROCEDURE pricesmart.pc_update_strategies_pg_name(IN _edit_pg_id integer, IN _new_pg_name text, IN _effected_strategies integer[] DEFAULT NULL::integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    _strategy_id INT;
BEGIN
    RAISE NOTICE 'Updating pg_id = % and pg_name = % for strategy IDs: %', _edit_pg_id, _new_pg_name, _effected_strategies;

    IF array_length(_effected_strategies, 1) > 0 THEN
        FOREACH _strategy_id IN ARRAY _effected_strategies
        LOOP
            RAISE NOTICE 'Updating strategy_id % with pg_id % and pg_name %', _strategy_id, _edit_pg_id, _new_pg_name;

            -- Update corresponding sku_store_mapping table
            EXECUTE format(
                'UPDATE price_markdown.tb_strategy_sku_store_mapping_%s
                 SET product_level_value = %L
                 WHERE product_level_id = %L',
                _strategy_id,
                _new_pg_name,
                _edit_pg_id
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
			         SET rowid = %L || ''_'' || tbl.store_level_value,
			             product_level_value = %L
			         WHERE 
						 tbl.product_level_id = %L',
			        _strategy_id,         -- for table name
			        _new_pg_name,         -- for rowid prefix
			        _new_pg_name,         -- for product_level_value
			        _edit_pg_id           -- for WHERE clause
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
			         SET rowid = %L || ''_'' || tbl.store_level_value,
			             product_level_value = %L
			         WHERE 
						 tbl.product_level_id = %L',
			        _strategy_id,         -- for table name
			        _new_pg_name,         -- for rowid prefix
			        _new_pg_name,         -- for product_level_value
			        _edit_pg_id           -- for WHERE clause
			    );
			END IF;


			-- Update discount table
			UPDATE 
				price_markdown.tb_strategy_discount
			SET 
				product_level_value = _new_pg_name
			WHERE 
				strategy_id = _strategy_id
			  	AND product_level_id = _edit_pg_id;


			-- Update discount table
			UPDATE 
				price_markdown.tb_strategy_discount_ia
			SET 
				product_level_value = _new_pg_name
			WHERE 
				strategy_id = _strategy_id
			  	AND product_level_id = _edit_pg_id;

			-- Update discount finalized table
			UPDATE 
				price_markdown.tb_strategy_discount_finalized
			SET 
				product_level_value = _new_pg_name
			WHERE 
				strategy_id = _strategy_id
			  	AND product_level_id = _edit_pg_id;

        END LOOP;
    END IF;

    RAISE NOTICE 'pg_name and pg_id updated for effected strategies.';
END;
$procedure$
;
