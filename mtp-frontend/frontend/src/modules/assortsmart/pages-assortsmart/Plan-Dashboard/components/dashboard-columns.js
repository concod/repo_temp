//TODO: To be removed after api integration
export const preSeasonDashboardColumns = [
    {
        "sub_headers": [],
        "tc_code": 210,
        "label": "Season",
        "column_name": "season",
        "dimension": "Other",
        "type": "str",
        "is_frozen": false,
        "is_editable": false,
        "is_aggregated": false,
        "order_of_display": 1,
        "is_hidden": false,
        "is_required": true,
        "tc_mapping_code": 40,
        "aggregate_type": "",
        "formatter": "",
        "is_row_span": false,
        "footer": "",
        "is_searchable": true,
        "extra": {},
        "is_sortable": true,
        "width": 200,
        "is_deleted": false,
        "is_master_group": false
    },
    {
        "sub_headers": [],
        "tc_code": 210,
        "label": "Channel",
        "column_name": "channel",
        "dimension": "Other",
        "type": "str",
        "is_frozen": false,
        "is_editable": false,
        "is_aggregated": false,
        "order_of_display": 2,
        "is_hidden": false,
        "is_required": true,
        "tc_mapping_code": 40,
        "aggregate_type": "",
        "formatter": "",
        "is_row_span": false,
        "footer": "",
        "is_searchable": true,
        "extra": {},
        "is_sortable": true,
        "width": 200,
        "is_deleted": false,
        "is_master_group": false
    },
    {
        "column_name": "l0_name",
        "label": "Division",
        "is_frozen": false,
        "is_hidden": false,
        "is_editable": false,
        "is_aggregated": false,
        "type": "array",
        "order_of_display": 3,
        "footer": "",
        "is_row_span": false,
        "formatter": "",
        "is_searchable": true,
        "sub_headers": [],
        "is_lockable": false,
        "width": 250,
        "extra": {}
    },
    {
        "column_name": "l1_name",
        "label": "Department",
        "is_frozen": false,
        "is_hidden": false,
        "is_editable": false,
        "is_aggregated": false,
        "type": "array",
        "order_of_display": 4,
        "footer": "",
        "is_row_span": false,
        "formatter": "",
        "is_searchable": true,
        "sub_headers": [],
        "is_lockable": false,
        "width": 250,
        "extra": {}
    },
    {
        "column_name": "l2_name",
        "label": "Lifecycle",
        "is_frozen": false,
        "is_hidden": false,
        "is_editable": false,
        "is_aggregated": false,
        "type": "array",
        "order_of_display": 5,
        "footer": "",
        "is_row_span": false,
        "formatter": "",
        "is_searchable": true,
        "sub_headers": [],
        "is_lockable": false,
        "width": 250,
        "extra": {}
    },
    {
        "sub_headers": [],
        "tc_code": 210,
        "label": "Hierarchy",
        "column_name": "hierarchy_level",
        "dimension": "Other",
        "type": "str",
        "is_frozen": false,
        "is_editable": false,
        "is_aggregated": false,
        "order_of_display": 6,
        "is_hidden": true,
        "is_required": true,
        "tc_mapping_code": 121,
        "aggregate_type": "",
        "formatter": "",
        "is_row_span": false,
        "footer": "",
        "is_searchable": true,
        "extra": {},
        "is_sortable": true,
        "width": 200,
        "is_deleted": false,
        "is_master_group": false
    },
    {
        "sub_headers": [
            {
                "column_name": "strategy",
                "label": "Strategy",
                "is_frozen": false,
                "is_hidden": false,
                "is_editable": true,
                "is_aggregated": false,
                "type": "percentage",
                "order_of_display": "7.1",
                "footer": "",
                "is_row_span": false,
                "formatter": "",
                "is_searchable": false,
                "sub_headers": [
                    {
                        "sub_headers": [],
                        "tc_code": 210,
                        "label": "",
                        "column_name": "module_status",
                        "dimension": "Other",
                        "type": "str",
                        "is_frozen": false,
                        "is_editable": true,
                        "is_aggregated": false,
                        "order_of_display": "7.1.1",
                        "is_hidden": false,
                        "is_required": true,
                        "tc_mapping_code": 23510,
                        "aggregate_type": null,
                        "formatter": null,
                        "is_row_span": false,
                        "footer": null,
                        "is_searchable": false,
                        "extra": {},
                        "is_sortable": true,
                        "width": 500,
                        "is_deleted": false,
                        "is_master_group": false
                    }
                ],
                "is_lockable": false,
                "width": 300,
                "extra": {}
            },
            {
                "column_name": "line_review",
                "label": "Line Review",
                "is_frozen": false,
                "is_hidden": false,
                "is_editable": true,
                "is_aggregated": false,
                "type": "percentage",
                "order_of_display": "7.2",
                "footer": "",
                "is_row_span": false,
                "formatter": "",
                "is_searchable": false,
                "sub_headers": [
                    {
                        "sub_headers": [],
                        "tc_code": 210,
                        "label": "",
                        "column_name": "module_status",
                        "dimension": "Other",
                        "type": "str",
                        "is_frozen": false,
                        "is_editable": true,
                        "is_aggregated": false,
                        "order_of_display": "7.2.1",
                        "is_hidden": false,
                        "is_required": true,
                        "tc_mapping_code": 23510,
                        "aggregate_type": null,
                        "formatter": null,
                        "is_row_span": false,
                        "footer": null,
                        "is_searchable": false,
                        "extra": {},
                        "is_sortable": true,
                        "width": 300,
                        "is_deleted": false,
                        "is_master_group": false
                    },
                ],
                "is_lockable": false,
                "width": 300,
                "extra": {}
            },
            {
                "column_name": "size_pack",
                "label": "Size & Pack",
                "is_frozen": false,
                "is_hidden": false,
                "is_editable": true,
                "is_aggregated": false,
                "type": "percentage",
                "order_of_display": "7.3",
                "footer": "",
                "is_row_span": false,
                "formatter": "",
                "is_searchable": false,
                "sub_headers": [
                    {
                        "sub_headers": [],
                        "tc_code": 210,
                        "label": "",
                        "column_name": "module_status",
                        "dimension": "Other",
                        "type": "str",
                        "is_frozen": false,
                        "is_editable": true,
                        "is_aggregated": false,
                        "order_of_display": "7.3.1",
                        "is_hidden": false,
                        "is_required": true,
                        "tc_mapping_code": 23510,
                        "aggregate_type": null,
                        "formatter": null,
                        "is_row_span": false,
                        "footer": null,
                        "is_searchable": false,
                        "extra": {},
                        "is_sortable": true,
                        "width": 300,
                        "is_deleted": false,
                        "is_master_group": false
                    },
                ],
                "is_lockable": false,
                "width": 300,
                "extra": {}
            },
        ],
        "tc_code": 210,
        "label": "Stage - Current Status",
        "column_name": "status",
        "dimension": "Other",
        "type": "str",
        "is_frozen": false,
        "is_editable": false,
        "is_aggregated": false,
        "order_of_display": 7,
        "is_hidden": true,
        "is_required": true,
        "tc_mapping_code": 135,
        "aggregate_type": "",
        "formatter": "",
        "is_row_span": false,
        "footer": "",
        "is_searchable": true,
        "extra": {},
        "is_sortable": true,
        "width": 300,
        "is_deleted": false,
        "is_master_group": false
    },
]

export const preSeasonDashboardData =[
    {
        "plan_code": 3819,
        "channel": [
            "CA",
            "US"
        ],
        "plan_step": {
            "strategy": 2.1,
            "line_review": null,
            "size_pack": null
        },
        "created_by_code": 251,
        "l0_name": [
            "WOMENS SPORTSWEAR"
        ],
        "l1_name": [
            "WOMENS TEES"
        ],
        "l2_name": [
            "SPRING"
        ],
        "season": "2024 Spring",
        "created_by": "QA User",
        "plan_step_desc": {
            "strategy": "Cluster Optimization",
            "line_review": null,
            "size_pack": null
        }
    },
    {
        "plan_code": 3819,
        "channel": [
            "CA",
            "US"
        ],
        "plan_step": {
            "strategy": 2.2,
            "line_review": 2.3,
            "size_pack": null
        },
        "created_by_code": 251,
        "l0_name": [
            "WOMENS SPORTSWEAR"
        ],
        "l1_name": [
            "WOMENS TEES"
        ],
        "l2_name": [
            "SPRING"
        ],
        "season": "2024 Spring",
        "created_by": "QA User",
        "plan_step_desc": {
            "strategy": "Completed",
            "line_review": "Build the wedge",
            "size_pack": null
        }
    },
    {
        "plan_code": 3819,
        "channel": [
            "CA",
            "US"
        ],
        "plan_step": {
            "strategy": 2.1,
            "line_review": 2.3,
            "size_pack": null
        },
        "created_by_code": 251,
        "l0_name": [
            "WOMENS SPORTSWEAR"
        ],
        "l1_name": [
            "WOMENS TEES"
        ],
        "l2_name": [
            "SPRING"
        ],
        "season": "2024 Spring",
        "created_by": "QA User",
        "plan_step_desc": {
            "strategy": "Cluster Optimization",
            "line_review": "Build the wedge",
            "size_pack": null
        }
    },
    {
        "plan_code": 3819,
        "channel": [
            "CA",
            "US"
        ],
        "plan_step": {
            "strategy": 2.1,
            "line_review": 2.3,
            "size_pack": 2.4
        },
        "created_by_code": 251,
        "l0_name": [
            "WOMENS SPORTSWEAR"
        ],
        "l1_name": [
            "WOMENS TEES"
        ],
        "l2_name": [
            "SPRING"
        ],
        "season": "2024 Spring",
        "created_by": "QA User",
        "plan_step_desc": {
            "strategy": "Cluster Optimization",
            "line_review": "Wedge",
            "size_pack": "Size & Pack"
        }
    },
    {
        "plan_code": 3819,
        "channel": [
            "CA",
            "US"
        ],
        "plan_step": {
            "strategy": 2.2,
            "line_review": 2.3,
            "size_pack": 2.4
        },
        "created_by_code": 251,
        "l0_name": [
            "WOMENS SPORTSWEAR"
        ],
        "l1_name": [
            "WOMENS TEES"
        ],
        "l2_name": [
            "SPRING"
        ],
        "season": "2024 Spring",
        "created_by": "QA User",
        "plan_step_desc": {
            "strategy": "Completed",
            "line_review": "Completed",
            "size_pack": "Size & Pack"
        }
    }
]