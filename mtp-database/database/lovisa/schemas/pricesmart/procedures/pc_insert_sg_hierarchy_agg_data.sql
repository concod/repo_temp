--liquibase formatted sql
--changeset utkarsh.tiwari@impactanalytics.co:pricesmart.pc_insert_sg_hierarchy_agg_data_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for pricesmart.pc_insert_sg_hierarchy_agg_data_1

DROP PROCEDURE if exists pricesmart.pc_insert_sg_hierarchy_agg_data;

CREATE OR REPLACE PROCEDURE pricesmart.pc_insert_sg_hierarchy_agg_data(IN _sg_id integer)
 LANGUAGE plpgsql
AS $procedure$
	DECLARE
        rec RECORD;
        dyn_sql TEXT := '';
        agg_cols TEXT := '';
        agg_select TEXT := '';
	BEGIN
		 -- Aggregate data for tb_sg_hierarchy_agg_data
        agg_cols := 'sg_id';
        agg_select := format('%s AS sg_id', _sg_id);

        FOR rec IN
            SELECT id_mapping, request_key
            FROM pricesmart.pricesmart_hierarchy_mapping
            WHERE is_product_hierarchy = FALSE
            ORDER BY id_mapping
        LOOP
            -- Add column name
            agg_cols := agg_cols || ', ' || quote_ident(rec.request_key);

            -- Select aggregated values from tb_sg_hierarchy
            agg_select := agg_select || format(
                ', (SELECT ARRAY_AGG(DISTINCT hierarchy_value) 
                FROM pricesmart.tb_sg_hierarchy 
                WHERE sg_id = %s AND hierarchy_level = %s)', 
                _sg_id, rec.id_mapping);
        END LOOP;

        dyn_sql := format(
            'INSERT INTO pricesmart.tb_sg_hierarchy_agg_data (%s) SELECT %s;',
            agg_cols, agg_select);

        RAISE NOTICE 'Executing Aggregate Insert from tb_sg_hierarchy: %', dyn_sql;
        EXECUTE dyn_sql;

	END;
$procedure$
;
