client_tenant_name_map = {
    "arhaus": "arhaus",
    "arhaus_pivot" : "arhaus-pivot",
    "aritzia": "aritzia",
    "biglots": "biglots",
    "bealls": "bealls",
    "balsam": "balsamhill",
    "calvin_klein": "ck",
    "figs":"figs",
    "gap": "gap",
    "homedepot": "homedepot",
    "impactprice": "impactprice",
    "leslies": "lesliespool",
    "lululemon":"lululemon",
    "party_city": "party-city",
    "party_city_new": "partycity-new",
    "puma": "puma",
    "primark": "inventorysmart",
    "pacsun":"pacsun",
    "patagonia":"patagonia",
    "ralph_lauren_na": "ralph-lauren",
    "signet": "signet",
    "tommy_hilfiger": "th",
    "vera_bradley": "vb",
    "victorias_secret": "victorias-secret",
    "ralph_lauren_eu_is": "ralph-lauren-eu",
    "dollar_general": "dollar-general",
    "carters": "carters",
    "ralph_lauren_apac":"ralph-lauren-apac",
    "marksandspencer": "marksandspencer",
    "saks_fifth_avenue": "saksfifthavenue",
    "stevemadden":"stevemadden",
    "toryburch": "toryburch",
    "tillys": "tillys",
    "marksandspencer_mena": "marksandspencer-mena",
    "spanx": "spanx",
    "starboard":"starboard",
    "tommy_bahama" : "tommy-bahama",
    "crackerbarrel" : "crackerbarrel",
    "briscoes": "briscoes",
    "peter_millar" : "petermillar",
    "levis_us" : "levi-lsa",
    "scarpe": "pittarosso-scarpescarpe",
    "victorias_secret_international" : "victorias-secret-international",
    "tapestry": "tapestry",
    "coach_na": "tapestry",
    "data_platform_qa": "data-platform-qa",
    "levi_lse": "levi-lse",
    "lovisa": "lovisa",
    "kik":"kik",
    "pricesmart": "pricesmart",
    "patagonia":"patagonia",
    "under_armour":"under-armour",
    "levi_ama":"levi-ama",
    "cna":"cna",
    "psp":"psp",
    "footlocker":"footlocker",
    "ralph_lauren_eu_es":"ralph-lauren-eu-erp",
    "vuori":"vuori"
}

env_url_map = {
    'dev': '.devs',
    'uat': '.uat',
    'test': '.test',
    'prod': ''
}
API_PREFIX = "/api/v2"

ALLOWED_SCHEMA_DIRS=[ "data" , "global" , "plan_smart", "size_smart" , "inventory_smart", "cluster_smart", "assort", "assort_smart", "monday_smart", "forecast_smart" ,"datamodel", "meta_schema", "chat_gpt", "ada_configurator","data_platform",  "metaschema", "price_markdown", "price_markdown_opt", "price_promo", "ada_visual", "price_promo_opt", "genai", "item_smart", "data_retention","base_pricing", "visual_line_planning", "pricesmart", "source_smart", "oms","base_pricing_restaurant", "demand_smart", "config_schema"]

SEGREGATED_TABLES_CONFIG = [
        {
            "table_name": "global.tenant_attribute_master",
            "merge_strategy": "primary_key_merge",
            "merge_key": "attribute_code",
            "parent_table": "",
            "validation_list": [
                "primary_key_validation"
            ],
            "validation_keys": [
                "attribute_code"
            ]
        },
        {
            "table_name": "global.table_configurations",
            "merge_strategy": "primary_key_merge",
            "merge_key": "tc_code",
            "parent_table": "",
            "validation_list": [
                "primary_key_validation"
            ],
            "validation_keys": [
                "tc_code"
            ]
        },
        {
            "table_name": "global.filter_configurations",
            "merge_strategy": "primary_key_merge",
            "merge_key": "fc_code",
            "parent_table": "",
            "validation_list": [
                "primary_key_validation"
            ],
            "validation_keys": [
                "fc_code"
            ]
        },
        {
            "table_name": "global.filter_configurations_mapping",
            "merge_strategy": "csv_merge",
            "merge_key": "fc_code",
            "parent_table": "global.filter_configurations",
            "validation_list": [
                "composite_key_validation",
                "dependency_graph_validation"
            ],
            "validation_keys": [
                "fc_code"
            ]
        },
        {
            "table_name": "global.table_configurations_mapping",
            "merge_strategy": "csv_merge",
            "merge_key": "tc_code",
            "parent_table": "global.table_configurations",
            "validation_list": [
                "composite_key_validation",
                "dependency_graph_validation"
            ],
            "validation_keys": [
                "tc_code"
            ]
        },
        {
            "table_name": "global.acl_master",
            "merge_strategy": "primary_key_merge",
            "merge_key": "acl_code",
            "parent_table": "",
            "validation_list": [
                "primary_key_validation"
            ],
            "validation_keys": [
                "acl_code"
            ]
        },
        {
            "table_name": "global.screen_master",
            "merge_strategy": "primary_key_merge",
            "merge_key": "screen_code",
            "parent_table": "",
            "validation_list": [
                "primary_key_validation"
            ],
            "validation_keys": [
                "screen_code"
            ]
        },
        {
            "table_name": "global.module_master",
            "merge_strategy": "primary_key_merge",
            "merge_key": "module_code",
            "parent_table": "",
            "validation_list": [
                "primary_key_validation"
            ],
            "validation_keys": [
                "module_code"
            ]
        },
        {
            "table_name": "global.notification_system_event_master",
            "merge_strategy": "primary_key_merge",
            "merge_key": "noe_code",
            "parent_table": "",
            "validation_list": [
                "primary_key_validation"
            ],
            "validation_keys": [
                "noe_code"
            ]
        }
    ]
SELECT_TABLE_DATA_INFOSCHEMA = "SELECT table_schema, table_name, column_name FROM INFORMATION_SCHEMA.columns"

TOOL_EDITED_CONFIG = {
    "global.table_configurations": {
        "code_column": "tc_code",
        "has_tool_edit": True,
        "mapping_table": "global.table_configurations_mapping"
    },
    "global.filter_configurations": {
        "code_column": "fc_code",
        "has_tool_edit": True,
        "mapping_table": "global.filter_configurations_mapping"
    },
    "global.table_configurations_mapping": {
        "code_column": "tc_code",
        "has_tool_edit": False,
        "parent_table": "global.table_configurations"
    },
    "global.filter_configurations_mapping": {
        "code_column": "fc_code",
        "has_tool_edit": False,
        "parent_table": "global.filter_configurations"
    }
}

# List of tables that need tool-edited handling
TOOL_EDITED_TABLES = list(TOOL_EDITED_CONFIG.keys())