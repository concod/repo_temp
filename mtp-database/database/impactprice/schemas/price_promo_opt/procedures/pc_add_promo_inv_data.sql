--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_add_promo_inv_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for pc_add_promo_inv_data

DROP PROCEDURE if exists price_promo_opt.pc_add_promo_inv_data;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_add_promo_inv_data(IN var_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

DECLARE

	promo_inv_table TEXT;

	query TEXT;

BEGIN

	promo_inv_table := CONCAT('inventory_data_promo_', TO_CHAR(var_date, 'yyyymmdd'));



	call price_promo_opt.pc_create_date_partitions('price_promo', 'inventory_data_promo', 'day', '14 day', 'backwards');



	DELETE FROM price_promo.inventory_data_promo

	WHERE date_id = var_date or date_id < var_date - INTERVAL '7 day';



	query := FORMAT(

		'INSERT INTO price_promo.inventory_data_promo (

			date_id, parent_id, product_id, store_reco_level, channel,

			on_hand_qty, in_transit_qty, oo_qty, vendor_oo_qty, total_qty

		)(

			SELECT

				inventory_date as date_id, parent_id, product_id, store_reco_level, channel,

				ROUND(oh::NUMERIC, 2) as on_hand_qty,

				ROUND(it::NUMERIC, 2) as in_transit_qty,

				ROUND(oo::NUMERIC, 2) as oo_qty,

				ROUND(COALESCE(vendor_oo, 0)::NUMERIC, 2) as vendor_oo_qty,

				ROUND(total_inventory::NUMERIC, 2) as total_qty

			FROM

				"global".tb_latest_inventory_channel_agg tlia

			WHERE

				inventory_date = %L

		);', var_date

	);

	RAISE NOTICE 'Executing SQL QUERY: %', query;

	EXECUTE query;

END;

$procedure$
;

