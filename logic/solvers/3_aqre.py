from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, has_borders=True)

def solve(E):
    set_max_val(E.R*E.C)
    
    shading_solver = utils.RectangularGridShadingSolver(E.R,E.C)
    shading_solver.black_connectivity()
    grid = shading_solver.grid

    # GIVEN NUMBERS ARE SATISFIED
    if E.clues:
        for coord in (clue_regions := utils.full_bfs(E.R, E.C, E.edge_ids, clues=E.clues)):
            require(sum_bools(E.clues[coord], [grid[other] for other in clue_regions[coord]]))

    # NO FOUR IN A ROW
    for i in range(E.R):
        for j in range(E.C):
            if i<E.R-3:
                require(grid[(i,j)] | grid[(i+1,j)] | grid[(i+2,j)] | grid[(i+3,j)])
                require((~grid[(i,j)]) | (~grid[(i+1,j)]) | (~grid[(i+2,j)]) | (~grid[(i+3,j)]))
            if j<E.C-3:
                require(grid[(i,j)] | grid[(i,j+1)] | grid[(i,j+2)] | grid[(i,j+3)])
                require((~grid[(i,j)]) | (~grid[(i,j+1)]) | (~grid[(i,j+2)]) | (~grid[(i,j+3)]))

    return shading_solver.solutions(shaded_color='darkgray')

def decode(solutions):
    return utils.decode(solutions)
