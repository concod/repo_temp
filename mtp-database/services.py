import sys
import os
import glob
import csv
import subprocess
import shutil
import uuid
import copy
from colorama import Fore, Back, Style

#import sqlalchemy as sa
#from sqlalchemy.exc import SQLAlchemyError
#from sqlalchemy.pool import NullPool
#from sqlalchemy import create_engine
#from sqlalchemy_utils import database_exists, create_database
#from sqlalchemy import inspect
#from sqlalchemy import text as SQLQuery

import time
import urllib
import traceback
import json
from pathlib import Path
from collections import OrderedDict

import psycopg2
import psycopg2.extras
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import re

from Crypto.Cipher import AES
from datetime import date, timedelta, datetime
from ics import Calendar, Event
import requests

import logging
logging.basicConfig(filename='sync_error.txt', level=logging.ERROR,
format='%(asctime)s:%(levelname)s:%(message)s')

rules_map_parellel = {} # Must be global
tenants_list = [] # Must be global

def find_procedures_dirs(root_path):
	"""
	Recursively searches for directories named 'procedures' that are under
	a 'global' or 'public' directory. Returns a list of full paths.
	"""
	procedures_dirs = []
	for dirpath, dirnames, filenames in os.walk(root_path):
		if 'procedures' in dirnames:
			full_path = os.path.join(dirpath, 'procedures')
			# Check if parent directory is 'global' or 'public'
			parent_dir = os.path.basename(dirpath)
			if parent_dir.lower() in ('global', 'inventory_smart', 'public', 'assort', 'assort_smart', 'cluster_smart', 'oms', 'data_retention', 'app_cache'):
				procedures_dirs.append(full_path)
	return procedures_dirs

#tls = ['schemas'] + list(json.loads(os.environ.get('SCHEMAS')).keys())
#env = os.environ.get('ENV')
#for tl in tls:
#	if (tl not in ['ralph_lauren_eu', 'data_platform_qa'] and os.environ.get(tl + '_' + env, None)) or tl == 'schemas':
#		#pds = find_procedures_dirs('database/' + tl + '/schemas/')
#		#for pd in pds:
#		#	print("python3 sql_logging_injector.py " + pd + " --verbose")
#		tenants_list.append(tl)
#print(tenants_list)

common_schemas = ['cache', 'global', 'public', 'data_retention', 'datadog', 'app_cache', 'chat_gpt'] # both inventory and non inventory has dependencies on such
inventory_schemas = ['ada', 'data_platform', 'inventory_smart', 'forecast_smart', 'oms', 'genai'] + common_schemas

users_allowed_exceptions = ['DROP TRIGGER', 'DROP CONSTRAINT', 'DROP COLUMN', 'DROP VIEW', 'DROP TABLE', 'DROP MATERIALIZED VIEW', 'CASCADE', 'ONLY', 'TRUNCATE', 'DROP INDEX', 'TEMPORARY', 'INHERITS', 'STORAGE', 'WITHOUT', 'DROP TYPE', 'DROP SEQUENCE', 'RENAME', 'RESET']

generic_path = {
	"tables": [
		"schemas/global/tables/acl_master.sql",
		"schemas/global/tables/versioning.sql"
	]
}

class MyException(Exception):
    """Loop Exception"""

class PGSync:
	def check_deployment_mode(self, changed_schemas, all_schemas, deployment_mode):
		if deployment_mode:
			if deployment_mode == "FULL":
				return 'FULL', all_schemas
			if deployment_mode == "INVENTORY":
				return 'INVENTORY', list(set(all_schemas) & set(inventory_schemas))
			if deployment_mode == "NON_INVENTORY":
				non_inv_schemas = [item for item in all_schemas if item not in inventory_schemas]
				return 'NON_INVENTORY', non_inv_schemas + common_schemas
		else:
			if len(changed_schemas) == 0 or any(item in common_schemas for item in changed_schemas):
				return 'FULL', all_schemas
			if all(item in inventory_schemas for item in changed_schemas):
				return 'INVENTORY', list(set(all_schemas) & set(inventory_schemas))
			if any(item in inventory_schemas for item in changed_schemas) and not all(item in inventory_schemas for item in changed_schemas):
				return 'FULL', all_schemas
			else:
				non_inv_schemas = [item for item in all_schemas if item not in inventory_schemas]
				return 'NON_INVENTORY', non_inv_schemas + common_schemas

	def __del__(self):
		if self.connection:
			self.cursor.close()
			self.connection.close()

	def __init__(self, client='source', env='dev', is_local_db=False, is_super_user=False, user_name=None, password=None):
		switch = "{}_{}".format(client, env)

		if is_local_db:
			self.db_pass = os.environ.get('DB_PASSWORD')
			self.db_host = os.environ.get('DB_HOST')
			self.db_name = switch
			self.db_user = os.environ.get('DB_USER')
			self.db_port = os.environ.get('DB_PORT')
		else:
			tdb = json.loads(os.environ.get(switch))
			if is_super_user:
				self.db_pass = tdb['db_superpassword'] if password == None else password
				self.db_host = tdb['db_host']
				self.db_name = tdb['db_superuser'] # will check this line
				self.db_user = tdb['db_superuser'] if user_name == None else user_name
				self.db_port = tdb['db_port']
			else:
				self.db_pass = tdb['db_pass'] if password == None else password
				self.db_host = tdb['db_host']
				self.db_name = tdb['db_name']
				self.db_user = tdb['db_user'] if user_name == None else user_name
				self.db_port = tdb['db_port']
				self.db_host_original = tdb['db_host_original'] if 'db_host_original' in tdb else None
				self.db_port_original = tdb['db_port_original'] if 'db_port_original' in tdb else None

		#self.sqlalchemy_database_uri = "postgresql+psycopg2://{}:{}@{}:{}/{}?sslmode=disable".format(self.db_user, urllib.parse.quote(self.db_pass), self.db_host, self.db_port, self.db_name)

		self.env = env.replace('_non_inventory', '')
		self.client = client
		self.project = os.environ.get('PROJECT_ID')

		changed_schemas = json.loads(os.environ.get('changed_schemas', '[]'))
		if client == 'schemas':
			all_schemas = [d for d in os.listdir("database/" + client) if os.path.isdir(os.path.join("database/" + client, d))]
		else:
			all_schemas = (json.loads(os.environ.get('SCHEMAS')))[client]['schemas']

		deployment_mode, schemas = self.check_deployment_mode(changed_schemas, all_schemas, os.environ.get('DEPLOYMENT_MODE', None)) # based on products mode of deployment_mode

		self.schemas = []
		self.schemas.append("public") if "public" in schemas else None
		self.schemas.append("global") if "global" in schemas else None
		self.schemas.append("cache") if "cache" in schemas else None
		self.schemas.append("ada") if "ada" in schemas else None

		for sc in schemas:
			if sc not in self.schemas:
				self.schemas.append(sc)

		if is_local_db:
			self.create_db_if_not_exists()

		self.connection = None
		self.cursor = None

		# IMPORTANT: Do NOT modify the must-have rules controlling the flow.
		# These rules are critical for the integrity and stability of the system.
		self.reverse_rules_map = {
			"DROP EXISTING PROCEDURE": {
				"regex": r"(?i)\bDROP\s+PROCEDURE\s+IF\s+EXISTS\b",
				"exclusions": [
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_price_change_driver_data.sql",
            		"database/leslies/schemas/base_pricing/procedures/sp_price_change_driver_data.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_exception_report_summary_cards.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_exception_report_summary_cards.sql"
				]
			},
			"DROP EXISTING FUNCTION": {
				"regex": r"(?i)\bDROP\s+FUNCTION\s+IF\s+EXISTS\b",
				"exclusions": [
					"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_get_forecast_cal_config_by_strategy.sql",
					"database/schemas/inventory_smart/functions/get_tenant_timezone.sql"
				]
			},
			"DROP EXISTING VIEW": {
				"regex": r"(?i)\bDROP\s+VIEW\s+IF\s+EXISTS\b",
				"exclusions": [
					"database/arhaus/schemas/plan_smart/views/v_bu_lf_master_1.sql",
					"database/arhaus/schemas/plan_smart/views/v_bu_op_master_1.sql"
				]
			},
			"LB ENABLE": {
				"regex": r"(?i)\bliquibase\s+formatted\s+sql\b",
				"exclusions": []
			},
			"LB STRIP_COMMENTS": {
				"regex": r"(?i)\bstripComments\s*:\s*false\b",
				"exclusions": []
			},
			"LB STRIP_STMT": {
				"regex": r"(?i)\bsplitStatements\s*:\s*false\b",
				"exclusions": []
			},
			"LB CHANGESET": {
				"regex": r"(?i)\bchangeset\b",
				"exclusions": []
			},
			"LB RUN_ON_CHANGE": {
				"regex": r"(?i)\brunOnChange\s*:\s*true\b|\brunAlways\s*:\s*true\b",
				"exclusions": [
					"database/schemas/global/tables/get_table_version.sql",
					"database/schemas/global/tables/get_application_code_from_acl.sql",
					"database/psp/schemas/global/tables/get_application_code_from_acl.sql",
					"database/schemas/genai/tables/chatbot_chat_history.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_simulation_promo_week_with_store.sql",
					"database/figs/schemas/inventory_smart/tables/get_tenant_timezone.sql"
				]
			},
			"MISSING_PRIMARY_KEY": {
				"regex": r"(?i)\bPRIMARY\s+KEY\b",
				"exclusions": [
					"database/schemas/global/tables/product_mapping.sql",
					"database/schemas/global/tables/rcl_product_mapping_product_store.sql",
					"database/starboard/schemas/global/tables/rcl_product_mapping_product_store.sql",
					"database/schemas/global/tables/rcl_product_mapping_product_store_exceptions.sql",
     				"database/starboard/global/tables/rcl_product_mapping_product_store_exceptions.sql",
					"database/schemas/global/tables/rcl_versions_constraint.sql",
					"database/schemas/global/tables/sp_logs.sql",
					"database/schemas/global/tables/style_mapping.sql",
					"database/victorias_secret_international/schemas/global/tables/rcl_product_mapping_product_store.sql",
					"database/schemas/global/tables/get_table_version.sql",
					"database/schemas/global/tables/get_application_code_from_acl.sql",
					"database/psp/schemas/global/tables/get_application_code_from_acl.sql"
				]
			},
			"MISSING_UNIQUE_INDEX": {
				"regex": r"(?i)\bCREATE\s+UNIQUE\s+INDEX\b",
				"exclusions": []
			}
		}

		self.rules_map = {
			"DROP TRIGGER": {
				"regex": r"(?i)\bDROP\s+TRIGGER\b",
				"exclusions": []
			},
			"DROP PROCEDURE": {
				"regex": r"(?i)\bDROP\s+PROCEDURE\b",
				"exclusions": []
			},
			"DROP FUNCTION": {
				"regex": r"(?i)\bDROP\s+FUNCTION\b",
				"exclusions": [
					"database/schemas/global/tables/get_table_version.sql",
					"database/schemas/global/tables/get_application_code_from_acl.sql",
					"database/psp/schemas/global/tables/get_application_code_from_acl.sql",
					"database/figs/schemas/inventory_smart/tables/get_tenant_timezone.sql",
					"database/schemas/inventory_smart/functions/get_tenant_timezone.sql"
				]
			},
			"DROP CONSTRAINT": {
				"regex": r"(?i)\bDROP\s+CONSTRAINT\b",
				"exclusions": ["database/psp/schemas/global/tables/user_access_hierarchy_mapping.sql",
				"database/primark/schemas/inventory_smart/tables/forecast_kpi_table.sql",
				"database/schemas/global/tables/role_action_module_mapping.sql"
				]
			},
			"DROP COLUMN": {
				"regex": r"(?i)\bDROP\s+COLUMN\b",
				"exclusions": []
			},
			"DROP VIEW": {
				"regex": r"(?i)\bDROP\s+VIEW\b",
				"exclusions": []
			},
			"DROP TABLE": {
				"regex": r'\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:["\']?\w+["\']?\.)["\']?\w+["\']?',
				"exclusions": [
					"database/bealls/schemas/inventory_smart/procedures/build_product_profile_attributes_filter.sql",
				]
			},
			"DROP MATERIALIZED VIEW": {
				"regex": r"(?i)\bDROP\s+MATERIALIZED\s+VIEW\b",
				"exclusions": []
			},
			"DROP INDEX": {
				"regex": r"(?i)\bDROP\s+INDEX\b",
				"exclusions": []
			},
			"DROP EXTENSION": {
				"regex": r"(?i)\bDROP\s+EXTENSION\b",
				"exclusions": []
			},
			"DROP TYPE": {
				"regex": r"(?i)\bDROP\s+TYPE\b",
				"exclusions": []
			},
			"DROP SEQUENCE": {
				"regex": r"(?i)\bDROP\s+SEQUENCE\b",
				"exclusions": []
			},
			"DROP SCHEMA": {
				"regex": r"(?i)\bDROP\s+SCHEMA\b",
				"exclusions": []
			},
			"RENAME": {
				"regex": r"(?i)\bRENAME\b",
				"exclusions": [
					"database/figs/schemas/global/tables/product_attributes_filter.sql",
					"database/tommy_bahama/schemas/assort_smart/tables/line_plan_choice_launch.sql",
					"database/coach_na/schemas/inventory_smart/tables/po_master.sql",
					"database/primark/schemas/inventory_smart/tables/forecast_kpi_table.sql",
					"database/coach_na/schemas/inventory_smart/functions/supersession_query.sql",
					"database/coach_na/schemas/inventory_smart/functions/po_finalize_query.sql",
					"database/briscoes/schemas/assort_smart/tables/line_plan_image_upload.sql",
					"database/tillys/schemas/global/tables/product_attributes_filter.sql",
					"database/tillys/schemas/global/tables/product_store_hierarchy_mapping.sql",
					"database/tillys/schemas/inventory_smart/tables/dc_pack_inventory_version.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_last_approved_store_split_ratio.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_transaction_data_weekly.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_transaction_data_agg.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_transaction_data_daily.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_manage_attribute.sql",
					"database/impactprice/schemas/global/tables/product_store_hierarchy_mapping.sql"
				]
			},
			"FOREIGN TABLE": {
				"regex": r"(?i)\bFOREIGN\s+TABLE\b",
				"exclusions": [
					"database/schemas/global/procedures/copy_fdw_tables.sql"
				]
			},
			"TABLESPACE": {
				"regex": r"(?i)\bTABLESPACE\b",
				"exclusions": [
        			"database/bealls/schemas/global/materialized_views/aggregation_level_filter.sql",
           			"database/leslies/schemas/base_pricing/materialized_views/mv_bp_product_group_attributes_aggregated.sql",
					"database/leslies/schemas/base_pricing/materialized_views/mv_bp_store_group_attributes_aggregated.sql",
					"database/leslies/schemas/base_pricing/materialized_views/mv_strategy_stores_hierarchy_agg_data.sql",
					"database/leslies/schemas/base_pricing/materialized_views/mv_strategy_products_hierarchy_agg_data.sql",
					"database/leslies/schemas/base_pricing/materialized_views/mv_store_group_hierarchy_agg_data.sql",
     				"database/leslies/schemas/base_pricing/materialized_views/mv_rule_stores_hierarchy_agg_data.sql",
         			"database/leslies/schemas/base_pricing/materialized_views/mv_rule_products_hierarchy_agg_data.sql",
            		"database/leslies/schemas/base_pricing/materialized_views/mv_product_group_hierarchy_agg_data.sql",
					"database/carters/schemas/source_smart/materialized_views/allocation_rule_mv.sql",
					"database/carters/schemas/source_smart/materialized_views/allocation_rule_facility_eligibility_mv.sql",
					"database/carters/schemas/source_smart/materialized_views/allocation_filter_facility_eligibility_mv.sql",
					"database/lululemon/schemas/inventory_smart/materialized_views/ph_master.sql",
     				"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_bp_product_group_attributes_aggregated.sql",
					"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_bp_store_group_attributes_aggregated.sql",
					"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_strategy_stores_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_strategy_products_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_store_group_hierarchy_agg_data.sql",
     				"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_rule_stores_hierarchy_agg_data.sql",
         			"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_rule_products_hierarchy_agg_data.sql",
            		"database/crackerbarrel/schemas/base_pricing/materialized_views/mv_product_group_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing/functions/fn_competitor_positioning_heatmap_details.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_exception_report_exception_list.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_exception_report_exception_list.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_store_group_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_rule_stores_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_rule_products_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_strategy_products_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_product_group_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_strategy_stores_hierarchy_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_bp_store_group_attributes_aggregated.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/materialized_views/mv_bp_product_group_attributes_aggregated.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_exception_report_exception_list.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_competitor_positioning_heatmap_details.sql"
           		]
			},
			"RULE": {
				"regex": r"(?i)\b(CREATE|ALTER|DROP)\s+(RULE|POLICY)\b",
				"exclusions": [
					"database/leslies/schemas/base_pricing/tables/bp_store_master.sql",
					"database/leslies/schemas/base_pricing/tables/bp_product_master.sql",
					"database/crackerbarrel/schemas/base_pricing/tables/bp_store_master.sql",
					"database/crackerbarrel/schemas/base_pricing/tables/bp_product_master.sql"
				]
			},
			"LOCK": {
				"regex": r"(?i)\b(LOCK|ACCESS|SHARE|EXCLUSIVE|NOWAIT|WAIT)\b",
				"exclusions": [
					"database/pacsun/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/kik/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/pricesmart_generic/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/pricesmart_generic/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_get_event.sql",
					"database/impactprice/schemas/price_promo/functions/fn_create_event.sql",
					"database/impactprice/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/impactprice/schemas/price_promo/types/customer_restriction.sql",
					"database/impactprice/schemas/price_promo/functions/fn_get_event.sql",
					"database/impactprice/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/impactprice/schemas/price_promo/functions/fn_identify_event_restrictions_change.sql",
					"database/impactprice/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/impactprice/schemas/price_promo/functions/fn_update_event.sql",
					"database/impactprice/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/impactprice/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/impactprice/schemas/price_promo/types/product_restriction.sql",
					"database/impactprice/schemas/price_promo/types/store_restriction.sql",
					"database/impactprice/schemas/price_promo/functions/fn_create_promotion.sql",
                    "database/impactprice/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/impactprice/schemas/price_promo/types/customer_restriction.sql"
					"database/briscoes/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/bealls/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/balsam/schemas/price_promo/functions/fn_create_event.sql",
					"database/leslies/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/balsam/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/stevemadden/schemas/public/procedures/sync_hybrid_attributes.sql",
					"database/leslies/schemas/price_promo/functions/fn_create_event.sql",
					"database/balsam/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/leslies/schemas/price_promo/functions/fn_identify_event_restrictions_change.sql",
					"database/leslies/schemas/price_promo/types/product_restriction.sql",
					"database/pricesmart_generic/schemas/price_promo/types/product_restriction.sql",
					"database/schemas/base_pricing/types/priority_offer_type_enum.sql",
					"database/balsam/schemas/price_promo/functions/fn_identify_event_restrictions_change.sql",
					"database/pricesmart/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/leslies/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/leslies/schemas/price_promo/functions/fn_get_event.sql",
					"database/leslies/schemas/price_promo/functions/fn_update_event.sql",
					"database/leslies/schemas/price_promo/types/store_restriction.sql",
					"database/starboard/schemas/global/tables/product_attributes_filter.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/balsam/schemas/price_promo/types/product_restriction.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_identify_event_restrictions_change.sql",
					"database/pricesmart/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/balsam/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/carters/schemas/base_pricing/types/priority_offer_type_enum.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_update_event.sql",
					"database/saks_fifth_avenue/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_identify_event_restrictions_change.sql",
					"database/balsam/schemas/price_promo/functions/fn_get_event.sql",
					"database/leslies/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/leslies/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/balsam/schemas/price_promo/types/store_restriction.sql",
					"database/leslies/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/balsam/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/arhaus/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/pricesmart/schemas/price_promo/types/product_restriction.sql",
					"database/saks_fifth_avenue/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_get_event.sql",
					"database/fit/schemas/public/procedures/sync_hybrid_attributes.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/balsam/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/carters/schemas/item_smart/functions/get_tableau_summary.sql",
					"database/balsam/schemas/price_promo/functions/fn_update_event.sql",
					"database/schemas/global/procedures/db_health_checkup.sql",
					"database/leslies/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_create_event.sql",
					"database/tommy_bahama/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/peter_millar/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/crackerbarrel/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/arhaus_pivot/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/balsam/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/pricesmart/schemas/price_promo/types/store_restriction.sql",
					"database/pricesmart_generic/schemas/price_promo/types/store_restriction.sql",
					"database/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/pricesmart_generic/schemas/price_promo/functions/fn_create_event.sql",
					"database/pricesmart/schemas/price_promo/functions/fn_update_event.sql",
					"database/psp/schemas/price_promo/functions/fn_create_event.sql",
					"database/psp/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/psp/schemas/price_promo/functions/fn_get_event.sql",
					"database/psp/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/psp/schemas/price_promo/functions/fn_identify_event_restrictions_change.sql",
					"database/psp/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/psp/schemas/price_promo/functions/fn_update_event.sql",
					"database/psp/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/psp/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/psp/schemas/price_promo/types/product_restriction.sql",
					"database/psp/schemas/price_promo/types/store_restriction.sql",
					"database/leslies/schemas/price_promo/types/customer_restriction.sql",
					"database/psp/schemas/price_promo/functions/fn_create_promotion.sql",
					"database/lovisa/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/starboard/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/schemas/global/functions/resend_otp_complete.sql",
					"database/schemas/global/functions/create_otp_challenge.sql",
					"database/schemas/global/functions/create_user_permissions.sql",
					"database/schemas/global/functions/update_user_permissions.sql",
				    "database/gap/schemas/price_promo/functions/fn_create_event.sql",
					"database/gap/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/gap/schemas/price_promo/functions/fn_get_event.sql",
					"database/gap/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/gap/schemas/price_promo/functions/fn_identify_event_restrictions_change.sql",
					"database/gap/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/gap/schemas/price_promo/functions/fn_update_event.sql",
					"database/gap/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/gap/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/gap/schemas/price_promo/types/product_restriction.sql",
					"database/gap/schemas/price_promo/types/store_restriction.sql",
					"database/gap/schemas/price_promo/functions/fn_create_promotion.sql",
                    "database/gap/schemas/price_markdown/functions/fn_lock_entire_strategy_discounts.sql",
					"database/gap/schemas/price_promo/types/customer_restriction.sql",
					"database/impactprice/schemas/price_promo/types/priority_offer_type_enum.sql",
					"database/impactprice/schemas/price_promo/types/store_restriction.sql",
					"database/impactprice/schemas/price_promo/types/product_restriction.sql",
					"database/impactprice/schemas/price_promo/functions/fn_identify_event_restrictions_change_new_flow.sql",
					"database/impactprice/schemas/price_promo/functions/fn_create_event_new_flow.sql",
					"database/impactprice/schemas/price_promo/functions/fn_get_event_new_flow.sql",
					"database/impactprice/schemas/price_promo/functions/fn_update_event_new_flow.sql",
					"database/briscoes/schemas/meta_schema/tables/tb_editable_flow.sql",
					"database/tommy_bahama/schemas/assort_smart/functions/create_partitions_for_lpcl_plan_codes.sql",
					"database/briscoes/schemas/assort_smart/functions/create_partitions_for_lpcl_plan_codes.sql",
					"database/carters/schemas/assort_smart/functions/create_partitions_for_lpcl_plan_codes.sql",
					"database/starboard/schemas/assort_smart/functions/create_partitions_for_lpcl_plan_codes.sql",
					"database/schemas/inventory_smart/procedures/build_kpi_mv.sql",
					"database/kik/schemas/assort_smart/functions/create_partitions_for_lpcl_plan_codes.sql",
					"database/cna/schemas/assort_smart/functions/create_partitions_for_lpcl_plan_codes.sql",
					"database/coach_na/schemas/public/procedures/sync_auto_allocation_input.sql"

				]
			},
			"SECURITY": {
				"regex": r"(?i)\bSECURITY\s+(?!DEFINER\b|INVOKER\b)\w+\b",
				"exclusions": []
			},
			"CASCADE": {
				"regex": r"(?i)\bCASCADE\b",
				"exclusions": [
						"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_update_zone_structures_v4.sql",
						"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_exception_report_summary_cards.sql",
						"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_exception_report_exception_list.sql",
						"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_setup_zone_structure_and_mappings.sql",
						"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_exception_report_exception_list.sql",
						"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_competitor_positioning_heatmap_details.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_simulation_day_split_ratio_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_simulation_store_split_ratio_kvi_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_transaction_data_agg_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_simulation_store_split_ratio_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_simulation_day_split_ratio_kvi_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_customer_segment_config_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_simulation_week_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_simulation_promo_week_with_store_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_store_master_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_product_master_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_transaction_data_weekly_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_bucket_config_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_transaction_data_daily_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_product_store_mapping_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_competitor_attributes_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_customer_segment_master_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_product_attributes_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_simulation_promo_week_res.sql",
						"database/crackerbarrel/schemas/public/procedures/sync_bp_product_master.sql",
						"database/crackerbarrel/schemas/base_pricing/procedures/sp_setup_zone_structure_and_mappings.sql"
					]
				}
			,
			"ONLY": {
				"regex": r"(?i)\bONLY\b",
				"exclusions": [
								"database/briscoes/schemas/public/procedures/auto_approve_first_cycle_orders.sql",
				               	"database/tillys/schemas/global/tables/product_attributes_filter.sql",
							   	"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_strategy_performance_metrics_monthly.sql",
								"database/lovisa/schemas/price_markdown_opt/procedures/pc_postprocess_create_gurobi_tb_versions.sql",
								"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_monthly_metrics_store_split.sql",
								"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_forecast_store_split.sql",
								"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_delete_table_view_and_manage_default_view.sql",
								"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_update_product_store_zone_attributes_v2.sql",
								"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_simulation_store_split_ratio.sql",
								"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_simulation_day_split_ratio.sql"
							]			
			},
			"TRUNCATE": {
				"regex": r"(?i)\bTRUNCATE\s+(?:TABLE\s+)?(?:[\"']?\w+[\"']?\.)\w+",
				"exclusions": []
			},
			"REINDEX": {
				"regex": r"(?i)\bREINDEX\b",
				"exclusions": []
			},
			"VACUUM": {
				"regex": r"(?i)\bVACUUM\b",
				"exclusions": [
					"database/schemas/global/procedures/db_health_checkup.sql",
					"database/schemas/global/tables/health_checkup_master.sql",
					"database/schemas/public/functions/parellel_insert.sql"
				]
			},
			"CLUSTER": {
				"regex": r"(?i)\bCLUSTER\b",
				"exclusions": [
					"database/tommy_bahama/schemas/assort_smart/functions/bulk_update_size_split_clusters.sql",
					"database/tommy_bahama/schemas/assort_smart/functions/update_size_delivery_split.sql",
					"database/briscoes/schemas/assort_smart/functions/update_size_delivery_split.sql",
					"database/briscoes/schemas/assort_smart/functions/bulk_update_size_split_clusters.sql",
					"database/starboard/schemas/assort_smart/functions/update_size_delivery_split.sql",
					"database/pricesmart_generic/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_clustering_store_level.sql",
					"database/homedepot/schemas/base_pricing/tables/bp_strategy_rule_segment_cluster_mapping.sql",
					"database/fit/schemas/public/procedures/sync_store_clusters.sql",
					"database/impactprice/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_clustering_store_level.sql",
                    "database/impactprice/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_temp_base.sql",
                    "database/impactprice/schemas/price_markdown_opt/procedures/pc_preprocess_get_store_cluster_base.sql",
                    "database/impactprice/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_schema.sql",
                    "database/impactprice/schemas/price_markdown_opt/procedures/pc_preprocess_get_data_for_clustering.sql",
					"database/figs/schemas/public/procedures/sync_store_clusters.sql",
					"database/lululemon/schemas/public/procedures/sync_store_clusters.sql",
					"database/pricesmart_generic/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_temp_base.sql",
					"database/ralph_lauren_eu/schemas/public/procedures/sync_store_clusters.sql",
					"database/ralph_lauren_na/schemas/public/procedures/sync_store_clusters.sql",
					"database/schemas/cluster_smart/functions/save_final_cluster_results.sql",
					"database/carters/schemas/assort_smart/functions/line_plan_wedge_opt_constraint.sql",
					"database/tapestry/schemas/public/procedures/sync_store_clusters.sql",
					"database/ralph_lauren_eu_is/schemas/public/procedures/sync_store_clusters.sql",
					"database/briscoes/schemas/assort_smart/tables/size_split_master.sql",
					"database/victorias_secret_international/schemas/inventory_smart/tables/store_clusters.sql",
					"database/carters/schemas/assort_smart/functions/bulk_update_size_split_clusters.sql",
					"database/saks_fifth_avenue/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_clustering_store_level.sql",
					"database/balsam/schemas/price_markdown_opt/procedures/pc_preprocess_get_data_for_clustering.sql",
					"database/pricesmart_generic/schemas/price_markdown_opt/procedures/pc_preprocess_get_store_cluster_base.sql",
					"database/pricesmart/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_schema.sql",
					"database/tommy_bahama/schemas/assort_smart/tables/size_split_master.sql",
					"database/victorias_secret/schemas/public/procedures/sync_store_clusters.sql",
					"database/coach_na/schemas/public/procedures/sync_store_clusters.sql",
					"database/schemas/assort/functions/update_plan_cluster_stores.sql",
					"database/schemas/assort_smart/functions/get_finalize_attribute_grade_details_list.sql",
					"database/schemas/cluster_smart/functions/save_final_cluster_results_new.sql",
					"database/pricesmart/schemas/price_markdown_opt/procedures/pc_preprocess_get_data_for_clustering.sql",
					"database/tommy_bahama/schemas/assort/functions/update_plan_cluster_stores.sql",
					"database/tommy_bahama/schemas/assort_smart/functions/line_plan_wedge_opt_constraint.sql",
					"database/pricesmart_generic/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_schema.sql",
					"database/balsam/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_temp_base.sql",
					"database/pricesmart/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_temp_base.sql",
					"database/ralph_lauren_apac/schemas/public/procedures/sync_store_clusters.sql",
					"database/briscoes/schemas/public/procedures/sync_store_clusters.sql",
					"database/homedepot/schemas/base_pricing/tables/bp_strategy_product_stores_details.sql",
					"database/victorias_secret_international/schemas/public/procedures/sync_store_clusters.sql",
					"database/schemas/inventory_smart/tables/store_clusters.sql",
					"database/balsam/schemas/price_markdown_opt/procedures/pc_preprocess_get_store_cluster_base.sql",
					"database/tommy_bahama/schemas/assort/functions/get_finalize_attribute_grade_details_list.sql",
					"database/tommy_bahama/schemas/assort_smart/functions/create_size_split_master_final_level_partitions.sql",
					"database/leslies/schemas/base_pricing/tables/bp_strategy_product_stores_details.sql",
					"database/schemas/cluster_smart/functions/add_ecom_details.sql",
					"database/stevemadden/schemas/public/procedures/sync_store_clusters.sql",
					"database/balsam/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_clustering_store_level.sql",
					"database/levis_us/schemas/public/procedures/sync_store_clusters.sql",
					"database/pacsun/schemas/public/procedures/sync_store_clusters.sql",
					"database/carters/schemas/assort_smart/tables/size_split_master.sql",
					"database/briscoes/schemas/assort_smart/functions/line_plan_wedge_opt_constraint.sql",
					"database/pricesmart/schemas/price_markdown_opt/procedures/pc_preprocess_get_store_cluster_base.sql",
					"database/carters/schemas/public/procedures/sync_store_clusters.sql",
					"database/pricesmart_generic/schemas/price_markdown_opt/procedures/pc_preprocess_get_data_for_clustering.sql",
					"database/leslies/schemas/base_pricing/tables/bp_strategy_rule_segment_cluster_mapping.sql",
					"database/saks_fifth_avenue/schemas/price_markdown_opt/procedures/pc_preprocess_get_data_for_clustering.sql",
					"database/ootb/schemas/public/procedures/sync_store_clusters.sql",
					"database/saks_fifth_avenue/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_temp_base.sql",
					"database/saks_fifth_avenue/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_schema.sql",
					"database/saks_fifth_avenue/schemas/price_markdown_opt/procedures/pc_preprocess_get_store_cluster_base.sql",
					"database/balsam/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_schema.sql",
					"database/schemas/assort/functions/get_finalize_attribute_grade_details_list.sql",
					"database/briscoes/schemas/assort_smart/functions/create_size_split_master_final_level_partitions.sql",
					"database/dollar_general/schemas/inventory_smart/tables/store_clusters.sql",
					"database/pricesmart/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_clustering_store_level.sql",
					"database/coach_na/schemas/inventory_smart/tables/store_clusters.sql",
					"database/signet/schemas/public/procedures/sync_store_clusters.sql",
					"database/dollar_general/schemas/public/procedures/sync_store_clusters.sql",
					"database/starboard/schemas/assort_smart/tables/size_split_master.sql",
					"database/starboard/schemas/assort_smart/functions/bulk_update_size_split_clusters.sql",
					"database/starboard/schemas/assort_smart/functions/line_plan_wedge_opt_constraint.sql",
					"database/starboard/schemas/assort_smart/functions/create_size_split_master_final_level_partitions.sql",
					"database/lululemon/schemas/inventory_smart/tables/store_clusters.sql",
                    "database/lovisa/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_temp_base.sql",
                    "database/lovisa/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_schema.sql",
                    "database/lovisa/schemas/price_markdown_opt/procedures/pc_preprocess_get_store_cluster_base.sql",
                    "database/lovisa/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_clustering_store_level.sql",
                    "database/lovisa/schemas/price_markdown_opt/procedures/pc_preprocess_get_data_for_clustering.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_strategy_forecast_details.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_strategy_rule_segment_cluster_mapping.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_strategy_product_stores_details.sql",
                    "database/gap/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_clustering_store_level.sql",
                    "database/gap/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_temp_base.sql",
                    "database/gap/schemas/price_markdown_opt/procedures/pc_preprocess_get_store_cluster_base.sql",
                    "database/gap/schemas/price_markdown_opt/procedures/pc_preprocess_create_store_cluster_schema.sql",
                    "database/gap/schemas/price_markdown_opt/procedures/pc_preprocess_get_data_for_clustering.sql",
					"database/tillys/schemas/inventory_smart/tables/store_clusters.sql",
					"database/kik/schemas/assort_smart/tables/size_split_master.sql",
					"database/kik/schemas/assort_smart/functions/bulk_update_size_split_clusters.sql",
					"database/kik/schemas/assort_smart/functions/line_plan_wedge_opt_constraint.sql",
					"database/kik/schemas/assort_smart/functions/update_size_delivery_split.sql",
					"database/kik/schemas/assort_smart/functions/create_size_split_master_final_level_partitions.sql",

					"database/leslies/schemas/base_pricing/procedures/sp_strategy_pre_processing_agg_data.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_strategy_pre_processing_fin_data.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_strategy_pre_processing_granular_data.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_strategy_pre_processing_granular_data_raw.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_strategy_pre_processing_agg_data_raw.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_strategy_forecast_bins_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_strategy_forecast_details.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_strategy_rule_segment_cluster_mapping.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_strategy_product_stores_details.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_pre_processing_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_pre_processing_fin_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_pre_processing_granular_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_forecast_bins_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_pre_processing_granular_data_raw.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_forecast_store_split.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_strategy_pre_processing_agg_data_raw.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_strategy_forecast_main.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_month_forecast_month_store_split.sql",
					"database/leslies/schemas/base_pricing/procedures/sp_strategy_monthly_transactions.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_month_forecast_month_store_split.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_strategy_monthly_transactions.sql",

					"database/cna/schemas/assort_smart/tables/size_split_master.sql",
					"database/cna/schemas/assort_smart/functions/bulk_update_size_split_clusters.sql",
					"database/cna/schemas/assort_smart/functions/line_plan_wedge_opt_constraint.sql",
					"database/cna/schemas/assort_smart/functions/update_size_delivery_split.sql",
					"database/cna/schemas/assort_smart/functions/create_size_split_master_final_level_partitions.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_strategy_pre_processing_agg_data.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_strategy_pre_processing_fin_data.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_strategy_forecast_bins_data.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_strategy_pre_processing_granular_data_raw.sql",
					"database/crackerbarrel/schemas/base_pricing/procedures/sp_strategy_pre_processing_agg_data_raw.sql",
					"database/cna/schemas/cluster_smart/functions/save_final_cluster_results.sql"
				]
			},
			"RESET": {
				"regex": r"(?i)\bRESET\b",
				"exclusions": [
					"database/signet/schemas/global/procedures/build_product_attributes_delta.sql",
					"database/data_platform_qa/schemas/global/procedures/build_product_attributes_delta.sql",
					"database/crackerbarrel/schemas/oms/functions/delete_oms_orders.sql",
					"database/schemas/global/functions/resend_otp_complete.sql"
				]
			},
			"DEFERRED": {
				"regex": r"(?i)\b(DEFERRED|DEFERRABLE)\b",
				"exclusions": [
					"database/saks_fifth_avenue/schemas/um/tables/user_roles.sql",
					"database/saks_fifth_avenue/schemas/um/tables/user_attributes.sql",
					"database/lovisa/schemas/global/functions/prevent_visible_name_dupes_fuc.sql",
					"database/primark/schemas/global/functions/prevent_visible_name_dupes_fuc.sql",
					"database/impactprice/schemas/price_promo_opt/procedures/simulation_step_3b_insert_procedure_v2.sql"
				]
			},
			"DISABLE": {
				"regex": r"(?i)\bDISABLE\b",
				"exclusions": []
			},
			"NOT VALID": {
				"regex": r"(?i)\bNOT\s+VALID\b",
				"exclusions": [
					"database/ralph_lauren_eu/schemas/inventory_smart/tables/excess_units_sku_store_level.sql",
					"database/ralph_lauren_eu_is/schemas/inventory_smart/tables/material_channel_alert_table.sql",
					"database/ootb/schemas/inventory_smart/tables/excess_units.sql",
					"database/impactprice/schemas/price_markdown_opt/functions/fn_calculate_estimated_time.sql",
					"database/victorias_secret/schemas/inventory_smart/tables/excess_units.sql",
					"database/ralph_lauren_na/schemas/inventory_smart/tables/alerts_product_store_level.sql",
					"database/ootb/schemas/inventory_smart/tables/alerts_product_store_level.sql",
					"database/ralph_lauren_na/schemas/inventory_smart/tables/loss_units.sql",
					"database/ralph_lauren_eu/schemas/inventory_smart/tables/excess_units.sql",
					"database/ralph_lauren_na/schemas/inventory_smart/tables/loss_units_sku_store_level.sql",
					"database/ralph_lauren_eu/schemas/inventory_smart/tables/loss_units.sql",
					"database/ralph_lauren_na/schemas/inventory_smart/tables/bulk_release_po_master.sql",
					"database/pricesmart_generic/schemas/price_markdown_opt/functions/fn_calculate_estimated_time.sql",
                    "database/lovisa/schemas/price_markdown_opt/functions/fn_calculate_estimated_time.sql",
					"database/ootb/schemas/inventory_smart/tables/loss_units_sku_store_level.sql",
					"database/victorias_secret/schemas/inventory_smart/tables/loss_units.sql",
					"database/ootb/schemas/inventory_smart/tables/loss_units.sql",
					"database/balsam/schemas/price_markdown_opt/functions/fn_calculate_estimated_time.sql",
					"database/victorias_secret/schemas/inventory_smart/tables/excess_units_sku_store_level.sql",
					"database/ralph_lauren_eu/schemas/inventory_smart/tables/loss_units_sku_store_level.sql",
					"database/ootb/schemas/inventory_smart/tables/excess_units_sku_store_level.sql",
					"database/victorias_secret/schemas/inventory_smart/tables/loss_units_sku_store_level.sql",
					"database/ralph_lauren_na/schemas/inventory_smart/tables/material_channel_alert_table.sql",
					"database/ralph_lauren_na/schemas/inventory_smart/tables/excess_units_sku_store_level.sql",
					"database/ralph_lauren_na/schemas/inventory_smart/tables/excess_units.sql",
					"database/gap/schemas/price_markdown_opt/functions/fn_calculate_estimated_time.sql"
				]
			},
			"UNLOGGED": {
				"regex": r"(?i)\bUNLOGGED\b",
				"exclusions": [
					"database/leslies/schemas/base_pricing/tables/bp_baseline_sales_overall.sql",
                    "database/leslies/schemas/base_pricing/tables/bp_unlogged_combinations.sql",
                	"database/crackerbarrel/schemas/base_pricing/tables/bp_baseline_sales_overall.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_unlogged_combinations.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_ps_filter_overall.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_ps_filter_overall_kvi.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_unlogged_competitor_positioning_heatmap.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_unlogged_competitor_positioning_heatmap_details.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_unlogged_competitor_positioning_summary_cards.sql",
                    "database/crackerbarrel/schemas/base_pricing/tables/bp_unlogged_competitor_positioning_current_cpi.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_baseline_sales_overall.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/tables/bp_unlogged_combinations.sql"					
				]
			},
			"TEMPORARY": {
				"regex": r"(?i)\b(TEMPORARY|TEMP)\b",
				"exclusions": []
			},
			"INHERITS": {
				"regex": r"(?i)\bINHERITS\b",
				"exclusions": []
			},
			"STORAGE": {
				"regex": r"(?i)\bSTORAGE\b",
				"exclusions": [
					"database/coach_na/schemas/inventory_smart/functions/po_finalize_query.sql"
				]
			},
			"WITHOUT": {
				"regex": r"(?i)\bWITHOUT\b",
				"exclusions": [
					"database/briscoes/schemas/oms/functions/oms_order_details_set_all.sql",
					"database/bealls/schemas/inventory_smart/functions/sku_po_allocated_units.sql",
					"database/bealls/schemas/inventory_smart/functions/sku_dc_allocated_units.sql",
					"database/bealls/schemas/inventory_smart/views/sku_dc_allocated_units.sql",
					"database/bealls/schemas/inventory_smart/views/sku_po_allocated_units.sql",
					"database/gap/schemas/price_promo_opt/functions/fn_get_rules_data.sql",
					"database/impactprice/schemas/price_promo_opt/functions/fn_get_rules_data.sql",
					"database/coach_na/schemas/inventory_smart/views/sku_po_allocated_units.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/procedures/sp_create_and_update_product_segment_zone_structure.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_validate_and_initialize_partition_with_subpartitioning.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_cleanup_future_approved_forecast_data.sql",
					"database/crackerbarrel/schemas/base_pricing_restaurant/functions/fn_bp_insert_rule_product_store_mapping.sql"
				]
			},
			"GLOBAL_TRUNCATE": {
				"regex": r'(?i)\bTRUNCATE\s+(TABLE\s+)?(?:"?global"?|\bglobal\b)\.\S+',
				"exclusions": [
					"database/saks_fifth_avenue/schemas/public/procedures/sync_store_master_promo_mkd.sql",
					"database/pricesmart/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_currency_master.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_future_inventory_po.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_latest_inventory.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_parent_lifecycle_mapping.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_latest_inventory_channel_agg.sql",
					"database/balsam/schemas/public/procedures/sync_store_master_promo_mkd.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_latest_inventory.sql",
					"database/balsam/schemas/public/procedures/sync_fiscal_date_mapping.sql",
					"database/balsam/schemas/public/procedures/sync_parent_lifecycle_mapping.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_parent_lifecycle_mapping.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_calendar_date_mapping.sql",
					"database/balsam/schemas/public/procedures/sync_actual_forex_rate.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_fiscal_calendar_date_mapping.sql",
					"database/victorias_secret/schemas/public/procedures/sync_product_dc_mapping.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_latest_inventory_channel_agg.sql",
					"database/pricesmart/schemas/public/procedures/sync_latest_inventory_dc.sql",
					"database/balsam/schemas/public/procedures/sync_tb_vat_master.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_store_master_promo_mkd.sql",
					"database/balsam/schemas/public/procedures/sync_fiscal_calendar_date_mapping.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_latest_inventory_dc.sql",
					"database/balsam/schemas/public/procedures/sync_tb_currency_master.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_country_currency_mapping.sql",
					"database/balsam/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/leslies/schemas/public/procedures/sync_tb_fiscal_date_mapping.sql",
					"database/pricesmart/schemas/public/procedures/sync_latest_inventory_agg.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_vat_master.sql",
					"database/leslies/schemas/public/procedures/sync_store_master_promo.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_calendar_date_mapping.sql",
					"database/balsam/schemas/public/procedures/sync_calendar_date_mapping.sql",
					"database/pricesmart/schemas/public/procedures/sync_latest_inventory_channel_agg.sql",
					"database/pricesmart/schemas/public/procedures/sync_store_master_promo_mkd.sql",
					"database/balsam/schemas/public/procedures/sync_po_data.sql",
					"database/balsam/schemas/public/procedures/sync_latest_inventory.sql",
					"database/balsam/schemas/public/procedures/sync_tb_currency_priority.sql",
					"database/leslies/schemas/public/procedures/sync_customer_channel_master.sql",
					"database/leslies/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_planned_forex_rate.sql",
					"database/pricesmart/schemas/public/procedures/sync_latest_inventory.sql",
					"database/psp/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_currency_priority.sql",
					"database/balsam/schemas/public/procedures/sync_latest_inventory_dc.sql",
					"database/saks_fifth_avenue/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/balsam/schemas/public/procedures/sync_tb_country_currency_mapping.sql",
					"database/leslies/schemas/public/procedures/sync_tb_latest_inventory_agg.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_actual_forex_rate.sql",
					"database/pricesmart/schemas/public/procedures/sync_fiscal_calendar_date_mapping.sql",
					"database/dollar_general/schemas/public/procedures/sync_product_store_attributes_filter.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_latest_inventory.sql",
					"database/pricesmart/schemas/public/procedures/sync_parent_lifecycle_mapping.sql",
					"database/balsam/schemas/public/procedures/sync_tb_country_master.sql",
					"database/balsam/schemas/public/procedures/sync_tb_future_inventory_po.sql",
					"database/balsam/schemas/public/procedures/sync_latest_inventory_channel_agg.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_fiscal_date_mapping.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_latest_inventory_dc.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_fiscal_calendar_date_mapping.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_fiscal_date_mapping.sql",
					"database/pricesmart_generic/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_latest_inventory_agg.sql",
					"database/balsam/schemas/public/procedures/sync_tb_fiscal_date_mapping.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_po_data.sql",
					"database/balsam/schemas/public/procedures/sync_tb_latest_inventory.sql",
					"database/leslies/schemas/public/procedures/sync_customer_master.sql",
					"database/leslies/schemas/public/procedures/sync_tb_calendar_date_mapping.sql",
					"database/leslies/schemas/public/procedures/sync_tb_latest_pricing.sql",
					"database/tommy_bahama/schemas/global/procedures/build_product_attributes_filter.sql",
					"database/leslies/schemas/public/procedures/sync_tb_latest_inventory.sql",
					"database/pricesmart/schemas/public/procedures/sync_calendar_date_mapping.sql",
					"database/pricesmart/schemas/public/procedures/sync_po_data.sql",
					"database/saks_fifth_avenue/schemas/public/procedures/sync_po_data.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_tb_country_master.sql",
					"database/balsam/schemas/public/procedures/sync_planned_forex_rate.sql",
					"database/pricesmart_generic/schemas/public/procedures/sync_latest_inventory_agg.sql",
					"database/balsam/schemas/public/procedures/sync_latest_inventory_agg.sql",
					"database/psp/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/impactprice/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/lovisa/schemas/global/procedures/pc_refresh_4_hierarchy_configs.sql",
					"database/crackerbarrel/schemas/public/procedures/sync_product_store_attributes_filter.sql"
				]
			},
			"INVALID PATH": {
                "regex": r"",
                "exclusions": []
			},
			"DCL": {
				"regex": r"(?i)\b(GRANT|REVOKE|PRIVILEGES)\b",
				"exclusions": []
			},
			"LB DISALLOWD": {
				"regex": r"(?i)\b(failOnError|runInTransaction|logicalFilePath|onValidationFail)\b",
				"exclusions": [
				]
			},
			"GENERIC_CODE": {
				"regex": r"",
				"exclusions": []
			}
		}

		global rules_map_parellel
		if not rules_map_parellel:
			rules_map_parellel = {**self.reverse_rules_map, **self.rules_map}

		self.bad_practices = {
			"ONLY": [],
			"DCL": [],
			"NO FILE": [],
			"DROP PROCEDURE": [],
			"NOT REQUIRED": [],
			"DROP FUNCTION": [],
			"TRUNCATE": []
		}

	# generating deterministic password
	def generate_password(self, user_name, encryption_key, length=12):
		cipher = AES.new(b"{encryption_key}", AES.MODE_ECB)
		encrypted_bytes = cipher.encrypt(user_name.ljust(64).encode())
		password = encrypted_bytes.hex()[:length]
		return password

	def create_user(self, roles, email, name, encryption_key, default_expiry_date, target_db_obj, custom_priv=None, custom_exp=None):
		password = self.generate_password(email, encryption_key)
		execution_flag = True
		errors = []
		success = []

		existing_user = self.get_results("SELECT count(1) as cnt FROM pg_roles WHERE rolname = '{}'".format(email))
		if existing_user[0]['cnt'] > 0:
			update = """ALTER ROLE "{}" PASSWORD '{}' VALID UNTIL '{}';""".format(email, password, default_expiry_date)
			execution_flag = execution_flag and self.execute_query(update)
			if not execution_flag:
				errors.append("Role creation for {} failed.".format(email))
		else:
			create_role_query = """CREATE ROLE "{}" WITH LOGIN INHERIT ENCRYPTED PASSWORD '{}' VALID UNTIL '{}';""".format(email, password, default_expiry_date)
			execution_flag = execution_flag and self.execute_query(create_role_query)
			if not execution_flag:
				errors.append("Role updation for {} failed.".format(email))
		if execution_flag:
			roles = [f'{role}' for role in roles]
			grant_query = f"""GRANT {', '.join(roles)} TO "{email}";"""
			execution_flag = execution_flag and self.execute_query(grant_query)
			if not execution_flag:
				errors.append("Role grant for {} failed.".format(email))

		#custom_grant_query = f'GRANT "mtp-custom{email}" TO {new_username}'
		#if roles == ['"mtp-custom1"']:
		#	select_custom_role = f"select rolname, rolvaliduntil from pg_catalog.pg_roles where rolname = 'mtp-custom{email}';"
		#	cursor.execute(select_custom_role)
		#	custom_existing_roles = cursor.fetchone()
		#	if custom_existing_roles:
		#		alter_expiry = f"""ALTER ROLE "mtp-custom{email}" VALID UNTIL %s"""
		#		cursor.execute(alter_expiry, (custom_exp,))
		#	else:
		#		custom_role_create = f"""CREATE ROLE "mtp-custom{email}" WITH LOGIN INHERIT VALID UNTIL '{custom_exp}';"""
		#		cursor.execute(custom_role_create)
		#	grant1 = f"""GRANT CONNECT ON DATABASE {database_string} TO "mtp-custom{email}";"""
		#	cursor.execute(grant1)
		#	print(custom_priv)
		#	custom_priv = [x.strip() for x in custom_priv.split(',')]
		#	print(custom_priv)
		#
		#	for priv in custom_priv:
		#		print(priv)
		#		split_priv = priv.split(".")
		#		schemaname = split_priv[0]
		#		tablename = split_priv[1]
		#		usage_grant = f'GRANT USAGE ON SCHEMA "{schemaname}" TO "mtp-custom{email}"'
		#		print(schemaname)
		#		cursor.execute(usage_grant)
		#		if tablename.lower() != "all":
		#			priv_grant = f'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE {priv} TO "mtp-custom{email}"'
		#			cursor.execute(priv_grant)
		#			print(priv_grant)
		#		else:
		#			priv_grant = f'GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA {schemaname} TO "mtp-custom{email}"'
		#			cursor.execute(priv_grant)
		#			print(priv_grant)
		#
		#	cursor.execute(custom_grant_query)
		#	print('custom role created')
		#else:
		#	cursor.execute(grant_query)
		#	print('normal role granted')

		if execution_flag:
			role_string = " "
			role_string = role_string.join(roles)
			html_body =  """<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css?family=Lato:400,700,900" rel="stylesheet"></head><body><p>Dear """ + name.title() + """,</p><p>Please find attached username, password and roles for the database: <b>""" + target_db_obj.db_name + """</b></p><table align="center" border="1" width="80%" cellspacing="0" cellpadding="0"><tr><th>Client</th><th>Env</th><th>Project</th><th>Username</th><th>Password</th><th>Roles</th></tr><tr><td align='center'>""" + self.client.title() + """</td><td align='center'>""" + self.env.title() + """</td><td align='center'>""" + self.project.upper() + """</td><td align='center'>""" + email + """</td><td align='center'>""" + password + """</td><td align='center'>""" + role_string + """</td></tr></table><p>Thanks,<br>DB Team<br>Impact Analytics</p><br></body></html>"""
			self.send_email(email, html_body, email, default_expiry_date, target_db_obj.db_name)
			success.append(f'Role/Grant for user: {email} done successfully')
		return [errors, success]

	def create_ics_content(self, username, expiry):
		cal = Calendar()
		event = Event()
		event.name = "Password Expiry Reminder"
		event.begin = expiry - timedelta(days=1)
		event.alarm = timedelta(days=-1, hours=12)  # Set a reminder 1 day before the event
		event.description = f"Your password for {username} will expire on {expiry}."
		event.organizer = "db-architects@impactanalytics.co"
		cal.events.add(event)
		return str(cal)

	def send_email(self, to_email, html_body, username, expiry, db_name):
		ics_content = self.create_ics_content(username, expiry)
		url = os.environ.get('MAILGUN_URL')
		auth = ("api", os.environ.get('MAILGUN_KEY'))
		data = {
			"from": 'info@impactanalytics.co',
			"to": to_email,
			#"to": "ashish@impactanalytics.co",
			"subject": "[Updated] DB Role/Credentials - {}".format(db_name),
			"html": html_body
		}
		files = [("attachment", ("invite.ics", ics_content))]
		response = requests.post(url, auth=auth, data=data, files=files)

	def set_default_permissions(self):
		if self.env == 'dev':
			admin_service_role = "{}-{}".format(self.project, self.env)
		elif self.env in ['test', 'prod']:
			dataingestion_service_role = "{}-{}".format(self.project, 'dataingestion')
			backend_service_role = "{}-{}".format(self.project, 'backend')
			readonly_service_role = "{}-{}".format(self.project, 'readonly')
			admin_service_role = "{}-{}".format(self.project, 'admin')
		elif self.env == 'uat':
			dataingestion_service_role = "{}-{}-{}".format(self.project, self.env, 'dataingestion')
			backend_service_role = "{}-{}-{}".format(self.project, self.env, 'backend')
			readonly_service_role = "{}-{}-{}".format(self.project, self.env, 'readonly')
			admin_service_role = "{}-{}".format(self.project, 'admin')

		admin_query = """
			DO $do$
			DECLARE
				_schema text;
				_st text;
				_is_alloy bool := (SELECT count(1) FROM pg_roles WHERE rolname = 'alloydbsuperuser');
			BEGIN
				REVOKE CONNECT ON DATABASE "{db_name}" FROM PUBLIC;
				GRANT CONNECT ON DATABASE "{db_name}" TO "{role}";
				GRANT CONNECT ON DATABASE "{db_name}" TO "datadog";
				FOR _schema IN SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN('pg_catalog', 'information_schema', 'google_vacuum_mgmt') and schema_name NOT LIKE 'pg_%' LOOP
					EXECUTE format($$ ALTER SCHEMA %I OWNER TO "{role}"; $$, _schema);
					EXECUTE format($$ GRANT USAGE, CREATE ON SCHEMA %I TO "{role}"; $$, _schema);
					
					-- EXECUTE format($$ GRANT EXECUTE ON ALL FUNCTIONS IN schema %I TO "{role}"; $$, _schema); -- this line is problamatic in case of alloydb because it has some super admin stuff that we can not override
					
					if _is_alloy and _schema = 'public' then
						for _st in select
							'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
						from
							pg_proc p
						join pg_namespace n on
							n.oid = p.pronamespace
						where
							n.nspname in('public')
							and prokind = 'f'
							and probin is null
							and pg_get_userbyid(proowner) != 'alloydbadmin' loop 
								execute _st;
						end loop;
					else
						for _st in select
							'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
						from
							pg_proc p
						join pg_namespace n on
							n.oid = p.pronamespace
						where
							n.nspname in('public')
							and prokind = 'f'
							and probin is null
							and pg_get_userbyid(proowner) != 'cloudsqladmin' loop 
								execute _st;
						end loop;
					end if;
					
					EXECUTE format($$ GRANT EXECUTE ON ALL PROCEDURES IN schema %I TO "{role}"; $$, _schema);
					EXECUTE format($$ GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO "{role}"; $$, _schema);
					EXECUTE format($$ GRANT ALL ON ALL TABLES IN SCHEMA %I TO "{role}"; $$, _schema);
					
					EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON TABLES TO "{role}"; $$, _schema);
					EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO "{role}"; $$, _schema);
					EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO "{role}"; $$, _schema);
				END LOOP;
				GRANT USAGE ON SCHEMA datadog TO datadog;
				GRANT USAGE ON SCHEMA public TO datadog;
			END $do$;""".format(db_name=self.db_name, role=admin_service_role)

		status = self.execute_query(admin_query)

		if self.env in ['test', 'uat', 'prod']:
			backend_query = """
				DO $do$
				DECLARE
					_schema text;
					_st text;
					_is_alloy bool := (SELECT count(1) FROM pg_roles WHERE rolname = 'alloydbsuperuser');
				BEGIN
					GRANT CONNECT ON DATABASE "{db_name}" TO "{role}";
					GRANT CREATE ON SCHEMA "public" TO "{role}";
					GRANT TEMPORARY ON DATABASE "{db_name}" TO "{role}";
					FOR _schema IN SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN('pg_catalog', 'information_schema', 'google_vacuum_mgmt') and schema_name NOT LIKE 'pg_%' LOOP
						EXECUTE format($$ GRANT USAGE ON SCHEMA %I TO "{role}"; $$, _schema);
						
						-- EXECUTE format($$ GRANT EXECUTE ON ALL FUNCTIONS IN schema %I TO "{role}"; $$, _schema); -- this line is problamatic in case of alloydb because it has some super admin stuff that we can not override
						
						if _is_alloy and _schema = 'public' then
							for _st in select
								'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
							from
								pg_proc p
							join pg_namespace n on
								n.oid = p.pronamespace
							where
								n.nspname in('public')
								and prokind = 'f'
								and probin is null
								and pg_get_userbyid(proowner) != 'alloydbadmin' loop 
									execute _st;
							end loop;
						else
							for _st in select
								'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
							from
								pg_proc p
							join pg_namespace n on
								n.oid = p.pronamespace
							where
								n.nspname in('public')
								and prokind = 'f'
								and probin is null
								and pg_get_userbyid(proowner) != 'cloudsqladmin' loop 
									execute _st;
							end loop;
						end if;
						
						EXECUTE format($$ GRANT EXECUTE ON ALL PROCEDURES IN schema %I TO "{role}"; $$, _schema);
						EXECUTE format($$ GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO "{role}"; $$, _schema);
						EXECUTE format($$ GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA %I TO "{role}"; $$, _schema);
						
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO "{role}"; $$, _schema);
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO "{role}"; $$, _schema);
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO "{role}"; $$, _schema);
					END LOOP;
					
					SET ROLE "{role}";
					ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO "{di_role}";
					ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO "{ro_role}";
					SET ROLE NONE;
				END $do$;""".format(db_name=self.db_name, role=backend_service_role, di_role=dataingestion_service_role, ro_role=readonly_service_role)

			dataingestion_query = """
				DO $do$
				DECLARE
					_schema text;
					_st text;
					_is_alloy bool := (SELECT count(1) FROM pg_roles WHERE rolname = 'alloydbsuperuser');
				BEGIN
					GRANT CONNECT ON DATABASE "{db_name}" TO "{role}";
					GRANT CREATE ON SCHEMA "public" TO "{role}";
					GRANT TEMPORARY ON DATABASE "{db_name}" TO "{role}";
					FOR _schema IN SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN('pg_catalog', 'information_schema', 'google_vacuum_mgmt') and schema_name NOT LIKE 'pg_%' LOOP
						EXECUTE format($$ GRANT USAGE ON SCHEMA %I TO "{role}"; $$, _schema);
						
						-- EXECUTE format($$ GRANT EXECUTE ON ALL FUNCTIONS IN schema %I TO "{role}"; $$, _schema); -- this line is problamatic in case of alloydb because it has some super admin stuff that we can not override
						
						if _is_alloy and _schema = 'public' then
							for _st in select
								'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
							from
								pg_proc p
							join pg_namespace n on
								n.oid = p.pronamespace
							where
								n.nspname in('public')
								and prokind = 'f'
								and probin is null
								and pg_get_userbyid(proowner) != 'alloydbadmin' loop 
									execute _st;
							end loop;
						else
							for _st in select
								'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
							from
								pg_proc p
							join pg_namespace n on
								n.oid = p.pronamespace
							where
								n.nspname in('public')
								and prokind = 'f'
								and probin is null
								and pg_get_userbyid(proowner) != 'cloudsqladmin' loop 
									execute _st;
							end loop;
						end if;
						
						EXECUTE format($$ GRANT EXECUTE ON ALL PROCEDURES IN schema %I TO "{role}"; $$, _schema);
						EXECUTE format($$ GRANT ALL ON ALL SEQUENCES IN SCHEMA %I TO "{role}"; $$, _schema);
						EXECUTE format($$ GRANT SELECT, DELETE, INSERT, UPDATE, TRUNCATE ON ALL TABLES IN SCHEMA %I TO "{role}"; $$, _schema);
						
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT, DELETE, INSERT, UPDATE, TRUNCATE ON TABLES TO "{role}"; $$, _schema);
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO "{role}"; $$, _schema);
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT ALL ON SEQUENCES TO "{role}"; $$, _schema);
					END LOOP;
					
					SET ROLE "{role}";
					ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO "{bk_role}";
					ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO "{ro_role}";
					SET ROLE NONE;
				END $do$;""".format(db_name=self.db_name, role=dataingestion_service_role, bk_role=backend_service_role, ro_role=readonly_service_role)

			readonly_query = """
				DO $do$
				DECLARE
					_schema text;
					_st text;
					_is_alloy bool := (SELECT count(1) FROM pg_roles WHERE rolname = 'alloydbsuperuser');
				BEGIN
					GRANT CONNECT ON DATABASE "{db_name}" TO "{role}";
					GRANT CREATE ON SCHEMA "public" TO "{role}";
					GRANT TEMPORARY ON DATABASE "{db_name}" TO "{role}";
					FOR _schema IN SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN('pg_catalog', 'information_schema', 'google_vacuum_mgmt') and schema_name NOT LIKE 'pg_%' LOOP
						EXECUTE format($$ GRANT USAGE ON SCHEMA %I TO "{role}"; $$, _schema);
						
						-- EXECUTE format($$ GRANT EXECUTE ON ALL FUNCTIONS IN schema %I TO "{role}"; $$, _schema); -- this line is problamatic in case of alloydb because it has some super admin stuff that we can not override
						
						if _is_alloy and _schema = 'public' then
							for _st in select
								'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
							from
								pg_proc p
							join pg_namespace n on
								n.oid = p.pronamespace
							where
								n.nspname in('public')
								and prokind = 'f'
								and probin is null
								and pg_get_userbyid(proowner) != 'alloydbadmin' loop 
									execute _st;
							end loop;
						else
							for _st in select
								'GRANT EXECUTE ON FUNCTION ' || n.nspname || '.' || p.oid::regprocedure::text || ' TO "{role}";'
							from
								pg_proc p
							join pg_namespace n on
								n.oid = p.pronamespace
							where
								n.nspname in('public')
								and prokind = 'f'
								and probin is null
								and pg_get_userbyid(proowner) != 'cloudsqladmin' loop 
									execute _st;
							end loop;
						end if;
						
						EXECUTE format($$ GRANT SELECT ON ALL TABLES IN SCHEMA %I TO "{role}"; $$, _schema);
						
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO "{role}"; $$, _schema);
						EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT EXECUTE ON FUNCTIONS TO "{role}"; $$, _schema);
					END LOOP;
					
					SET ROLE "{role}";
					ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO "{bk_role}";
					ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT ALL ON TABLES TO "{di_role}";
					SET ROLE NONE;
				END $do$;""".format(db_name=self.db_name, role=readonly_service_role, di_role=dataingestion_service_role, bk_role=backend_service_role)

			status = status and self.execute_query(backend_query)
			status = status and self.execute_query(dataingestion_query)
			status = status and self.execute_query(readonly_query)

		return status

	def init_db(self):
		status = self.execute_query("""CREATE SCHEMA IF NOT EXISTS liquibase;""")
		status = self.execute_query("""CREATE SCHEMA IF NOT EXISTS datadog;""")
		status = status and self.execute_query("""
			DO $do$
				DECLARE
					_schema text;
				BEGIN
					FOR _schema IN select
						schema_name
					from
						information_schema.schemata
					where
						schema_name
					not in('pg_catalog', 'information_schema', 'google_vacuum_mgmt')
					and schema_name NOT LIKE 'pg_%'
					LOOP
						EXECUTE format($$ ALTER SCHEMA %I OWNER TO "{}"; $$, _schema);
					END LOOP;
				END;
			$do$;
		""".format(self.db_user))
		return status

	def set_default_role_mapping(self):
		status = self.execute_query("""
			do $$
				DECLARE
					r RECORD;
					granted RECORD;
				BEGIN
					-- Loop through all matching users
					FOR r IN
						SELECT rolname, oid
						FROM pg_roles
						WHERE rolname LIKE '%@impactanalytics.co'
					LOOP
					-- RAISE NOTICE 'Processing user: %', r.rolname;
						-- Grant mtp-dev if exists
						IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mtp-dev') THEN
							raise notice '%', format('GRANT %I TO %I', 'mtp-dev', r.rolname);
							EXECUTE format('GRANT %I TO %I', 'mtp-dev', r.rolname);
						END IF;
						-- Grant mtp-readonly if exists
						IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mtp-readonly') THEN
							raise notice '%', format('GRANT %I TO %I', 'mtp-readonly', r.rolname);
							EXECUTE format('GRANT %I TO %I', 'mtp-readonly', r.rolname);
						END IF;
						-- Grant mtp-uat-readonly if exists
						IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mtp-uat-readonly') THEN
							raise notice '%', format('GRANT %I TO %I', 'mtp-uat-readonly', r.rolname);
							EXECUTE format('GRANT %I TO %I', 'mtp-uat-readonly', r.rolname);
						END IF;
						-- Revoke all other roles
						FOR granted IN
							SELECT gr.rolname
							FROM pg_auth_members m
							JOIN pg_roles gr ON gr.oid = m.roleid
							WHERE m.member = r.oid
							  AND gr.rolname NOT IN ('mtp-dev', 'mtp-readonly', 'mtp-uat-readonly')
						LOOP
							RAISE NOTICE 'Revoking role % from %', granted.rolname, r.rolname;
							EXECUTE format('REVOKE %I FROM %I', granted.rolname, r.rolname);
						END LOOP;
					END LOOP;
				end;
			$$
		""".format(self.db_user))
		return status

	def create_db(self):
		new_db = PGSync(self.client, self.env, False, False)
		self.create_db_if_not_exists(new_db.db_name)
		self.execute_query("""GRANT pg_monitor TO datadog;""")
		return self.execute_query("""ALTER DATABASE "{}" OWNER TO "{}";""".format(new_db.db_name, new_db.db_user))

	def create_super_user(self, role_name, role_pass, is_cloudsql, is_alloysql): # Executing from postgres user
		if is_cloudsql:
			status = self.execute_query("""
			DO $$ BEGIN
				IF NOT EXISTS (SELECT * FROM pg_roles WHERE rolname = '{role_name}') THEN
					CREATE ROLE "{role_name}" WITH LOGIN INHERIT ENCRYPTED PASSWORD '{role_pass}';
				END IF;
			END $$;""".format(role_name=role_name, role_pass=role_pass))
			status = status and self.execute_query("""GRANT cloudsqlsuperuser TO "{role_name}";""".format(role_name=role_name))
			status = status and self.execute_query("""GRANT "{role_name}" TO "{admin_role}";""".format(role_name=role_name, admin_role=self.db_user))
			status = status and self.execute_query("""ALTER USER "{role_name}" WITH REPLICATION;""".format(role_name=role_name))
		if is_alloysql:
			status = self.execute_query("""
			DO $$ BEGIN
				IF NOT EXISTS (SELECT * FROM pg_roles WHERE rolname = '{role_name}') THEN
					CREATE ROLE "{role_name}" WITH LOGIN INHERIT ENCRYPTED PASSWORD '{role_pass}';
				END IF;
			END $$;""".format(role_name=role_name, role_pass=role_pass))
			status = status and self.execute_query("""GRANT alloydbsuperuser TO "{role_name}";""".format(role_name=role_name))
			status = status and self.execute_query("""GRANT "{role_name}" TO "{admin_role}";""".format(role_name=role_name, admin_role=self.db_user))
		else:
			status = self.execute_query("""
			DO $$ BEGIN
				IF NOT EXISTS (SELECT * FROM pg_roles WHERE rolname = '{role_name}') THEN
					CREATE ROLE "{role_name}" WITH SUPERUSER LOGIN INHERIT ENCRYPTED PASSWORD '{role_pass}';
				END IF;
			END $$;""".format(role_name=role_name, role_pass=role_pass))
			status = status and self.execute_query("""GRANT "{role_name}" TO "{admin_role}";""".format(role_name=role_name, admin_role=self.db_user))
		return status

	def create_normal_user(self, role_name, role_pass):
		return self.execute_query("""
		DO $$ BEGIN
			IF NOT EXISTS (SELECT * FROM pg_roles WHERE rolname = '{role_name}') THEN
				CREATE ROLE "{role_name}" WITH LOGIN INHERIT ENCRYPTED PASSWORD '{role_pass}';
			END IF;
		END $$;""".format(role_name=role_name, role_pass=role_pass))

	def create_roles(self):
		new_db = PGSync(self.client, self.env, False, False)
		status = True
		is_cloudsql = False
		is_alloysql = False
		cloudsql_user = self.get_results("SELECT count(1) as cnt FROM pg_roles WHERE rolname = 'cloudsqlsuperuser'")
		if cloudsql_user[0]['cnt'] > 0:
			is_cloudsql = True

		alloy_user = self.get_results("SELECT count(1) as cnt FROM pg_roles WHERE rolname = 'alloydbsuperuser'")
		if alloy_user[0]['cnt'] > 0:
			is_alloysql = True

		if self.env == 'dev': #mtp-dev
			role_name = "{}-{}".format(self.project, self.env)
			status = status and self.create_super_user(role_name, new_db.db_pass, is_cloudsql, is_alloysql)
		else: #mtp-admin #mtp-backend #mtp-dataingestion #mtp-readonly
			role_name = "{}-{}".format(self.project, 'admin')
			status = status and self.create_super_user(role_name, new_db.db_pass, is_cloudsql, is_alloysql)

			role_name_backend = "{}-{}-{}".format(self.project, self.env, 'backend') if self.env == 'uat' else "{}-{}".format(self.project, 'backend')
			status = status and self.create_normal_user(role_name_backend, os.environ.get('BACKEND_PASS'))

			role_name_di = "{}-{}-{}".format(self.project, self.env, 'dataingestion') if self.env == 'uat' else "{}-{}".format(self.project, 'dataingestion')
			status = status and self.create_normal_user(role_name_di, os.environ.get('DATAINGESTION_PASS'))

			role_name_readonly = "{}-{}-{}".format(self.project, self.env, 'readonly') if self.env == 'uat' else "{}-{}".format(self.project, 'readonly')
			status = status and self.create_normal_user(role_name_readonly, os.environ.get('READONLY_PASS'))

			status = status and self.execute_query("""GRANT "{role_name_backend}", "{role_name_di}", "{role_name_readonly}" TO "{role_name}";""".format(role_name_backend=role_name_backend, role_name_di=role_name_di, role_name_readonly=role_name_readonly, role_name=role_name))

		#Datadog user
		status = status and self.create_normal_user("datadog", os.environ.get('DATADOG_PASS'))

		return status

	def restore_sql_file(self, f_path):
		#print("Restoring:", f_path)
		if os.stat(f_path).st_size > 0:
			_sql = Path(f_path).read_text() + " \nSELECT 1;"
			#return self.execute_query(_sql)
			return self.execute_query_with_reuseable_cursor(_sql)
		return True

	def validate_sql_file(self, f_path):
		#print("Scanning:", f_path)
		if os.stat(f_path).st_size > 0:
			_sql = Path(f_path).read_text()
			return self.scan_sql_file(f_path, _sql)

	def execute_query(self, sql):
		flag = False
		connection = None
		try:
			connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
			cursor = connection.cursor()
			cursor.execute(sql)
			connection.commit()
			flag = True
		except psycopg2.Error as e:
			#print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		finally:
			if connection:
				cursor.close()
				connection.close()
		return flag

	def execute_query_with_reuseable_cursor(self, sql):
		flag = False
		try:
			if not self.connection:
				self.connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
				self.cursor = self.connection.cursor()
			self.cursor.execute(sql)
			self.connection.commit()
			flag = True
		except psycopg2.Error as e:
			self.connection.rollback()
			#print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		return flag

	def execute_query_unsafe(self, sql):
		flag = False
		connection = None
		try:
			connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
			connection.set_session(autocommit=True)
			cursor = connection.cursor()
			cursor.execute(sql)
			connection.commit()
			flag = True
		except psycopg2.Error as e:
			#print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		finally:
			if connection:
				cursor.close()
				connection.close()
		return flag

	def insert_query(self, sql, params):
		flag = False
		connection = None
		try:
			connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
			cursor = connection.cursor()
			cursor.execute(sql, params)
			connection.commit()
			flag = True
		except psycopg2.Error as e:
			#print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		finally:
			if connection:
				cursor.close()
				connection.close()
		return flag

	def multi_insert_query(self, sql, params):
		flag = False
		connection = None
		try:
			connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
			cursor = connection.cursor()
			cursor.executemany(sql, params)
			connection.commit()
			flag = True
		except psycopg2.Error as e:
			print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		finally:
			if connection:
				cursor.close()
				connection.close()
		return flag

	def detect_vulnerability(self, filename, sql_content_without_comments, rules, sql_content_with_comments):
		failed = []
		for rule in rules:
			check_in_comments = False
			reg = None
			exc = []
			if rule in self.rules_map:
				reg = self.rules_map[rule]["regex"]
				exc = self.rules_map[rule]["exclusions"]
			if rule in self.reverse_rules_map:
				reg = self.reverse_rules_map[rule]["regex"]
				exc = list(set(exc + self.reverse_rules_map[rule]["exclusions"]))
			if reg is None:
				continue
			if 'LB ' in rule:
				check_in_comments = True
			if filename not in exc:
				content_to_check = sql_content_with_comments if check_in_comments else sql_content_without_comments
				
				# Find line numbers where pattern matches
				lines_with_match = []
				for line_num, line in enumerate(content_to_check.split('\n'), 1):
					if re.search(reg, line, re.IGNORECASE):
						lines_with_match.append(line_num)
				
				if lines_with_match:
					failed.append({
						'rule': rule,
						'lines': lines_with_match
					})
		
		# Return format compatible with old code
		return failed

	def detect_missing(self, filename, sql_content, rules):
		passed = []
		missing = []
		for rule in rules:
			reg = self.reverse_rules_map[rule]["regex"]
			exc = self.reverse_rules_map[rule]["exclusions"]
			if filename in exc:
				passed.append(rule)
			else:
				statements = re.findall(reg, sql_content, re.IGNORECASE)
				if statements:
					for st in statements:
						if not re.search(r'--.*' + re.escape(st), sql_content): # Check if line is not commented 
							passed.append(rule)
						else:
							if 'LB ' in rule: # Check if line commented then run must be like LB 
								passed.append(rule)
		
		# Return missing dependencies (rules not in passed list)
		for rule in rules:
			if rule not in passed:
				missing.append({
					'rule': rule,
					'lines': None  # File-level error, no specific line
				})
		
		return missing

	def comment_replacer(self, match):
		start,mid,end = match.group(1,2,3)
		if mid is None:
			# single line comment
			return ''
		elif start is not None or end is not None:
			# multi line comment at start or end of a line
			return ''
		elif '\n' in mid:
			# multi line comment with line break
			return '\n'
		else:
			# multi line comment without line break
			return ' '

	def scan_sql_file(self, filename, sql_content):
		filename_pattern = re.compile(
			r"^(?:database)(?:/[a-z0-9_-]+)?/schemas/[a-z0-9_-]+/"
			r"(?:[a-z0-9_-]+/)*"
			r"(functions|materialized_views|procedures|tables|triggers|types|views)/"
			r"[a-z0-9_-]+\.sql$",
			re.IGNORECASE
		)
		valid_file = bool(filename_pattern.match(filename))
		if not valid_file:
			#print(filename)
			return {
				"filename": filename,
				"vulnerabilities": ["INVALID PATH"],
				"missing": []
			}
		
		obj_type = filename.split("/")[-2]
		schema = filename.split("/")[-3]
		sql_file_name = filename.split("/")[-1]
		tenant = filename.split("/")[1]

		common_mnr = ['DROP TRIGGER', 'DROP MATERIALIZED VIEW', 'DROP CONSTRAINT', 'DROP TABLE', 'DROP INDEX', 'DROP VIEW', 'DROP PROCEDURE', 'DROP COLUMN', 'DROP FUNCTION',
		'ONLY', 'TRUNCATE', 'CASCADE', 'LB RUN_ON_CHANGE',
		'REINDEX', 'VACUUM', 'CLUSTER', 'RESET', 'DEFERRED', 'DISABLE', 'NOT VALID', 'UNLOGGED', 'TEMPORARY', 'INHERITS', 'STORAGE', 'WITHOUT', 'GLOBAL_TRUNCATE', 'DCL',
		'DROP EXTENSION', 'DROP TYPE', 'DROP SEQUENCE', 'DROP SCHEMA', 'RENAME', 'FOREIGN TABLE', 'TABLESPACE', 'RULE', 'LOCK', 'SECURITY', 'EMOJI_IN_SQL']
		#common_mnr.append('LB DISALLOWD')
		common_mhr = ['LB ENABLE', 'LB CHANGESET', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']

		if obj_type == 'tables':
			mnr = common_mnr + []
			mhr = common_mhr + []
			mnr = [item for item in mnr if item not in ['CASCADE']]
			if tenant != "data_platform_qa" and schema == "global" and "_generic_schema_mapping.sql" not in sql_file_name: # Special case all tables in global must has a PK
				mhr.append('MISSING_PRIMARY_KEY')

		elif obj_type == 'triggers':
			mnr = common_mnr + []
			mnr = [item for item in mnr if item not in ['LB RUN_ON_CHANGE', 'DROP FUNCTION']]
			mhr = common_mhr + []

		elif obj_type == 'views':
			mnr = common_mnr + []
			mnr = [item for item in mnr if item not in ['DROP VIEW', 'LB RUN_ON_CHANGE']]
			mhr = common_mhr + ['DROP EXISTING VIEW', 'LB RUN_ON_CHANGE']

		elif obj_type == 'materialized_views':
			mnr = common_mnr + []
			mnr = [item for item in mnr if item not in ['CASCADE', 'DROP MATERIALIZED VIEW', 'LB RUN_ON_CHANGE']]
			mhr = common_mhr + ['LB RUN_ON_CHANGE']
			if tenant != "data_platform_qa" and schema in inventory_schemas: # Special case for inventory_schemas MV must has a UK
				mhr.append('MISSING_UNIQUE_INDEX')

		elif obj_type == 'procedures':
			mnr = common_mnr + []
			mnr = [item for item in mnr if item not in ['DROP PROCEDURE', 'LB RUN_ON_CHANGE', 'TEMPORARY', 'UNLOGGED']]
			mhr = common_mhr + ['DROP EXISTING PROCEDURE', 'LB RUN_ON_CHANGE']
			if schema == "public" and "sync_" in sql_file_name: # Special case all function in public start with _sync can truncate
				mnr.remove('TRUNCATE')

		elif obj_type == 'functions':
			mnr = common_mnr + []
			mnr = [item for item in mnr if item not in ['DROP FUNCTION', 'LB RUN_ON_CHANGE', 'TEMPORARY', 'UNLOGGED']]
			mhr = common_mhr + ['DROP EXISTING FUNCTION', 'LB RUN_ON_CHANGE']

		elif obj_type == 'types':
			mnr = common_mnr + []
			mhr = common_mhr + []

		mnr.sort()
		mhr.sort()

		comment_re = re.compile(
			r'(^)?[^\S\n]*/(?:\*(.*?)\*/[^\S\n]*|/[^\n]*)($)?',
			re.DOTALL | re.MULTILINE
		)
		clean_sql_content = comment_re.sub(self.comment_replacer, sql_content)
		# Build stripped content exactly as detect_vulnerability will see it (so line counts match).
		content_to_check = re.sub('^\s*--.*\n?', '', clean_sql_content, flags=re.MULTILINE)
		stripped_lines = content_to_check.split('\n')
		clean_lines_list = clean_sql_content.split('\n')
		# Map stripped index (1-based) -> raw file line by matching content (re.sub can drop lines, so align by content).
		non_comment_list = [(line_num, line) for line_num, line in enumerate(clean_lines_list, 1) if not re.match(r'^\s*--', line)]
		stripped_to_raw = {}
		used_raw = set()
		for idx, st_line in enumerate(stripped_lines, 1):
			for raw_num, content in non_comment_list:
				if raw_num not in used_raw and (content == st_line or content.rstrip() == st_line.rstrip()):
					stripped_to_raw[idx] = raw_num
					used_raw.add(raw_num)
					break
			else:
				stripped_to_raw[idx] = idx  # fallback if no match
		vulnerabilities = self.detect_vulnerability(filename, content_to_check, mnr, clean_sql_content)
		missings = self.detect_missing(filename, clean_sql_content, mhr)
		# Convert to raw file line numbers so error messages and blame use real lines
		for v in vulnerabilities:
			if isinstance(v, dict) and v.get('lines'):
				v['lines'] = [stripped_to_raw.get(L, L) for L in v['lines']]
		for m in missings:
			if isinstance(m, dict) and m.get('lines'):
				m['lines'] = [stripped_to_raw.get(L, L) for L in m['lines']]
		#return {
		#	"filename": filename,
		#	"vulnerabilities": [],
		#	"missing": []
		#}
		return {
			"filename": filename,
			"vulnerabilities": vulnerabilities,
			"missing": missings
		}

	def compile_schema(self, client, run_exceptions_only=False):
		start_time = time.time()
		if client not in tenants_list:
			tenants_list.append(client)
		if "schemas" not in tenants_list:
			tenants_list.append("schemas")
		detect_some_bad_practices = False

		if not run_exceptions_only:
			for f in os.scandir("database"):
				if f.is_dir():
					if os.path.isfile("{}/exceptions.json".format(f.path)):
						if f.path.split('/')[-1] in tenants_list:
							ef = open("{}/exceptions.json".format(f.path), "r")
							cc = json.loads(ef.read())
							for c in cc:
								if c in users_allowed_exceptions:
									for e in cc[c]["exclusions"]:
										if os.path.isfile(e):
											self.rules_map[c]["exclusions"].append(e)
											# Bad Practices cases
											ctype = e.split('/')[-2]
											cfile = e.split('/')[-1]
											cprod = e.split('/')[-3]
											if c == 'ONLY' and ctype == 'tables':
												self.bad_practices[c].append(e)
												detect_some_bad_practices = True
											if c == 'DCL':
												self.bad_practices[c].append(e)
												detect_some_bad_practices = True
											if c == 'DROP PROCEDURE' and ctype == 'procedures':
												self.bad_practices[c].append(e)
												detect_some_bad_practices = True
											if c == 'DROP FUNCTION' and ctype == 'functions':
												self.bad_practices[c].append(e)
												detect_some_bad_practices = True
											#if c == 'TRUNCATE' and (ctype == 'functions' or ctype == 'procedures') and cprod == 'global':
											#	self.bad_practices[c].append(e)
											#	detect_some_bad_practices = True
											if cfile == 'custom_migration.sql':
												self.bad_practices["NOT REQUIRED"].append(e)
												detect_some_bad_practices = True
										#else:
										#	self.bad_practices["NO FILE"].append(e)
										#	detect_some_bad_practices = True

			if detect_some_bad_practices:
				bad_practices_errors = []
				print(Fore.RED + "Some bad exceptions detected, please fix the sql files and removes the exceptions before merge otherwise whole repo for all client will be down")
				for bpt in self.bad_practices:
					for bptf in self.bad_practices[bpt]:
						bad_practices_errors.append("{} - block_start1 vulnerability ({})block_end".format(bptf, bpt))
				print(Style.RESET_ALL)
				return bad_practices_errors

		#Clean and put back to exceptions.json
		#client_map = {}
		#default_rules_map = {}
		#for rm in self.rules_map:
		#	default_rules_map[rm] = {
		#		"regex": self.rules_map[rm]["regex"],
		#		"exclusions": []
		#	}
		#
		#for rm in self.rules_map:
		#	for rme in self.rules_map[rm]["exclusions"]:
		#		c = rme.split('/')[1]
		#		if c not in client_map:
		#			client_map[c] = copy.deepcopy(default_rules_map)
		#		client_map[c][rm]["exclusions"].append(rme)
		#
		#for cm in client_map:
		#	for rm in client_map[cm]:
		#		client_map[cm][rm]["exclusions"] = list(sorted(set(client_map[cm][rm]["exclusions"])))
		#	f = open("database/{}/exceptions.json".format(cm), "w")
		#	f.write(json.dumps(client_map[cm], indent=4))
		#	f.close()

		schema_tree = OrderedDict()
		for sc in self.schemas:
			schema_tree[sc] = {
                "types": [],
				"tables": [],
				"views": [],
				"functions": [],
				"triggers": []
			}

		statements = []
		self.cleanup_schemas()

		for sc in schema_tree.keys(): # Scan Client Specific Directory
			for filename in glob.iglob("database/{}/schemas/{}/**/*.sql".format(client, sc), recursive=True):
				obj_type = filename.split("/")[-2]

				if obj_type.lower() in ['triggers']:
					schema_tree[sc]['triggers'].append(filename)

				if obj_type.lower() in ['tables']:
					schema_tree[sc]['tables'].append(filename)
     
				if obj_type.lower() in ['types']:
					schema_tree[sc]['types'].append(filename)
     
				if obj_type.lower() in ['views', 'materialized_views']:
					schema_tree[sc]['views'].append(filename)

				if obj_type.lower() in ['functions', 'procedures']:
					schema_tree[sc]['functions'].append(filename)

		for sc in schema_tree.keys(): # Scan Common Specific Directory
			for filename in glob.iglob("database/schemas/{}/**/*.sql".format(sc), recursive=True):
				obj_type = filename.split("/")[-2]
				script_name = filename.split("/")[-1]

				if obj_type.lower() in ['triggers']:
					res = [i for i in schema_tree[sc]['triggers'] if script_name == i.split("/")[-1]]
					if len(res) == 0:
						schema_tree[sc]['triggers'].append(filename)

				if obj_type.lower() in ['tables']:
					res = [i for i in schema_tree[sc]['tables'] if script_name == i.split("/")[-1]]
					if len(res) == 0:
						schema_tree[sc]['tables'].append(filename)
      
				if obj_type.lower() in ['types']:
					res = [i for i in schema_tree[sc]['types'] if script_name == i.split("/")[-1]]
					if len(res) == 0:
						schema_tree[sc]['types'].append(filename)
      
				if obj_type.lower() in ['views', 'materialized_views']:
					res = [i for i in schema_tree[sc]['views'] if script_name == i.split("/")[-1]]
					if len(res) == 0:
						schema_tree[sc]['views'].append(filename)

				if obj_type.lower() in ['functions', 'procedures']:
					res = [i for i in schema_tree[sc]['functions'] if script_name == i.split("/")[-1]]
					if len(res) == 0:
						schema_tree[sc]['functions'].append(filename)

		# Scan sql files
		errors = []
		for sc in schema_tree.keys():
			for typ in schema_tree[sc]:
				for st in schema_tree[sc][typ]:
					vr = self.validate_sql_file(st)
					if len(vr['vulnerabilities']) > 0 or len(vr['missing']) > 0:
						# Format vulnerabilities with line numbers
						vuln_parts = []
						for v in vr['vulnerabilities']:
							rule = v['rule'] if isinstance(v, dict) else v
							lines = v.get('lines', []) if isinstance(v, dict) else []
							
							# Add to rules_map_parellel for exceptions
							rules_map_parellel[rule]["exclusions"].append(vr["filename"])
							
							if lines:
								# Show first 5 lines
								line_str = ','.join(map(str, lines))
								vuln_parts.append(f"{rule} (lines: {line_str})")
							else:
								vuln_parts.append(rule)
						
						# Format missing dependencies
						missing_parts = []
						for m in vr['missing']:
							rule = m['rule'] if isinstance(m, dict) else m
							lines = m.get('lines') if isinstance(m, dict) else None
							
							# Add to rules_map_parellel for exceptions
							rules_map_parellel[rule]["exclusions"].append(vr["filename"])
							
							if lines:
								line_str = ','.join(map(str, lines))
								missing_parts.append(f"{rule} (lines: {line_str})")
							else:
								missing_parts.append(f"{rule} (file-level)")
						
						# Build error message
						msg = []
						if vuln_parts:
							msg.append(f"{len(vr['vulnerabilities'])} {'vulnerability' if len(vr['vulnerabilities']) == 1 else 'vulnerabilities'} ({', '.join(vuln_parts)})")
						if missing_parts:
							msg.append(f"{len(vr['missing'])} {'missing dependency' if len(vr['missing']) == 1 else 'missing dependencies'} ({', '.join(missing_parts)})")
						
						msg_str = "{}, {}".format(msg[0], msg[1]) if len(msg) == 2 else msg[0]
						errors.append("{} - block_start{}block_end".format(vr['filename'], msg_str))

		if len(errors) > 0 or run_exceptions_only:
			return errors
		
		#print(f"S1: {time.time() - start_time:.4f} seconds")
		
		table_dependencies = {}
		for sc in schema_tree.keys():
			for st in schema_tree[sc]["types"]:
				statements.append(st)
			for st in schema_tree[sc]["tables"]:
				statements.append(st)
			for st in schema_tree[sc]["views"]:
				statements.append(st)
			for st in schema_tree[sc]["triggers"]:
				statements.append(st)
			table_dependencies[sc] = ""

		stc = 0
		errors = []
		retry_counter = 0
		retry_limit = len(statements)
		#print("statements 1:", statements)
		for st in statements:
			res = self.restore_sql_file(st)
			if res:
				table_dependencies[st.split("/")[-3]] += """\n\t<include file="{}" relativeToChangelogFile="false"/>""".format(st)
			else:
				statements.append(st)
			stc += 1
			try:
				if errors[-2] == errors[-1] and sum(errors[-errors[-2]:])/errors[-2] == sum(errors[-errors[-1]:])/errors[-1]:
					if retry_counter > retry_limit:
						errors_list = statements[-errors[-1]:]
						raise MyException()
					else:
						retry_counter += 1
				else:
					retry_limit = 0 if len(errors) == 0 else min(errors)
					retry_counter = 0
			except IndexError:
				pass
			except MyException:
				return errors_list
			errors.append(len(statements) - stc)

		#print(f"S2: {time.time() - start_time:.4f} seconds")

		sp_dependencies = {}
		statements = []
		for sc in schema_tree.keys():
			for st in schema_tree[sc]["functions"]:
				statements.append(st)
			sp_dependencies[sc] = ""

		stc = 0
		errors = []
		retry_counter = 0
		retry_limit = len(statements)
		for st in statements:
			res = self.restore_sql_file(st)
			if res:
				sp_dependencies[st.split("/")[-3]] += """\n\t<include file="{}" relativeToChangelogFile="false"/>""".format(st)
			if not res:
				statements.append(st)
			stc += 1
			try:
				if errors[-2] == errors[-1] and sum(errors[-errors[-2]:])/errors[-2] == sum(errors[-errors[-1]:])/errors[-1]:
					if retry_counter > retry_limit:
						errors_list = statements[-errors[-1]:]
						raise MyException()
					else:
						retry_counter += 1
				else:
					retry_limit = 0 if len(errors) == 0 else min(errors)
					retry_counter = 0
			except IndexError:
				pass
			except MyException:
				return errors_list
			errors.append(len(statements) - stc)

		#print(f"S3: {time.time() - start_time:.4f} seconds")

		change_log_files = ""
		schemas_sql = """
--liquibase formatted sql
--changeset ashish@impactanalytics.co:schemas_set runOnChange:true stripComments:false splitStatements:false context:Current_Release labels:New_Schema_OnBoarding
"""
		for sc in table_dependencies.keys():
			if table_dependencies[sc] != "":
				change_logs = """<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
   xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xmlns:pro="http://www.liquibase.org/xml/ns/pro"
   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
	  http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd
	  http://www.liquibase.org/xml/ns/pro 
	  http://www.liquibase.org/xml/ns/pro/liquibase-pro-4.1.xsd">""" + table_dependencies[sc] + """
</databaseChangeLog>"""
				filename = "liquibase/{client}/changelog_tables_{schema}.xml".format(client=client, schema=sc)
				os.makedirs(os.path.dirname(filename), exist_ok=True)
				f = open(filename, "w")
				f.write(change_logs)
				f.close()
				change_log_files += """\n\t<include file="{}" relativeToChangelogFile="true"/>""".format("changelog_tables_{schema}.xml".format(schema=sc))
				schemas_sql += """create schema if not exists "{}";\n""".format(sc)
		f = open("database/{client}_schemas.sql".format(client=client), "w")
		f.write(schemas_sql)
		f.close()

		for sc in sp_dependencies.keys():
			if sp_dependencies[sc] != "":
				change_logs = """<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
   xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xmlns:pro="http://www.liquibase.org/xml/ns/pro"
   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
	  http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd
	  http://www.liquibase.org/xml/ns/pro 
	  http://www.liquibase.org/xml/ns/pro/liquibase-pro-4.1.xsd">""" + sp_dependencies[sc] + """
</databaseChangeLog>"""
				filename = "liquibase/{client}/changelog_sps_{schema}.xml".format(client=client, schema=sc)
				os.makedirs(os.path.dirname(filename), exist_ok=True)
				f = open(filename, "w")
				f.write(change_logs)
				f.close()
				change_log_files += """\n\t<include file="{}" relativeToChangelogFile="true"/>""".format("changelog_sps_{schema}.xml".format(schema=sc))

		master_change_logs = """<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
   xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xmlns:pro="http://www.liquibase.org/xml/ns/pro"
   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
      http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd
      http://www.liquibase.org/xml/ns/pro 
      http://www.liquibase.org/xml/ns/pro/liquibase-pro-4.1.xsd">
    <include file="database/pre-deployment.sql" relativeToChangelogFile="false"/>
	<include file="database/extensions.sql" relativeToChangelogFile="false"/>
	<include file="database/{client}_schemas.sql" relativeToChangelogFile="false"/>{change_log_files}
</databaseChangeLog>""".format(change_log_files=change_log_files, client=client)
		f = open("liquibase/{client}/master_changelog.xml".format(client=client), "w")
		f.write(master_change_logs)
		f.close()

		return []

	def exec_shell(self, cmd):
		#print("CMD:", cmd)
		try:
			res = os.system(cmd)
			return True if str(res) == "0" else False
		except Exception as e:
			trace_back = traceback.format_exc()
			err_message = str(e) + "" + str(trace_back)
			print("Error in command:", err_message)
			return False

	def exec_shell_lb(self, operation, release_file):
		if operation == 'updateSQL':
			file_name = "/tmp/{}.{}".format(str(uuid.uuid4()), operation)
			cmd = """{} {} --changelog-file="{}" --url=jdbc:postgresql://{}:{}/{} --username={} --default-schema-name=liquibase --password="{}" --output-file="{}" """.format(os.environ.get('Liquibase_Path'), operation, release_file, self.db_host, self.db_port, self.db_name, self.db_user, self.db_pass.replace('$', '\$'), file_name)
		else:
			cmd = """{} {} --changelog-file="{}" --url=jdbc:postgresql://{}:{}/{} --username={} --default-schema-name=liquibase --password="{}" """.format(os.environ.get('Liquibase_Path'), operation, release_file, self.db_host, self.db_port, self.db_name, self.db_user, self.db_pass.replace('$', '\$'))
		#print("CMD:", cmd)
		try:
			result = subprocess.run(cmd, shell=True, capture_output=True)
			if operation == 'updateSQL':
				return file_name
			else:
				return result
		except Exception as e:
			trace_back = traceback.format_exc()
			err_message = str(e) + "" + str(trace_back)
			return err_message

	def exec_shell_lb_diff(self, pg_sync_source, schema, operation='diff'):
		file_name = "/tmp/{}.{}".format(str(uuid.uuid4()), operation)
		childs = pg_sync_source.get_results("""
			select 
			  string_agg(table_name, ',') as child 
			from 
			  (
				select 
				  table_name, 
				  table_type 
				from 
				  information_schema.tables 
				where 
				  table_schema = '{}' 
				union all 
				select 
				  matviewname as table_name, 
				  'MATERIALIZED VIEW' as table_type 
				from 
				  pg_matviews 
				where 
				  schemaname = '{}' 
				order by 
				  table_type, 
				  table_name asc
			  ) x
			where
				table_name not in ('store_attributes_filter', 'product_attributes_filter')
		""".format(schema, schema))
		for child in childs:
			child = child['child']

		cmd = """{} --diff-column-order=false {} --url=jdbc:postgresql://{}:{}/{} --username={} --password="{}" --referenceUrl=jdbc:postgresql://{}:{}/{} --referenceUsername={} --referencePassword="{}" --schemas={} --include-objects={} --output-file="{}" """.format(os.environ.get('Liquibase_Path'), operation, self.db_host, self.db_port, self.db_name, self.db_user, self.db_pass.replace('$', '\$'), pg_sync_source.db_host, pg_sync_source.db_port, pg_sync_source.db_name, pg_sync_source.db_user, pg_sync_source.db_pass.replace('$', '\$'), schema, child, file_name)

		#print("CMD:", cmd)
		try:
			result = subprocess.run(cmd, shell=True, capture_output=True)
			#return result
			return file_name
		except Exception as e:
			trace_back = traceback.format_exc()
			err_message = str(e) + "" + str(trace_back)
			#print("Error in command:", err_message)
			return err_message

	def permissions(self):
		pass

	def cleanup_schemas(self, complete=True):
		print("Schemas:", ", ".join(self.schemas))
		for sc in self.schemas:
			if self.execute_query("""DROP SCHEMA IF EXISTS "{}" CASCADE;""".format(sc)):
				if complete:
					if self.execute_query("""CREATE SCHEMA "{}";""".format(sc)):
						pass
					else:
						print("Error in schema setup", sc)
			else:
				print("Error in schema cleanup", sc)

		self.execute_query("""
			CREATE EXTENSION IF NOT EXISTS "btree_gist" schema "public";
			CREATE EXTENSION IF NOT EXISTS "pg_prewarm" schema "public";
			CREATE EXTENSION IF NOT EXISTS "tablefunc" schema "public";
			CREATE EXTENSION IF NOT EXISTS "dblink" schema "public";
			CREATE EXTENSION IF NOT EXISTS "uuid-ossp" schema "public";
			CREATE EXTENSION IF NOT EXISTS "vector" schema "public";
			CREATE EXTENSION IF NOT EXISTS "citext" schema "public";
			CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" schema "public";
			CREATE EXTENSION IF NOT EXISTS "unaccent" schema public;
			CREATE EXTENSION IF NOT EXISTS "postgres_fdw" schema public;
			CREATE EXTENSION IF NOT EXISTS "pgcrypto" schema public;
		""")

	def connection_check(self):
		self.get_results("SELECT 1")
		print("DB Connected:", self.db_host, self.db_port, self.db_user, self.db_name)

	def generate_sp_dump(self):
		methods = self.get_results("""
			select 
			  schema, 
			  name, 
			  directory, 
			  '--liquibase formatted sql
--changeset ashish@impactanalytics.co:' || name || ' runOnChange:true stripComments:false splitStatements:false context:Release_1 labels:bella_onboard
--comment: initial changeset for ' || name || '
--rollback: SELECT 1
' || string_agg(sp, E'\n\n' order by length(sp)) as sp 
			from 
			  (
				select 
				  n.nspname as schema, 
				  proname as name, 
				  case when prokind = 'f' then 'functions' else 'procedures' end as directory,
				  'DROP ' || case when prokind = 'f' then 'FUNCTION' else 'PROCEDURE' end || ' IF EXISTS ' || n.nspname || '.' || f.proname || '(' || pg_get_function_identity_arguments(f.oid) || ')' || E';\n'
				  || concat(
					pg_get_functiondef(f.oid), 
					E';\n'
				  ) as sp
				from 
				  pg_catalog.pg_proc f 
				  inner join pg_catalog.pg_namespace n on (f.pronamespace = n.oid) 
				where 
				  n.nspname in('{}') 
				  --and proparallel = 'u' 
				  and prokind in('p', 'f')
				  and probin is null
				  ) x 
			group by 
			  1, 
			  2, 
			  3 
			order by 
			  1, 
			  3 asc""".format("', '".join(self.schemas)))
		dir_name = str(uuid.uuid4())

		for m in methods:
			filename = "/tmp/{}/{}/{}/{}/{}.sql".format(dir_name, self.db_name, m["schema"], m["directory"], m["name"])
			os.makedirs(os.path.dirname(filename), exist_ok=True)
			f = open(filename, "w")
			f.write(m["sp"])
			f.close()
		shutil.make_archive("/tmp/{}/{}".format(dir_name, self.db_name), 'zip', "/tmp/{}/".format(dir_name), self.db_name)
		return "/tmp/{}/{}.zip".format(dir_name, self.db_name)

	def get_results(self, sql):
		#print("Fetching:", sql)
		#results = []
		connection = None
		is_exception = False
		try:
			connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
			cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
			cursor.execute(sql)
			results = cursor.fetchall()
		except psycopg2.Error as e:
			is_exception = True
			#print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			is_exception = True
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		finally:
			if connection:
				cursor.close()
				connection.close()
		return some_exception_in_get_results if is_exception else results

	def drop_db_if_exists(self, db_name=None): #must have postgres user only credentials because that's only default user and database to connect, no other user can do this operation
		db_name = db_name if db_name else self.db_name
		connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, connect_timeout=30)
		connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT);
		cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
		cursor.execute("""select count(1) as cnt from pg_database where datname = '{}';""".format(db_name))
		results = cursor.fetchone()
		if results['cnt'] == 1:
			#print("Droping existing database:", db_name)
			cursor = connection.cursor()
			x = cursor.execute("""DROP DATABASE "{}";""".format(db_name))
		cursor.close()
		connection.close()

	def create_db_if_not_exists(self, db_name=None): #must have postgres user only credentials because that's only default user and database to connect, no other user can do this operation
		db_name = db_name if db_name else self.db_name
		connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, connect_timeout=30)
		connection.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT);
		cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
		cursor.execute("""select count(1) as cnt from pg_database where datname = '{}';""".format(db_name))
		results = cursor.fetchone()
		if results['cnt'] == 0:
			print("Creating new database:", db_name)
			cursor = connection.cursor()
			cursor.execute("""CREATE DATABASE "{}";""".format(db_name))
		cursor.close()
		connection.close()

	def rebuild_exceptions(self, tenant): # Will rewrite tenant specific exceptions.json
		print(tenant)
		
		for rrm in self.reverse_rules_map:
			self.reverse_rules_map[rrm]["exclusions"] = []
		for rm in self.rules_map:
			self.rules_map[rm]["exclusions"] = []
		
		res = self.compile_schema(tenant, True)
		
		user_exceptions = {}
		rmp_keys = list(rules_map_parellel.keys())
		rmp_keys.sort()
		for rmp in rmp_keys:
			if rmp in users_allowed_exceptions:
				user_exceptions[rmp] = {}
				exceptions = []
				exs = list(set(rules_map_parellel[rmp]["exclusions"]))
				for ex in exs:
					if ex.split("/")[1] == tenant:
						exceptions.append(ex)
				user_exceptions[rmp]["exclusions"] = exceptions
				user_exceptions[rmp]["exclusions"].sort()
		
		path = "database/{}/exceptions.json".format(tenant)
		os.makedirs(os.path.dirname(path), exist_ok=True)
		f = open(path, "w")
		f.write(json.dumps(user_exceptions, indent=4))
		f.close()

	#def commit_csv_pg(self, table, file_path, columns, separator=',', encoding='UTF8', quote='"'):
	#	print("Loading:", table, file_path)
	#	try:
	#		#cmd = """PGPASSWORD='{}' psql -h {} -d {} -U {} -c "\copy \\"{}\\" (\\"{}\\") FROM '{}' DELIMITER '{}' CSV HEADER ENCODING '{}' QUOTE E'\{}';" """.format(self.db_pass, self.db_host, self.db_name, self.db_user, table, '\\", \\"'.join(columns), file_path, separator, encoding, quote)
	#		cmd = """PGPASSWORD='{}' psql -h {} -d {} -U {} -c "\copy {} (\\"{}\\") FROM '{}' DELIMITER '{}' CSV HEADER ENCODING '{}' QUOTE E'\{}';" """.format(self.db_pass, self.db_host, self.db_name, self.db_user, table, '\\", \\"'.join(columns), file_path, separator, encoding, quote)
	#		print("CMD:", cmd)
	#		output = os.system(cmd)
	#		if str(output) != '0':
	#			print("Error:", table, file_path, columns, separator, encoding, quote)
	#	except Exception as e:
	#		trace_back = traceback.format_exc()
	#		err_message = str(e) + "" + str(trace_back)
	#		print(err_message)

# Only run if want to hard remove noise in exceptions
#print("tenants_list", tenants_list)
#for tenant in tenants_list:
#	pg_sync_source = PGSync(tenant, os.environ["ENV"], True, False)
#	res = pg_sync_source.compile_schema(tenant)
#	print(tenant, res)
#
#for tenant in tenants_list:
#	pg_sync_source = PGSync(tenant, os.environ["ENV"], True, False)
#	pg_sync_source.rebuild_exceptions(tenant)
#
#rmp_keys = list(rules_map_parellel.keys())
#rmp_keys.sort()
#for rmp in rmp_keys:
#	rules_map_parellel[rmp]["exclusions"] = list(set(rules_map_parellel[rmp]["exclusions"]))
#	rules_map_parellel[rmp]["exclusions"].sort()
#
#global_exceptions = {}
#for rmp in rules_map_parellel:
#	if rmp not in users_allowed_exceptions:
#		global_exceptions[rmp] = rules_map_parellel[rmp]
#
#f = open("global_exceptions.json", "w")
#f.write(json.dumps(global_exceptions, indent=4))
#f.close()
#
#finish
