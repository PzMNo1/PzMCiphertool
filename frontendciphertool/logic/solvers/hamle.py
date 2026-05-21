from .claspy import *
from . import utils
from .utils.shading import *

encode, decode = utils.encode, utils.decode

def solve(E):
    # possible_values: cell -> list of possible clues that could end up at this cell
    # (each clue is identified by its coordinate pair)
    possible_values = {}
    for (clue, val) in E.clues.items():
        r, c = clue
        for new_loc in [(r+val, c), (r-val, c), (r, c-val), (r, c+val)]:
            if is_valid_coord(E.r, E.c, *new_loc):
                possible_values[new_loc] = possible_values.get(new_loc, []) + [clue]

    # grid: cell -> ID of clue that is moved there, or None
    grid = RectangularGrid(E.r, E.c, 
        lambda r, c: MultiVar(None, *possible_values.get((r,c), []))
    )

    # require that each clue gets moved to exactly one new location
    for (clue, val) in E.clues.items():
        r, c = clue

        conds = []
        for new_loc in [(r+val, c), (r-val, c), (r, c-val), (r, c+val)]:
            if is_valid_coord(E.r, E.c, *new_loc):
                conds.append(grid[new_loc] == clue)
        require(sum_bools(1, conds), clue)
    
    # convert grid to shading to check adjacency and connectivity conditions
    binary_grid = RectangularGridShadingSolver(E.r, E.c)
    for cell in grid.iter_coords():
        require(binary_grid.grid[cell] == (grid[cell] != None))
    require(binary_grid.no_adjacent())
    require(binary_grid.white_connectivity())

    return get_all_grid_solutions(
        grid,
        format_function = lambda r, c: E.clues.get(grid[(r,c)].value(), "white")
    )