export interface PathNode {
  x: number;
  z: number;
  floor?: number;
}

export interface Shelf {
  id: string;
  name: string;
  levelCount?: number;
  closedSides?: ("left" | "right" | "front" | "back")[]; // Which sides should have panels. Back side is closed by default.
}

export interface Bay {
  id: string;
  name: string;
  floor: number;
  row: number;
  column: number;
  width: number;
  depth: number;
  shelves: Shelf[];
  levelCount?: number;
  shelfSpacing?: number; // Distance between shelves in the bay (default: 0)
  shape?: "rectangle" | "circle"; // Bay support shape (default: 'rectangle')
}

export interface Aisle {
  id: string;
  name: string;
  bays: Bay[];
}

export interface Zone {
  id: string;
  name: string;
  aisles: Aisle[];
}

export interface StoreConfig {
  gridSize: { width: number; depth: number };
  entrance: { x: number; z: number; floor: number };
  elevators: { x: number; z: number }[];
  zones: Zone[];
}

export interface Department {
  id: string;
  name: string;
  floor: number;
  row: number;
  column: number;
  width: number;
  depth: number;
  shelves: Shelf[];
  levelCount?: number;
  shelfSpacing?: number;
}
