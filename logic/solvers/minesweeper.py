from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string)

def solve(E):
    set_max_val(8)
    shading_solver = utils.RectangularGridShadingSolver(E.R,E.C)

    # Enforce that clue cells can't be shaded, and that their numbers are correct
    shading_solver.white_clues(E.clues)
    
    for (cell, num) in E.clues.items():
        if num != '?':
            require(sum_bools(num, [
                    shading_solver.grid[surr]
                    for surr in shading_solver.grid.get_surroundings(*cell)
            ]))

    return shading_solver.solutions()

def decode(solutions):
    return utils.decode(solutions)