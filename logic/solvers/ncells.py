from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, has_params = True)
    
def solve(E):
    region_size = int(E.params['region_size'])
    
    assert (E.R * E.C) % region_size == 0, "It's impossible to divide grid into regions of this size!"

    # set the maximum IntVar value to the number of cells
    set_max_val(E.R*E.C)
    
    region_solver = utils.RectangularGridRegionSolver(E.R, E.C, max_num_regions = E.R*E.C)
    border_solver = utils.RectangularGridBorderSolver(E.R, E.C, region_solver)
    
    region_solver.set_region_size(region_size, [], min_region_size = region_size)
    region_solver.region_roots({})
    
    for (r, c) in E.clues:
        region_solver.set_num_neighbors_in_different_region(r, c, E.clues[(r,c)])
    
    return border_solver.solutions()
    
def decode(solutions):
    return utils.decode(solutions)
