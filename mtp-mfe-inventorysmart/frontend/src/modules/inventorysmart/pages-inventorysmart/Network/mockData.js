export const networkData = {
    network_id: "1",
    network_name: "Network 1",
    routes: [
      // Vendor 1 and its network
      // Vendor 1 to DC3 - North
      {
        "priority": 1,
        "lead_time": 8,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "AIR",
        "source_node_id": 4930,
        "route_type_name": "Vendor-DC",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "Vendor 1",
        "destination_node_id": 168,
        "destination_node_name": "DC3 - North"
      },
      // DC3 - North to its stores
      {
        "priority": 1,
        "lead_time": 12,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 168,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC3 - North",
        "destination_node_id": 172,
        "destination_node_name": "Store 3"
      },
      {
        "priority": 1,
        "lead_time": 14,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 168,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC3 - North",
        "destination_node_id": 173,
        "destination_node_name": "Store 4"
      },

      // Vendor 1 to DC4 - South
      {
        "priority": 1,
        "lead_time": 12,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "AIR",
        "source_node_id": 4930,
        "route_type_name": "Vendor-DC",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "Vendor 1",
        "destination_node_id": 169,
        "destination_node_name": "DC4 - South"
      },
      // DC4 - South to its stores
      {
        "priority": 1,
        "lead_time": 10,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 169,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC4 - South",
        "destination_node_id": 174,
        "destination_node_name": "Store 5"
      },
      {
        "priority": 1,
        "lead_time": 11,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 169,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC4 - South",
        "destination_node_id": 175,
        "destination_node_name": "Store 6"
      },
      {
        "priority": 1,
        "lead_time": 13,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 169,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC4 - South",
        "destination_node_id": 176,
        "destination_node_name": "Store 7"
      },
      // Adding 3 new stores to DC4 - South
      {
        "priority": 1,
        "lead_time": 12,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 169,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC4 - South",
        "destination_node_id": 189,
        "destination_node_name": "Store 17"
      },
      {
        "priority": 1,
        "lead_time": 14,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 169,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC4 - South",
        "destination_node_id": 190,
        "destination_node_name": "Store 18"
      },
      {
        "priority": 1,
        "lead_time": 15,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 169,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC4 - South",
        "destination_node_id": 191,
        "destination_node_name": "Store 19"
      },

      // Vendor 2 and its network
      // Vendor 2 to DC5 - East
      {
        "priority": 1,
        "lead_time": 9,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "AIR",
        "source_node_id": 4931,
        "route_type_name": "Vendor-DC",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "Vendor 2",
        "destination_node_id": 177,
        "destination_node_name": "DC5 - East"
      },
      // DC5 to its stores
      {
        "priority": 1,
        "lead_time": 13,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 177,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC5 - East",
        "destination_node_id": 180,
        "destination_node_name": "Store 8"
      },
      {
        "priority": 1,
        "lead_time": 14,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 177,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC5 - East",
        "destination_node_id": 181,
        "destination_node_name": "Store 9"
      },

      // Vendor 2 to DC6 - West
      {
        "priority": 1,
        "lead_time": 11,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "AIR",
        "source_node_id": 4931,
        "route_type_name": "Vendor-DC",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "Vendor 2",
        "destination_node_id": 178,
        "destination_node_name": "DC6 - West"
      },
      // DC6 to its stores
      {
        "priority": 1,
        "lead_time": 12,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 178,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC6 - West",
        "destination_node_id": 182,
        "destination_node_name": "Store 10"
      },
      {
        "priority": 1,
        "lead_time": 13,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 178,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC6 - West",
        "destination_node_id": 183,
        "destination_node_name": "Store 11"
      },
      {
        "priority": 1,
        "lead_time": 15,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 178,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC6 - West",
        "destination_node_id": 184,
        "destination_node_name": "Store 12"
      },

      // Vendor 2 to DC7 - Northwest
      {
        "priority": 1,
        "lead_time": 10,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "AIR",
        "source_node_id": 4931,
        "route_type_name": "Vendor-DC",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "Vendor 2",
        "destination_node_id": 179,
        "destination_node_name": "DC7 - Northwest"
      },
      // DC7 to its stores
      {
        "priority": 1,
        "lead_time": 11,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 179,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC7 - Northwest",
        "destination_node_id": 185,
        "destination_node_name": "Store 13"
      },
      {
        "priority": 1,
        "lead_time": 13,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 179,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC7 - Northwest",
        "destination_node_id": 186,
        "destination_node_name": "Store 14"
      },

      // Vendor 2 to DC8 - Southeast
      {
        "priority": 1,
        "lead_time": 12,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "AIR",
        "source_node_id": 4931,
        "route_type_name": "Vendor-DC",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "Vendor 2",
        "destination_node_id": 180,
        "destination_node_name": "DC8 - Southeast"
      },
      // DC8 to its stores
      {
        "priority": 1,
        "lead_time": 14,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 180,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC8 - Southeast",
        "destination_node_id": 187,
        "destination_node_name": "Store 15"
      },
      {
        "priority": 1,
        "lead_time": 15,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 180,
        "route_type_name": "DC-Store",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC8 - Southeast",
        "destination_node_id": 188,
        "destination_node_name": "Store 16"
      },

      // DC4 (South) to DC3 (North) route
      {
        "priority": 1,
        "lead_time": 5,
        "is_primary": true,
        "route_type_id": 4,
        "shipping_mode": "LAND",
        "source_node_id": 169,
        "route_type_name": "DC-DC",
        "is_bidirectional": false,
        "is_terminal_node": false,
        "source_node_name": "DC4 - South",
        "destination_node_id": 168,
        "destination_node_name": "DC3 - North"
      }
    ]
  };