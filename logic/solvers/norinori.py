from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, has_borders = True)
    
def solve(E):
    set_max_val(2)

    s = utils.shading.RectangularGridShadingSolver(E.R, E.C)
    regions = utils.regions.full_bfs(E.R, E.C, E.edges)

    # Nori rules
    for r in range(E.R):
        for c in range(E.C):
            # If shaded, then
            require(
                # Exactly 1 neighbor is shaded
                sum_bools(1, [s.grid[y][x] for (y, x) in utils.grids.get_neighbors(E.R, E.C, r, c)]) | 
                    ~s.grid[r][c]
            )

    # Region clues
    for region in regions:
        require(sum_bools(2, [s.grid[r][c] for (r, c) in region]))
    
    return s.solutions(shaded_color = 'darkgray')

def decode(solutions):
    return utils.decode(solutions)
