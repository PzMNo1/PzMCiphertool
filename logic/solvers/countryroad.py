from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, has_borders = True)
    
def solve(E):
    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)
        
    # get the size of the largest room
    max_room_size = max(len(room) for room in rooms)
    
    # reset clasp, and set the maximum IntVar value to the max room size
    reset()
    set_max_val(max_room_size)
    
    loop_solver = utils.RectangularGridLoopSolver(E.R, E.C)
    loop_solver.loop(E.clues, includes_clues = True)
    loop_solver.no_reentrance(rooms)
    loop_solver.hit_every_region(rooms)
    
    region_solver = utils.RectangularGridRegionSolver(
        E.R, E.C, loop_solver.grid, given_regions = rooms
    )
    
    for (r, c) in E.clues:
        for room in rooms:
            if (r, c) in room:
                clued_room = room
        require(sum_bools(E.clues[(r,c)],
            [~var_in(loop_solver.grid[y][x], utils.ISOLATED) for (y, x) in clued_room]))
        
    for r in range(E.R):
        for c in range(E.C):
            for (y, x) in region_solver.get_neighbors_in_other_regions(r, c):
                require(~(var_in(loop_solver.grid[r][c], utils.ISOLATED) &
                    var_in(loop_solver.grid[y][x], utils.ISOLATED)))
        
    return loop_solver.solutions()
   
def decode(solutions):
    return utils.decode(solutions)
