from .claspy import *
from . import utils
from .utils import borders
from .utils.borders import Direction

def encode(string):
    return utils.encode(string, has_borders = True)

def solve(E):
    rooms = utils.regions.full_bfs(E.R, E.C, E.edges, E.clues)

    shading_solver = utils.RectangularGridShadingSolver(E.R, E.C)
    shading_solver.no_adjacent()
    shading_solver.white_connectivity()
    region_solver = utils.RectangularGridRegionSolver(E.R, E.C,
                        shading_solver.grid, given_regions = rooms)
    region_solver.set_shaded_cells_in_region(E.clues, [True])

    for r in range(E.R):
        borders_in_row = [c for c in range(1,E.C) if (r,c,Direction.LEFT) in E.edges]
        # for each pair of consecutive borders, we get a constraint:
        # at least one cell in this span has to be shaded
        for i in range(len(borders_in_row)-1):
            b1, b2 = borders_in_row[i], borders_in_row[i+1]
            x = BoolVar(False)
            for c in range(b1-1,b2+1):
                x |= shading_solver.grid[r][c]
            require(x)

    for c in range(E.C):
        borders_in_col = [r for r in range(1,E.R) if (r,c,Direction.TOP) in E.edges]
        for i in range(len(borders_in_col)-1):
            b1, b2 = borders_in_col[i], borders_in_col[i+1]
            x = BoolVar(False)
            for r in range(b1-1,b2+1):
                x |= shading_solver.grid[r][c]
            require(x)
    
    return shading_solver.solutions(shaded_color = 'darkgray')

def decode(solutions):
    return utils.decode(solutions)