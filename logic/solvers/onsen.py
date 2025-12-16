from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, has_borders = True)
    
def solve(E):
    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)
    
    if len(E.clues) == 0:
        raise ValueError('There are no clues!')
        
    # get the size of the largest room
    max_room_size = max(len(room) for room in rooms)

    # set the value of the "max clue" (largest number of loop cells that can be within any region)
    max_clue = 1
    for clue in E.clues.values():
        max_clue = max(max_clue, clue) if clue != '?' else max_room_size

    # set the maximum IntVar value to the largest of:
    # - greatest clue value (determines number of cells in a region that are part of a loop)
    # - number of clue cells (determines number of loop IDs)
    set_max_val(max(len(E.clues), max_clue))

    # create a dictionary mapping each clue to its required path length (which is an int (given) or IntVar(0, max_clue) for ?s)
    clue_to_path_length = {(r, c): E.clues[(r, c)] if E.clues[(r, c)] != '?' else IntVar(0, max_clue) for (r, c) in E.clues}

    # give each clue cell its own loop ID
    loop_ids = {}
    for r in range(E.R):
        for c in range(E.C):
            if (r, c) in E.clues:
                loop_ids[(r,c)] = len(loop_ids)
    
    loop_solver = utils.RectangularGridLoopSolver(E.R, E.C,
                    min_num_loops = len(E.clues), max_num_loops = len(E.clues))
    loop_solver.loop(E.clues, includes_clues = True)
    loop_solver.no_reentrance(rooms)
    loop_solver.hit_every_region(rooms)
    
    # set the loop IDs of the clue cells (these are our "anchors")
    for (r, c) in E.clues:
        require(loop_solver.loop_id[r][c] == loop_ids[(r,c)])
    
    # require that each loop has the correct number of cells in a room
    for room in rooms:
        for loop_id in range(len(E.clues)):
            # get the corresponding clue number
            for (r, c) in E.clues:
                if loop_ids[(r,c)] == loop_id:
                    clue_num = clue_to_path_length[(r,c)]
            path_length = sum_vars([loop_solver.loop_id[r][c] == loop_id for (r, c) in room])
            require((path_length == 0) | (path_length == clue_num))
        
    return loop_solver.solutions()
   
def decode(solutions):
    return utils.decode(solutions)
