from .claspy import *
from . import utils
from .utils.borders import Direction

def encode(string):
    return utils.encode(string)
    
def solve(E):
    connected_whitespace = E.params['connected_whitespace']

    white_region_id = len(E.clues)  # Represent the white region with its own ID
    max_num_regions = white_region_id + 1
    
    # max val = max region ID or maximum freedom, or 3 (max size of vehicle)
    set_max_val(max(max(max_num_regions, max(E.R, E.C)-3), 3))

    # Map each clue cell to its clue number
    # (starts at 0, increases left-to-right, top-to-bottom)
    clue_cell_id = {}
    for (r, c) in E.clues:
        clue_cell_id[(r, c)] = len(clue_cell_id)

    region_symbol_sets = [[i] for i in range(white_region_id)]

    s = utils.regions.RectangularGridRegionSolver(E.R, E.C, max_num_regions = max_num_regions,
        region_symbol_sets = region_symbol_sets, nonregion_area_connected = connected_whitespace)
    
    s.region_roots(clue_cell_id, unassigned_region_id_constraint = lambda _, r, c : white_region_id)
    
    # Region size constraint -- see utils.regions.set_region_size
    min_region_size = 2
    max_region_size = 3

    # Keep track, for each cell, of the size of the region it belongs to.
    region_size = [[IntVar(min_region_size, max_region_size) for c in range(E.C)] for r in range(E.R)]
    # To count cells in a group, create a region_id of IntVars, where each value
    # is the sum of the values that flow towards it, plus one.
    upstream = [[IntVar(0, max_region_size) for c in range(E.C)] for r in range(E.R)]
    for r in range(E.R):
        for c in range(E.C):
            upstream_count = IntVar(0)
            
            if r > 0:
                # Update upstream count
                upstream_count += cond(s.parent[r-1][c] == 'v', upstream[r-1][c], 0)
                # If this cell is the parent of its upper neighbor, they have the same region size.
                # Randomly assign a BS region size of 2 to all cells in the white region to provide more
                # constraints to claspy.
                require(cond(s.region_id[r][c] == white_region_id, region_size[r][c] == 2, 
                    (region_size[r][c] == region_size[r-1][c]) | (s.parent[r-1][c] != 'v')))
                
            if r < E.R-1:
                upstream_count += cond(s.parent[r+1][c] == '^', upstream[r+1][c], 0)
                require(cond(s.region_id[r][c] == white_region_id, region_size[r][c] == 2, 
                (region_size[r][c] == region_size[r+1][c]) | (s.parent[r+1][c] != '^')))
                
            if c > 0:
                upstream_count += cond(s.parent[r][c-1] == '>', upstream[r][c-1], 0)
                require(cond(s.region_id[r][c] == white_region_id, region_size[r][c] == 2, 
                    (region_size[r][c] == region_size[r][c-1]) | (s.parent[r][c-1] != '>')))
                
            if c < E.C-1:
                upstream_count += cond(s.parent[r][c+1] == '<', upstream[r][c+1], 0)
                require(cond(s.region_id[r][c] == white_region_id, region_size[r][c] == 2, 
                    (region_size[r][c] == region_size[r][c+1]) | (s.parent[r][c+1] != '<')))
                
            # if cell is part of some region, it must obey the upstream counting rule;
            # otherwise, its count is 0.
            require(cond(s.region_id[r][c] == white_region_id, upstream[r][c] == 0, upstream[r][c] == upstream_count + 1))
            
            # If this is a root cell, then it must be a root and 
            # the count must be 2 or 3 (we accomplish this by enforcing that the upstream count is equal to region size,
            # which is limited by IntVar(min_region_size, max_region_size.)
            if (r, c) in E.clues:
                require((s.parent[r][c] == '.') & (upstream[r][c] == region_size[r][c]))

    # Region shape constraint
    for r in range(E.R):
        for c in range(E.C):
            vertical_neighbors = []
            for (y, x) in ((r-1, c), (r+1, c)):
                if utils.grids.is_valid_coord(E.R, E.C, y, x):
                    vertical_neighbors.append(s.region_id[y][x] == s.region_id[r][c])
            horizontal_neighbors = []
            for (y, x) in ((r, c-1), (r, c+1)):
                if utils.grids.is_valid_coord(E.R, E.C, y, x):
                    horizontal_neighbors.append(s.region_id[y][x] == s.region_id[r][c])
            
            # For every cell, if it is not part of the white region,
            # it cannot have both a vertical neighbor and horizontal neighbor.
            require(
                (s.region_id[r][c] == white_region_id) | 
                (~(at_least(1, vertical_neighbors) & at_least(1, horizontal_neighbors)))
            )

    # Freedom constraints
    freedoms = {}
    for ((r, c), value) in E.clues.items():
        vertical_neighbors = []
        for (y, x) in ((r-1, c), (r+1, c)):
            if utils.grids.is_valid_coord(E.R, E.C, y, x):
                vertical_neighbors.append(s.region_id[y][x] == clue_cell_id[(r, c)])
        horizontal_neighbors = []
        for (y, x) in ((r, c-1), (r, c+1)):
            if utils.grids.is_valid_coord(E.R, E.C, y, x):
                horizontal_neighbors.append(s.region_id[y][x] == clue_cell_id[(r, c)])

        freedom = IntVar(0)
        
        # Top freedom
        top_continues = BoolVar(True)
        for y in range(r-1, -1, -1):
            top_continues &= ((s.region_id[y][c] == white_region_id) | (s.region_id[y][c] == clue_cell_id[(r, c)]))
            freedom += cond(top_continues & at_least(1, vertical_neighbors) & (s.region_id[y][c] != clue_cell_id[(r, c)]), 1, 0)
        
        # Bottom freedom
        bottom_continues = BoolVar(True)
        for y in range(r+1, E.R):
            bottom_continues &= ((s.region_id[y][c] == white_region_id) | (s.region_id[y][c] == clue_cell_id[(r, c)]))
            freedom += cond(bottom_continues & at_least(1, vertical_neighbors) & (s.region_id[y][c] != clue_cell_id[(r, c)]), 1, 0)
        
        # Left freedom
        left_continues = BoolVar(True)
        for x in range(c-1, -1, -1):
            left_continues &= ((s.region_id[r][x] == white_region_id) | (s.region_id[r][x] == clue_cell_id[(r, c)]))
            freedom += cond(left_continues & at_least(1, horizontal_neighbors) & (s.region_id[r][x] != clue_cell_id[(r, c)]), 1, 0)

        # Right freedom
        right_continues = BoolVar(True)
        for x in range(c+1, E.C):
            right_continues &= ((s.region_id[r][x] == white_region_id) | (s.region_id[r][x] == clue_cell_id[(r, c)]))
            freedom += cond(right_continues & at_least(1, horizontal_neighbors) & (s.region_id[r][x] != clue_cell_id[(r, c)]), 1, 0)

        if isinstance(value, int):
            require(freedom == value)
    
    # Generate solutions (see utils.regions.solutions)
    def generate_solution():
        # Same as utils.regions.solutions
        solution = {}
        for r in range(E.R):
            for c in range(E.C):
                # handle left / right edges
                if c == 0:
                    solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.LEFT)] = 'black'
                if c == E.C-1:
                    if s.region_id[r][c-1].value() != s.region_id[r][c].value():
                        solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.LEFT)] = 'black'
                    # right edge is always colored
                    solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.RIGHT)] = 'black'
                else:
                    if s.region_id[r][c-1].value() != s.region_id[r][c].value():
                        solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.LEFT)] = 'black'
                # handle top / bottom edges
                if r == 0:
                    solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.TOP)] = 'black'
                if r == E.R-1:
                    if s.region_id[r-1][c].value() != s.region_id[r][c].value():
                        solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.TOP)] = 'black'
                    # bottom edge is always black
                    solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.BOTTOM)] = 'black'
                else:
                    if s.region_id[r-1][c].value() != s.region_id[r][c].value():
                        solution[utils.borders.get_border_coord_from_edge_id(r, c, Direction.TOP)] = 'black'
                # Add gray shading to vehicles
                if s.region_id[r][c].value() != white_region_id:
                    solution[utils.solutions.rc_to_grid(r, c)] = 'darkgray'

        return solution

    return utils.solutions.get_all_solutions(generate_solution, lambda : utils.solutions.avoid_duplicate_grid_solution(s.grid))

def decode(solutions):
    return utils.decode(solutions)
