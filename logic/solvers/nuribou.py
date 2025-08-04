from .claspy import *
from . import utils

HORIZONTAL_OFFSETS = ((0, 1), (0, -1))
VERTICAL_OFFSETS = ((1, 0), (-1, 0))

def encode(string):
    return utils.encode(string)
    
def solve(E):
    if len(E.clues) == 0:
        raise ValueError('The grid is empty.')
    elif len(E.clues) == 1:
        raise ValueError('Are you sure you put in all the clues?')
    
    # Map each clue cell to its clue number
    # (starts at 0, increases left-to-right, top-to-bottom)
    clue_cell_id = {}
    for (r, c) in E.clues:
        clue_cell_id[(r,c)] = r*E.C + c
        
    num_cells = E.R * E.C

    # Restrict the number of bits used for IntVar.
    set_max_val(num_cells)
    
    shading_solver = utils.RectangularGridShadingSolver(E.R, E.C)
    region_solver = utils.RectangularGridRegionSolver(E.R, E.C, shading_solver.grid,
                        max_num_regions = num_cells, region_symbol_sets = [[True], [False]])
    
    region_solver.region_roots(clue_cell_id, region_symbol_set = [False], exact = True)
    region_solver.set_region_size(num_cells, E.clues)
    
    def get_neighbors_with_offsets(r, c, offset_tuples):
        neighbors = []
        for dy, dx in offset_tuples:
            y, x = r + dy, c + dx
            if utils.grids.is_valid_coord(E.R, E.C, y, x):
                neighbors.append((y, x))
        return neighbors
    
    # each shaded region must be a width-1 line
    for r in range(E.R):
        for c in range(E.C):
            # determine whether the cell has a horizontal neighbor
            has_horizontal_neighbor = BoolVar(False)
            for y, x in get_neighbors_with_offsets(r, c, HORIZONTAL_OFFSETS):
                has_horizontal_neighbor |= shading_solver.grid[y][x]

            # determine whether the cell has a vertical neighbor
            has_vertical_neighbor = BoolVar(False)
            for y, x in get_neighbors_with_offsets(r, c, VERTICAL_OFFSETS):
                has_vertical_neighbor |= shading_solver.grid[y][x]
            
            # the cell can't be shaded and have both a horizontal and a vertical neighbor
            require(~(shading_solver.grid[r][c] &
                        has_horizontal_neighbor & has_vertical_neighbor))
               
    for r in range(E.R):
        for c in range(E.C):
            # Make a list of the sizes of the shaded regions that are adjacent to this
            # cell, in a clockwise order, replacing any "invalid sizes" with a 0.
            #   (A size is "invalid" if it's not actually shaded or if it's off the grid.)
            shaded_sizes = []
            # neighbors in a clockwise order
            for (y, x) in ((r-1, c), (r, c+1), (r+1, c), (r, c-1)):
                if utils.is_valid_coord(E.R, E.C, y, x):
                    shaded_sizes.append(
                        cond(shading_solver.grid[y][x], region_solver.region_size[y][x], 0))
                else:
                    shaded_sizes.append(0)
            
            # For regions that touch diagonally, make sure they're not the same length.
            for i in range(len(shaded_sizes)):
                counterclockwise_index = (i-1) % len(shaded_sizes)
                clockwise_index = (i+1) % len(shaded_sizes)
                
                # require that...
                require(
                    # the current cell is not shaded,
                    shading_solver.grid[r][c] |
                    # the neighbor we have chosen is not shaded or invalid,
                    (shaded_sizes[i] == 0) |
                    # or the sizes are different.
                    (
                        (shaded_sizes[i] != shaded_sizes[counterclockwise_index]) &
                        (shaded_sizes[i] != shaded_sizes[clockwise_index])
                    )
                )
    
    solutions = shading_solver.solutions()
    
    return solutions

def decode(solutions):
    return utils.decode(solutions)
