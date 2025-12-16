from .claspy import *
from . import utils

def encode(string):
    return utils.encode(string, has_borders = True)
                    
def solve(E):
    rooms = utils.regions.full_bfs(E.R, E.C, E.edges)
    
    # set the maximum IntVar value to be the max room size
    max_room_size = max(len(room) for room in rooms)
    set_max_val(max_room_size)

    grid = [[IntVar(1, max_room_size) for c in range(E.C)] for r in range(E.R)]

    # Require that each room has exactly the numbers 1 through (room size), inclusive.
    for room in rooms:
        for i in range(1, len(room)+1):
            require(sum_bools(1, [grid[r][c] == i for (r, c) in room]))
    
    for r in range(E.R):
        for c in range(E.C):
            for i in range(1, max_room_size+1):
                # If the cell at this position has value i,
                # make sure that the next i cells in the row don't have this value 
                require(sum_bools(0, [grid[r][c] == grid[r][x] for x in range(c+1, min(c+1+i, E.C))]) | 
                    (grid[r][c] != i))

    for c in range(E.C):
        for r in range(E.R):
            for i in range(1, max_room_size+1):
                # See above, but for columns.
                require(sum_bools(0, [grid[r][c] == grid[y][c] for y in range(r+1, min(r+1+i, E.R))]) | 
                    (grid[r][c] != i))

    # If there are any numbers given in the grid, make sure they're the same in the solution.
    for (r,c) in E.clues:
        require(grid[r][c] == E.clues[(r,c)])

    return utils.get_all_grid_solutions(grid)

def decode(solutions):
    return utils.decode(solutions)
