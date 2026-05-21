from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string)

def solve(E):
    # Reduce IntVar size by counting clue cells and assigning each one an id.
    clue_cell_id = {}
    number_clues = {}
    has_nonnumber_clue = False
    for r in range(E.R):
        for c in range(E.C):
            if (r, c) in E.clues:
                clue_cell_id[(r,c)] = len(clue_cell_id)
                value = E.clues[(r,c)]
                if value == '?':
                    has_nonnumber_clue = True
                else:
                    number_clues[(r,c)] = value
    max_clue = (E.R*E.C - sum(number_clues.values())) if has_nonnumber_clue else \
        (max(number_clues.values()) if number_clues else 0)
    
    if len(clue_cell_id) == 0:
        raise ValueError('Error: No clues')

    # Restrict the number of bits used for IntVar.
    set_max_val(max(len(clue_cell_id), max_clue))

    shading_solver = utils.RectangularGridShadingSolver(E.R, E.C)
    shading_solver.black_connectivity()
    shading_solver.no_black_2x2()
    
    region_solver = utils.RectangularGridRegionSolver(E.R, E.C, shading_solver.grid,
                        max_num_regions = len(clue_cell_id), region_symbol_sets = [[False,]])
    region_solver.region_roots(clue_cell_id, exact = True)
    region_solver.set_region_size(max_clue, number_clues, clue_region_bijection = not has_nonnumber_clue)

    return shading_solver.solutions()
    
def decode(solutions):
    return utils.decode(solutions)
